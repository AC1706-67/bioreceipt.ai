/**
 * Personalization Service
 * Handles AI-powered content personalization using KIRO AI
 */

import { HealthTip, UserProfile, UserEngagement, PersonalizedTip, HealthCategory, SkillLevel } from '../../types';
import { CacheService } from '../cache/cacheService';
import { calculateEngagementScore, getFavoriteCategory } from '../../utils/dataTransform';
import { loggingService } from '../logging/loggingService';
import { tokenManager } from '../../utils/tokenManager';

export interface PersonalizationContext {
  userProfile: UserProfile;
  engagementHistory: UserEngagement[];
  currentStreak: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: number; // 0-6, Sunday = 0
}

export interface PersonalizationWeights {
  profileMatch: number;
  engagementHistory: number;
  categoryPreference: number;
  difficultyPreference: number;
  recency: number;
  diversity: number;
}

export interface PersonalizationInsights {
  favoriteCategories: HealthCategory[];
  preferredDifficulty: string;
  engagementPatterns: {
    bestTimeOfDay: string;
    averageEngagement: number;
    streakMotivation: number;
  };
  recommendations: {
    nextCategories: HealthCategory[];
    suggestedDifficulty: string;
    motivationalMessage: string;
  };
}

export interface PersonalizedTipsResponse {
  tips: HealthTip[];
  personalizationScore: number;
  reasoning: string;
  fallbackUsed: boolean;
}

export interface PersonalizationFeedback {
  userId: string;
  tipId: string;
  feedback: 'positive' | 'negative';
  reasoning?: string;
  timestamp: Date;
}

export interface UserPersonalizationProfile {
  userId: string;
  preferences: {
    categories: HealthCategory[];
    difficulty: string;
    timeOfDay: string[];
    goals: string[];
  };
  insights: PersonalizationInsights;
  lastUpdated: Date;
}

/**
 * Personalization Service Class
 */
export class PersonalizationService {
  private static instance: PersonalizationService;
  private cacheService: CacheService;
  private kiroApiUrl: string;

  // Default personalization weights
  private readonly defaultWeights: PersonalizationWeights = {
    profileMatch: 0.3,
    engagementHistory: 0.25,
    categoryPreference: 0.2,
    difficultyPreference: 0.1,
    recency: 0.1,
    diversity: 0.05,
  };

  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.kiroApiUrl = process.env.KIRO_AI_API_URL || 'https://api.kiro.ai/v1';
  }

  public static getInstance(): PersonalizationService {
    if (!PersonalizationService.instance) {
      PersonalizationService.instance = new PersonalizationService();
    }
    return PersonalizationService.instance;
  }

  /**
   * Get personalized tips using enhanced KIRO AI integration
   */
  public async getPersonalizedTips(
    userId: string,
    count: number = 3,
    forceRefresh: boolean = false,
    options: {
      category?: string;
      mood?: string;
      urgency?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<PersonalizedTipsResponse> {
    try {
      // Get user profile and engagement data
      const { profileService } = await import('../profile/profileService');
      const userProfile = await profileService.getUserProfile(userId);
      
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get engagement data (mock for now - would come from analytics service)
      const engagementData = await this.getEngagementData(userId);
      const recentActivity = await this.getRecentActivity(userId);

      // Use enhanced AI service
      const { kiroAIService } = await import('../ai/kiroAIService');
      const aiResponse = await kiroAIService.generatePersonalizedTips(
        userId,
        userProfile,
        engagementData,
        recentActivity,
        {
          count,
          category: options.category,
          mood: options.mood,
          urgency: options.urgency,
          forceRefresh,
        }
      );

      // Transform to expected format
      const result: PersonalizedTipsResponse = {
        tips: aiResponse.tips,
        personalizationScore: aiResponse.personalizationScore,
        reasoning: aiResponse.reasoning,
        fallbackUsed: aiResponse.metrics.fallbackUsed,
      };

      await loggingService.logInfo('Generated enhanced personalized tips', {
        userId,
        count,
        personalizationScore: result.personalizationScore,
        confidence: aiResponse.confidence,
        fallbackUsed: result.fallbackUsed,
        responseTime: aiResponse.metrics.responseTime,
        model: aiResponse.metrics.model,
      });

      return result;
    } catch (error) {
      await loggingService.logError('Failed to get personalized tips', error as Error, { 
        userId, 
        count, 
        options 
      });
      
      // Fallback to original implementation
      return await this.getOriginalPersonalizedTips(userId, count, forceRefresh);
    }
  }

  /**
   * Original personalized tips method as fallback
   */
  private async getOriginalPersonalizedTips(
    userId: string,
    count: number = 3,
    forceRefresh: boolean = false
  ): Promise<PersonalizedTipsResponse> {
    try {
      // Check cache first (unless force refresh)
      const cacheKey = `personalized-tips-fallback-${userId}-${count}`;
      if (!forceRefresh) {
        const cachedResult = await this.cacheService.get<PersonalizedTipsResponse>(cacheKey);
        if (cachedResult) {
          await loggingService.logInfo('Returned cached fallback personalized tips', { userId, count });
          return cachedResult;
        }
      }

      // Get user context
      const context = await this.buildUserContext(userId);
      
      // Use fallback personalization
      const result = await this.getFallbackPersonalizedTips(context, count);
      result.fallbackUsed = true;

      // Cache the result for 30 minutes
      await this.cacheService.set(cacheKey, result, 1800);

      await loggingService.logInfo('Generated fallback personalized tips', {
        userId,
        count,
        personalizationScore: result.personalizationScore,
        fallbackUsed: result.fallbackUsed,
      });

      return result;
    } catch (error) {
      await loggingService.logError('Failed to get fallback personalized tips', error as Error, { userId, count });
      throw error;
    }
  }

  /**
   * Build comprehensive user context for personalization
   */
  private async buildUserContext(userId: string): Promise<PersonalizationContext & {
    userId: string;
    recentEngagements: UserEngagement[];
    favoriteCategories: HealthCategory[];
    completionRate: number;
    lastMood?: string;
    preferredTopics: string[];
    engagementScore: number;
  }> {
    // This would integrate with other services to get comprehensive user data
    // For now, we'll create a mock context
    const mockContext = {
      userId,
      userProfile: {
        id: userId,
        name: 'User',
        email: 'user@example.com',
        age: 30,
        gender: 'other',
        healthInterests: [
          { category: 'nutrition' as HealthCategory, level: 'intermediate' as SkillLevel },
          { category: 'fitness' as HealthCategory, level: 'beginner' as SkillLevel },
        ],
        goals: ['weight_loss', 'energy'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      engagementHistory: [],
      currentStreak: 5,
      timeOfDay: this.getCurrentTimeOfDay(),
      dayOfWeek: new Date().getDay(),
      recentEngagements: [],
      favoriteCategories: ['nutrition', 'fitness'] as HealthCategory[],
      completionRate: 0.75,
      lastMood: 'motivated',
      preferredTopics: ['healthy eating', 'quick workouts', 'energy boosting'],
      engagementScore: 0.8,
    };

    return mockContext;
  }

  /**
   * Get personalized tips from KIRO AI
   */
  private async getKiroPersonalizedTips(
    context: any,
    count: number
  ): Promise<PersonalizedTipsResponse> {
    const prompt = this.buildKiroPrompt(context, count);
    
    try {
      const response = await this.callKiroAI(prompt, context.userId);
      return this.parseKiroResponse(response, count);
    } catch (error) {
      await loggingService.logError('KIRO AI call failed', error as Error, { 
        userId: context.userId 
      });
      throw error;
    }
  }

  /**
   * Build KIRO AI prompt with user signals
   */
  private buildKiroPrompt(context: any, count: number): string {
    return `You are KIRO, an AI health and wellness assistant. Generate ${count} personalized health tips for this user.

USER PROFILE:
- Age: ${context.userProfile.age}
- Health Interests: ${context.userProfile.healthInterests.map((i: any) => `${i.category} (${i.level})`).join(', ')}
- Goals: ${context.userProfile.goals.join(', ')}
- Current Streak: ${context.currentStreak} days
- Time of Day: ${context.timeOfDay}
- Day of Week: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][context.dayOfWeek]}

USER SIGNALS:
- Last Mood: ${context.lastMood || 'neutral'}
- Preferred Topics: ${context.preferredTopics.join(', ')}
- Engagement Score: ${context.engagementScore}/1.0 (higher = more engaged)
- Completion Rate: ${Math.round(context.completionRate * 100)}%
- Favorite Categories: ${context.favoriteCategories.join(', ')}

RECENT ACTIVITY:
- Recent Engagements: ${context.recentEngagements.length} interactions in last 7 days
- Most Active Time: ${context.timeOfDay}

PERSONALIZATION REQUIREMENTS:
1. Match user's skill level and interests
2. Consider current time of day and context
3. Build on their ${context.currentStreak}-day streak
4. Adapt to their ${context.lastMood} mood
5. Focus on their completion rate of ${Math.round(context.completionRate * 100)}%

RESPONSE FORMAT:
Return a JSON object with:
{
  "tips": [
    {
      "title": "Tip title (max 60 chars)",
      "content": "Detailed tip content (100-200 words)",
      "category": "nutrition|mental_wellness|fitness|sleep|recovery|hygiene",
      "difficulty": "easy|medium|hard",
      "estimatedReadTime": number (1-10 minutes),
      "tags": ["tag1", "tag2", "tag3"],
      "personalizedReason": "Why this tip is perfect for this user"
    }
  ],
  "personalizationScore": number (0-1),
  "reasoning": "Brief explanation of personalization strategy"
}

Generate tips that are:
- Actionable and specific
- Appropriate for ${context.timeOfDay}
- Matched to user's ${context.userProfile.healthInterests.map((i: any) => i.level).join('/')} skill level
- Motivating for someone with a ${context.currentStreak}-day streak
- Relevant to their ${context.lastMood} mood state`;
  }

  /**
   * Call KIRO AI API
   */
  private async callKiroAI(prompt: string, userId: string): Promise<any> {
    const token = await tokenManager.getToken();
    
    const response = await fetch(`${this.kiroApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-User-ID': userId,
      },
      body: JSON.stringify({
        model: 'kiro-health-v1',
        messages: [
          {
            role: 'system',
            content: 'You are KIRO, a health and wellness AI assistant specializing in personalized health tips.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`KIRO AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  /**
   * Parse KIRO AI response
   */
  private parseKiroResponse(response: any, requestedCount: number): PersonalizedTipsResponse {
    const tips = response.tips.map((tip: any) => ({
      id: `kiro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...tip,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'kiro-ai',
      viewCount: 0,
      likeCount: 0,
      completionCount: 0,
      shareCount: 0,
    }));

    return {
      tips: tips.slice(0, requestedCount),
      personalizationScore: response.personalizationScore || 0.8,
      reasoning: response.reasoning || 'Personalized based on your profile and preferences',
      fallbackUsed: false,
    };
  }

  /**
   * Get fallback personalized tips when AI fails
   */
  private async getFallbackPersonalizedTips(
    context: any,
    count: number
  ): Promise<PersonalizedTipsResponse> {
    // Use the existing rule-based personalization as fallback
    const { ContentService } = await import('../content/contentService');
    const contentService = ContentService.getInstance();
    
    try {
      const allTips = await contentService.getHealthTips();
      const personalizedTips = await this.getPersonalizedTips(allTips, context, count);
      
      return {
        tips: personalizedTips.map(tip => ({
          id: tip.id,
          title: tip.title,
          content: tip.content,
          category: tip.category,
          difficulty: tip.difficulty,
          estimatedReadTime: tip.estimatedReadTime,
          tags: tip.tags,
          isActive: tip.isActive,
          createdAt: tip.createdAt,
          updatedAt: tip.updatedAt,
          createdBy: tip.createdBy,
          viewCount: tip.viewCount || 0,
          likeCount: tip.likeCount || 0,
          completionCount: tip.completionCount || 0,
          shareCount: tip.shareCount || 0,
        })),
        personalizationScore: 0.6,
        reasoning: 'Personalized using rule-based fallback system',
        fallbackUsed: true,
      };
    } catch (error) {
      await loggingService.logError('Fallback personalization failed', error as Error, {
        userId: context.userId,
      });
      
      // Ultimate fallback - return generic tips
      return {
        tips: this.getGenericTips(count),
        personalizationScore: 0.3,
        reasoning: 'Generic recommendations due to system limitations',
        fallbackUsed: true,
      };
    }
  }

  /**
   * Get generic tips as ultimate fallback
   */
  private getGenericTips(count: number): HealthTip[] {
    const genericTips = [
      {
        id: 'generic-1',
        title: 'Stay Hydrated Throughout the Day',
        content: 'Drinking adequate water is essential for maintaining good health. Aim for 8 glasses of water daily to keep your body properly hydrated and support optimal organ function.',
        category: 'nutrition' as HealthCategory,
        difficulty: 'easy' as const,
        estimatedReadTime: 2,
        tags: ['hydration', 'health', 'daily'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        viewCount: 0,
        likeCount: 0,
        completionCount: 0,
        shareCount: 0,
      },
      {
        id: 'generic-2',
        title: 'Take Deep Breaths for Stress Relief',
        content: 'Practice deep breathing exercises for 5 minutes daily. Inhale slowly for 4 counts, hold for 4 counts, then exhale for 6 counts. This simple technique can significantly reduce stress and anxiety.',
        category: 'mental_wellness' as HealthCategory,
        difficulty: 'easy' as const,
        estimatedReadTime: 3,
        tags: ['breathing', 'stress', 'mindfulness'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        viewCount: 0,
        likeCount: 0,
        completionCount: 0,
        shareCount: 0,
      },
      {
        id: 'generic-3',
        title: 'Get Moving with a Short Walk',
        content: 'Take a 10-minute walk after meals to improve digestion and boost energy. Even light physical activity can have significant benefits for your overall health and wellbeing.',
        category: 'fitness' as HealthCategory,
        difficulty: 'easy' as const,
        estimatedReadTime: 2,
        tags: ['walking', 'exercise', 'energy'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        viewCount: 0,
        likeCount: 0,
        completionCount: 0,
        shareCount: 0,
      },
    ];

    return genericTips.slice(0, count);
  }

  /**
   * Get user engagement data for AI personalization
   */
  private async getEngagementData(userId: string): Promise<any> {
    try {
      // This would integrate with analytics service to get real engagement data
      // For now, return mock data structure
      return {
        totalInteractions: 45,
        completionRate: 0.75,
        favoriteCategories: ['nutrition', 'fitness'],
        preferredDifficulty: 'medium',
        averageReadTime: 4,
        engagementScore: 0.8,
        lastActiveDate: new Date(),
        streakHistory: [3, 5, 7, 12, 8],
        currentStreak: 8,
      };
    } catch (error) {
      await loggingService.logWarning('Failed to get engagement data, using defaults', { userId, error });
      return {
        totalInteractions: 0,
        completionRate: 0.5,
        favoriteCategories: [],
        preferredDifficulty: 'easy',
        averageReadTime: 3,
        engagementScore: 0.5,
        lastActiveDate: new Date(),
        streakHistory: [],
        currentStreak: 0,
      };
    }
  }

  /**
   * Get recent user activity for AI personalization
   */
  private async getRecentActivity(userId: string): Promise<any> {
    try {
      // This would integrate with content service to get real activity data
      // For now, return mock data structure
      return {
        lastTipsViewed: ['tip_1', 'tip_2', 'tip_3'],
        recentCompletions: ['tip_1', 'tip_4'],
        recentLikes: ['tip_2', 'tip_5'],
        recentBookmarks: ['tip_3'],
        searchQueries: ['healthy breakfast', 'quick workout'],
        feedbackGiven: [
          { tipId: 'tip_1', feedback: 'positive', reason: 'Very helpful' },
          { tipId: 'tip_6', feedback: 'negative', reason: 'Too complex' },
        ],
      };
    } catch (error) {
      await loggingService.logWarning('Failed to get recent activity, using defaults', { userId, error });
      return {
        lastTipsViewed: [],
        recentCompletions: [],
        recentLikes: [],
        recentBookmarks: [],
        searchQueries: [],
        feedbackGiven: [],
      };
    }
  }

  /**
   * Record personalization feedback with enhanced AI integration
   */
  public async recordPersonalizationFeedback(feedback: PersonalizationFeedback): Promise<void> {
    try {
      // Store feedback for model improvement
      const feedbackKey = `feedback-${feedback.userId}-${feedback.tipId}-${Date.now()}`;
      await this.cacheService.set(feedbackKey, feedback, 86400 * 30); // Store for 30 days

      // Send feedback to enhanced KIRO AI service
      try {
        const { kiroAIService } = await import('../ai/kiroAIService');
        
        // Extract request ID from tip ID if it's an AI-generated tip
        const requestId = feedback.tipId.startsWith('kiro-') 
          ? feedback.tipId.split('-').slice(0, 3).join('-')
          : `manual-${Date.now()}`;

        await kiroAIService.recordFeedback(
          feedback.userId,
          requestId,
          feedback.tipId,
          feedback.feedback,
          feedback.reasoning
        );
      } catch (kiroError) {
        await loggingService.logWarning('Failed to send feedback to enhanced KIRO AI', { 
          feedback, 
          error: kiroError 
        });
        
        // Fallback to original method
        try {
          await this.sendFeedbackToKiro(feedback);
        } catch (fallbackError) {
          await loggingService.logWarning('Fallback feedback also failed', { 
            feedback, 
            error: fallbackError 
          });
        }
      }

      // Clear personalized tips cache to force refresh with new feedback
      await this.cacheService.deletePattern(`personalized-tips-${feedback.userId}-*`);

      await loggingService.logInfo('Enhanced personalization feedback recorded', {
        userId: feedback.userId,
        tipId: feedback.tipId,
        feedback: feedback.feedback,
        reasoning: feedback.reasoning,
      });
    } catch (error) {
      await loggingService.logError('Failed to record personalization feedback', error as Error, {
        feedback,
      });
      throw error;
    }
  }

  /**
   * Send feedback to KIRO AI for model improvement
   */
  private async sendFeedbackToKiro(feedback: PersonalizationFeedback): Promise<void> {
    const token = await tokenManager.getToken();
    
    await fetch(`${this.kiroApiUrl}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: feedback.userId,
        tipId: feedback.tipId,
        feedback: feedback.feedback,
        reasoning: feedback.reasoning,
        timestamp: feedback.timestamp.toISOString(),
        context: 'health-tips-personalization',
      }),
    });
  }

  /**
   * Get user personalization profile
   */
  public async getUserPersonalizationProfile(userId: string): Promise<UserPersonalizationProfile> {
    try {
      const cacheKey = `personalization-profile-${userId}`;
      const cachedProfile = await this.cacheService.get<UserPersonalizationProfile>(cacheKey);
      
      if (cachedProfile) {
        return cachedProfile;
      }

      // Build profile from user data
      const context = await this.buildUserContext(userId);
      const insights = await this.getPersonalizationInsights(
        context.userProfile,
        context.engagementHistory,
        []
      );

      const profile: UserPersonalizationProfile = {
        userId,
        preferences: {
          categories: context.favoriteCategories,
          difficulty: context.userProfile.healthInterests[0]?.level || 'beginner',
          timeOfDay: [context.timeOfDay],
          goals: context.userProfile.goals,
        },
        insights,
        lastUpdated: new Date(),
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, profile, 3600);

      return profile;
    } catch (error) {
      await loggingService.logError('Failed to get personalization profile', error as Error, {
        userId,
      });
      throw error;
    }
  }

  /**
   * Update personalization preferences
   */
  public async updatePersonalizationPreferences(
    userId: string,
    preferences: Partial<UserPersonalizationProfile['preferences']>
  ): Promise<UserPersonalizationProfile> {
    try {
      const currentProfile = await this.getUserPersonalizationProfile(userId);
      
      const updatedProfile: UserPersonalizationProfile = {
        ...currentProfile,
        preferences: {
          ...currentProfile.preferences,
          ...preferences,
        },
        lastUpdated: new Date(),
      };

      // Update cache
      const cacheKey = `personalization-profile-${userId}`;
      await this.cacheService.set(cacheKey, updatedProfile, 3600);

      // Clear personalized tips cache to force refresh
      await this.cacheService.deletePattern(`personalized-tips-${userId}-*`);

      await loggingService.logInfo('Personalization preferences updated', {
        userId,
        preferences,
      });

      return updatedProfile;
    } catch (error) {
      await loggingService.logError('Failed to update personalization preferences', error as Error, {
        userId,
        preferences,
      });
      throw error;
    }
  }

  /**
   * Get current time of day
   */
  private getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  /**
   * Get personalized tips for a user using KIRO AI
   */
  public async getPersonalizedTips(
    availableTips: HealthTip[],
    context: PersonalizationContext,
    count: number = 5
  ): Promise<PersonalizedTip[]> {
    try {
      // Calculate personalization scores for each tip
      const scoredTips = await Promise.all(
        availableTips.map(async (tip) => {
          const score = await this.calculatePersonalizationScore(tip, context);
          const reason = this.generatePersonalizationReason(tip, context, score);
          
          return {
            ...tip,
            personalizedScore: score,
            reason,
          } as PersonalizedTip;
        })
      );

      // Sort by personalization score and apply diversity filter
      const sortedTips = scoredTips.sort((a, b) => b.personalizedScore - a.personalizedScore);
      const diversifiedTips = this.applyDiversityFilter(sortedTips, count);

      return diversifiedTips.slice(0, count);
    } catch (error) {
      console.error('Error getting personalized tips:', error);
      // Fallback to basic recommendation
      return this.getFallbackRecommendations(availableTips, context, count);
    }
  }

  /**
   * Calculate personalization score for a tip
   */
  private async calculatePersonalizationScore(
    tip: HealthTip,
    context: PersonalizationContext
  ): Promise<number> {
    const weights = this.defaultWeights;
    let totalScore = 0;

    // Profile match score (health interests)
    const profileScore = this.calculateProfileMatchScore(tip, context.userProfile);
    totalScore += profileScore * weights.profileMatch;

    // Engagement history score
    const engagementScore = this.calculateEngagementHistoryScore(tip, context.engagementHistory);
    totalScore += engagementScore * weights.engagementHistory;

    // Category preference score
    const categoryScore = this.calculateCategoryPreferenceScore(tip, context.engagementHistory);
    totalScore += categoryScore * weights.categoryPreference;

    // Difficulty preference score
    const difficultyScore = this.calculateDifficultyPreferenceScore(tip, context.userProfile);
    totalScore += difficultyScore * weights.difficultyPreference;

    // Recency score (prefer newer content)
    const recencyScore = this.calculateRecencyScore(tip);
    totalScore += recencyScore * weights.recency;

    // Time-based contextual score
    const contextualScore = this.calculateContextualScore(tip, context);
    totalScore += contextualScore * 0.1;

    return Math.min(Math.max(totalScore, 0), 1); // Clamp between 0 and 1
  }

  /**
   * Calculate profile match score based on user's health interests
   */
  private calculateProfileMatchScore(tip: HealthTip, userProfile: UserProfile): number {
    const userInterests = userProfile.healthInterests;
    
    // Check if tip category matches user interests
    const matchingInterest = userInterests.find(interest => interest.category === tip.category);
    
    if (!matchingInterest) {
      return 0.1; // Low score for non-matching categories
    }

    // Score based on user's skill level in this category
    const skillLevelScore = {
      beginner: tip.difficulty === 'easy' ? 1.0 : tip.difficulty === 'medium' ? 0.7 : 0.3,
      intermediate: tip.difficulty === 'medium' ? 1.0 : tip.difficulty === 'easy' ? 0.8 : 0.6,
      advanced: tip.difficulty === 'hard' ? 1.0 : tip.difficulty === 'medium' ? 0.8 : 0.5,
    };

    return skillLevelScore[matchingInterest.level] || 0.5;
  }

  /**
   * Calculate engagement history score
   */
  private calculateEngagementHistoryScore(tip: HealthTip, engagementHistory: UserEngagement[]): number {
    // Check if user has interacted with this specific tip
    const tipEngagements = engagementHistory.filter(e => e.tipId === tip.id);
    
    if (tipEngagements.length > 0) {
      const hasCompleted = tipEngagements.some(e => e.action === 'complete');
      const hasLiked = tipEngagements.some(e => e.action === 'like');
      
      // Lower score for already completed tips, higher for liked but not completed
      if (hasCompleted) return 0.2;
      if (hasLiked) return 0.8;
      return 0.5; // Has viewed but no strong signal
    }

    // Check engagement with similar tips (same category/tags)
    const similarEngagements = engagementHistory.filter(e => {
      // This would need to be enhanced with actual tip data lookup
      return true; // Simplified for now
    });

    const avgEngagement = calculateEngagementScore(similarEngagements);
    return avgEngagement;
  }

  /**
   * Calculate category preference score based on engagement history
   */
  private calculateCategoryPreferenceScore(tip: HealthTip, engagementHistory: UserEngagement[]): number {
    if (engagementHistory.length === 0) return 0.5;

    // This would need access to all tips to determine categories of engaged content
    // For now, return a moderate score
    return 0.6;
  }

  /**
   * Calculate difficulty preference score
   */
  private calculateDifficultyPreferenceScore(tip: HealthTip, userProfile: UserProfile): number {
    const userInterests = userProfile.healthInterests;
    const matchingInterest = userInterests.find(interest => interest.category === tip.category);
    
    if (!matchingInterest) return 0.5;

    // Prefer tips that match or slightly challenge the user's skill level
    const skillLevelPreference = {
      beginner: { easy: 1.0, medium: 0.6, hard: 0.2 },
      intermediate: { easy: 0.7, medium: 1.0, hard: 0.8 },
      advanced: { easy: 0.5, medium: 0.8, hard: 1.0 },
    };

    return skillLevelPreference[matchingInterest.level][tip.difficulty] || 0.5;
  }

  /**
   * Calculate recency score (prefer newer content)
   */
  private calculateRecencyScore(tip: HealthTip): number {
    const now = new Date();
    const tipAge = now.getTime() - tip.createdAt.getTime();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    
    // Linear decay over time
    const recencyScore = Math.max(0, 1 - (tipAge / maxAge));
    return recencyScore;
  }

  /**
   * Calculate contextual score based on time of day, day of week, etc.
   */
  private calculateContextualScore(tip: HealthTip, context: PersonalizationContext): number {
    let score = 0.5; // Base score

    // Time of day preferences
    const timePreferences = {
      morning: ['nutrition', 'fitness', 'mental_wellness'],
      afternoon: ['fitness', 'mental_wellness', 'recovery'],
      evening: ['sleep', 'mental_wellness', 'recovery', 'hygiene'],
    };

    if (timePreferences[context.timeOfDay].includes(tip.category)) {
      score += 0.3;
    }

    // Weekend vs weekday preferences
    const isWeekend = context.dayOfWeek === 0 || context.dayOfWeek === 6;
    if (isWeekend && ['recovery', 'sleep', 'mental_wellness'].includes(tip.category)) {
      score += 0.2;
    }

    // Streak-based motivation
    if (context.currentStreak > 7 && tip.difficulty === 'medium') {
      score += 0.2; // Encourage progression for consistent users
    }

    return Math.min(score, 1.0);
  }

  /**
   * Apply diversity filter to avoid too many similar tips
   */
  private applyDiversityFilter(tips: PersonalizedTip[], count: number): PersonalizedTip[] {
    const diversifiedTips: PersonalizedTip[] = [];
    const categoryCount: Record<HealthCategory, number> = {
      nutrition: 0,
      mental_wellness: 0,
      fitness: 0,
      sleep: 0,
      recovery: 0,
      hygiene: 0,
    };

    const maxPerCategory = Math.ceil(count / 3); // Allow max 1/3 of tips from same category

    for (const tip of tips) {
      if (diversifiedTips.length >= count) break;
      
      if (categoryCount[tip.category] < maxPerCategory) {
        diversifiedTips.push(tip);
        categoryCount[tip.category]++;
      }
    }

    // Fill remaining slots if needed
    if (diversifiedTips.length < count) {
      for (const tip of tips) {
        if (diversifiedTips.length >= count) break;
        if (!diversifiedTips.find(t => t.id === tip.id)) {
          diversifiedTips.push(tip);
        }
      }
    }

    return diversifiedTips;
  }

  /**
   * Generate explanation for why a tip was recommended
   */
  private generatePersonalizationReason(
    tip: HealthTip,
    context: PersonalizationContext,
    score: number
  ): string {
    const reasons: string[] = [];

    // Check profile match
    const matchingInterest = context.userProfile.healthInterests.find(
      interest => interest.category === tip.category
    );
    
    if (matchingInterest) {
      reasons.push(`matches your ${tip.category.replace('_', ' ')} interests`);
    }

    // Check difficulty appropriateness
    if (matchingInterest) {
      const isAppropriate = 
        (matchingInterest.level === 'beginner' && tip.difficulty === 'easy') ||
        (matchingInterest.level === 'intermediate' && ['easy', 'medium'].includes(tip.difficulty)) ||
        (matchingInterest.level === 'advanced');
      
      if (isAppropriate) {
        reasons.push(`suitable for your ${matchingInterest.level} level`);
      }
    }

    // Check time context
    const timePreferences = {
      morning: ['nutrition', 'fitness', 'mental_wellness'],
      afternoon: ['fitness', 'mental_wellness', 'recovery'],
      evening: ['sleep', 'mental_wellness', 'recovery', 'hygiene'],
    };

    if (timePreferences[context.timeOfDay].includes(tip.category)) {
      reasons.push(`perfect for ${context.timeOfDay} time`);
    }

    // Check streak motivation
    if (context.currentStreak > 7) {
      reasons.push(`builds on your ${context.currentStreak}-day streak`);
    }

    if (reasons.length === 0) {
      return 'recommended for you';
    }

    return reasons.slice(0, 2).join(' and ');
  }

  /**
   * Get fallback recommendations when personalization fails
   */
  private getFallbackRecommendations(
    availableTips: HealthTip[],
    context: PersonalizationContext,
    count: number
  ): PersonalizedTip[] {
    // Simple fallback: prefer user's health interests and easy difficulty
    const userCategories = context.userProfile.healthInterests.map(i => i.category);
    
    const fallbackTips = availableTips
      .filter(tip => userCategories.includes(tip.category) || tip.difficulty === 'easy')
      .slice(0, count)
      .map(tip => ({
        ...tip,
        personalizedScore: 0.5,
        reason: 'recommended based on your interests',
      }));

    return fallbackTips;
  }

  /**
   * Get personalization insights for a user
   */
  public async getPersonalizationInsights(
    userProfile: UserProfile,
    engagementHistory: UserEngagement[],
    availableTips: HealthTip[]
  ): Promise<PersonalizationInsights> {
    try {
      // Analyze favorite categories
      const favoriteCategories = this.analyzeFavoriteCategories(engagementHistory, availableTips);
      
      // Determine preferred difficulty
      const preferredDifficulty = this.analyzePreferredDifficulty(userProfile, engagementHistory);
      
      // Analyze engagement patterns
      const engagementPatterns = this.analyzeEngagementPatterns(engagementHistory);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        userProfile,
        engagementHistory,
        favoriteCategories
      );

      return {
        favoriteCategories,
        preferredDifficulty,
        engagementPatterns,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting personalization insights:', error);
      
      // Return basic insights based on profile
      return {
        favoriteCategories: userProfile.healthInterests.map(i => i.category),
        preferredDifficulty: 'easy',
        engagementPatterns: {
          bestTimeOfDay: 'morning',
          averageEngagement: 0.5,
          streakMotivation: 0.7,
        },
        recommendations: {
          nextCategories: userProfile.healthInterests.slice(0, 2).map(i => i.category),
          suggestedDifficulty: 'easy',
          motivationalMessage: 'Keep up the great work on your wellness journey!',
        },
      };
    }
  }

  /**
   * Analyze user's favorite categories based on engagement
   */
  private analyzeFavoriteCategories(
    engagementHistory: UserEngagement[],
    availableTips: HealthTip[]
  ): HealthCategory[] {
    // This would need to cross-reference engagement with tip categories
    // For now, return a basic analysis
    const categoryEngagement: Record<HealthCategory, number> = {
      nutrition: 0,
      mental_wellness: 0,
      fitness: 0,
      sleep: 0,
      recovery: 0,
      hygiene: 0,
    };

    // Count engagements per category (simplified)
    engagementHistory.forEach(engagement => {
      const tip = availableTips.find(t => t.id === engagement.tipId);
      if (tip) {
        categoryEngagement[tip.category]++;
      }
    });

    // Return top 3 categories
    return Object.entries(categoryEngagement)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category as HealthCategory);
  }

  /**
   * Analyze preferred difficulty level
   */
  private analyzePreferredDifficulty(
    userProfile: UserProfile,
    engagementHistory: UserEngagement[]
  ): string {
    // Simple analysis based on profile
    const skillLevels = userProfile.healthInterests.map(i => i.level);
    const hasAdvanced = skillLevels.includes('advanced');
    const hasIntermediate = skillLevels.includes('intermediate');
    
    if (hasAdvanced) return 'medium to hard';
    if (hasIntermediate) return 'easy to medium';
    return 'easy';
  }

  /**
   * Analyze engagement patterns
   */
  private analyzeEngagementPatterns(engagementHistory: UserEngagement[]): {
    bestTimeOfDay: string;
    averageEngagement: number;
    streakMotivation: number;
  } {
    const avgEngagement = calculateEngagementScore(engagementHistory);
    
    return {
      bestTimeOfDay: 'morning', // Would analyze timestamps in real implementation
      averageEngagement: avgEngagement,
      streakMotivation: avgEngagement > 0.7 ? 0.9 : 0.6,
    };
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    userProfile: UserProfile,
    engagementHistory: UserEngagement[],
    favoriteCategories: HealthCategory[]
  ): {
    nextCategories: HealthCategory[];
    suggestedDifficulty: string;
    motivationalMessage: string;
  } {
    const userCategories = userProfile.healthInterests.map(i => i.category);
    const unexploredCategories = (['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'] as HealthCategory[])
      .filter(cat => !userCategories.includes(cat));

    const motivationalMessages = [
      'You\'re building great healthy habits!',
      'Keep up the excellent progress!',
      'Your consistency is inspiring!',
      'Small steps lead to big changes!',
      'You\'re on the right path to wellness!',
    ];

    return {
      nextCategories: unexploredCategories.slice(0, 2),
      suggestedDifficulty: this.analyzePreferredDifficulty(userProfile, engagementHistory),
      motivationalMessage: motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)],
    };
  }

  /**
   * Update personalization model based on user feedback
   */
  public async updatePersonalizationModel(
    userId: string,
    tipId: string,
    feedback: 'helpful' | 'not_helpful' | 'irrelevant'
  ): Promise<void> {
    try {
      // In a real implementation, this would update the AI model
      // For now, we'll just log the feedback
      console.log(`Personalization feedback for user ${userId}, tip ${tipId}: ${feedback}`);
      
      // Store feedback for future model training
      // This could be sent to KIRO AI service for model improvement
    } catch (error) {
      console.error('Error updating personalization model:', error);
    }
  }
}