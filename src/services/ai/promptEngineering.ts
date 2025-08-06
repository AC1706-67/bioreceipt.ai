/**
 * AI Prompt Engineering Service
 * Advanced prompt templates and context building for KIRO AI personalization
 */

import { UserProfile, HealthCategory, TipDifficulty } from '../../types/userProfile';
import { HealthTip } from '../../models/HealthTip';
import { loggingService } from '../logging/loggingService';

export interface UserContext {
  profile: UserProfile;
  engagementHistory: EngagementSummary;
  currentStreak: number;
  timeContext: TimeContext;
  recentActivity: RecentActivity;
  personalityInsights: PersonalityInsights;
  contentPreferences: ContentPreferences;
}

export interface EngagementSummary {
  totalInteractions: number;
  completionRate: number;
  favoriteCategories: HealthCategory[];
  preferredDifficulty: TipDifficulty;
  averageReadTime: number;
  engagementScore: number;
  lastActiveDate: Date;
  streakHistory: number[];
}

export interface TimeContext {
  currentTime: Date;
  timeOfDay: 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  isWeekend: boolean;
  timezone: string;
  seasonalContext: 'spring' | 'summer' | 'fall' | 'winter';
}

export interface RecentActivity {
  lastTipsViewed: string[];
  recentCompletions: string[];
  recentLikes: string[];
  recentBookmarks: string[];
  searchQueries: string[];
  feedbackGiven: Array<{ tipId: string; feedback: 'positive' | 'negative'; reason?: string }>;
}

export interface PersonalityInsights {
  motivationStyle: 'achievement' | 'social' | 'knowledge' | 'routine';
  communicationPreference: 'direct' | 'encouraging' | 'scientific' | 'casual';
  challengeLevel: 'comfort_zone' | 'moderate_challenge' | 'high_challenge';
  learningStyle: 'visual' | 'practical' | 'theoretical' | 'social';
  consistencyPattern: 'steady' | 'burst' | 'weekend_warrior' | 'inconsistent';
}

export interface ContentPreferences {
  preferredLength: 'quick' | 'moderate' | 'detailed';
  topicDepth: 'surface' | 'moderate' | 'deep';
  actionOrientation: 'immediate' | 'planning' | 'educational';
  evidencePreference: 'anecdotal' | 'scientific' | 'mixed';
  tonePreference: 'motivational' | 'informational' | 'conversational' | 'professional';
}

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
  constraints: string[];
  outputFormat: object;
  examples: Array<{ input: string; output: string }>;
}

export interface AIPersonalizationRequest {
  userId: string;
  requestType: 'daily_tips' | 'category_specific' | 'goal_oriented' | 'mood_based';
  count: number;
  specificCategory?: HealthCategory;
  userMood?: string;
  urgency?: 'low' | 'medium' | 'high';
  context: UserContext;
}

export interface AIPersonalizationResponse {
  tips: Array<{
    title: string;
    content: string;
    category: HealthCategory;
    difficulty: TipDifficulty;
    estimatedReadTime: number;
    tags: string[];
    personalizedReason: string;
    confidenceScore: number;
    actionItems: string[];
    motivationalHook: string;
  }>;
  personalizationScore: number;
  reasoning: string;
  adaptationStrategy: string;
  followUpSuggestions: string[];
}

class PromptEngineeringService {
  private static instance: PromptEngineeringService;

  private constructor() {}

  public static getInstance(): PromptEngineeringService {
    if (!PromptEngineeringService.instance) {
      PromptEngineeringService.instance = new PromptEngineeringService();
    }
    return PromptEngineeringService.instance;
  }

  /**
   * Build comprehensive user context for AI personalization
   */
  async buildUserContext(
    userId: string,
    profile: UserProfile,
    engagementData: any,
    recentActivity: any
  ): Promise<UserContext> {
    try {
      const timeContext = this.buildTimeContext();
      const engagementSummary = this.buildEngagementSummary(engagementData);
      const personalityInsights = this.inferPersonalityInsights(profile, engagementSummary);
      const contentPreferences = this.inferContentPreferences(profile, engagementSummary, recentActivity);

      return {
        profile,
        engagementHistory: engagementSummary,
        currentStreak: engagementData.currentStreak || 0,
        timeContext,
        recentActivity: this.buildRecentActivity(recentActivity),
        personalityInsights,
        contentPreferences,
      };
    } catch (error) {
      await loggingService.logError('Failed to build user context', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Generate advanced personalized prompt for KIRO AI
   */
  generatePersonalizationPrompt(request: AIPersonalizationRequest): PromptTemplate {
    const { context, requestType, count, specificCategory, userMood } = request;

    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(request);
    const constraints = this.buildConstraints(context, requestType);
    const outputFormat = this.buildOutputFormat();
    const examples = this.buildExamples(context);

    return {
      systemPrompt,
      userPrompt,
      constraints,
      outputFormat,
      examples,
    };
  }

  /**
   * Build comprehensive system prompt
   */
  private buildSystemPrompt(context: UserContext): string {
    const { profile, personalityInsights, contentPreferences } = context;

    return `You are KIRO, an advanced AI health and wellness coach specializing in hyper-personalized health recommendations. You have deep expertise in behavioral psychology, health science, and personalized coaching.

CORE IDENTITY:
- You are empathetic, knowledgeable, and adaptive
- You understand that health is deeply personal and contextual
- You provide evidence-based recommendations tailored to individual needs
- You motivate through understanding, not judgment
- You adapt your communication style to each user's preferences

USER PERSONALITY PROFILE:
- Motivation Style: ${personalityInsights.motivationStyle}
- Communication Preference: ${personalityInsights.communicationPreference}
- Challenge Level: ${personalityInsights.challengeLevel}
- Learning Style: ${personalityInsights.learningStyle}
- Consistency Pattern: ${personalityInsights.consistencyPattern}

CONTENT PREFERENCES:
- Preferred Length: ${contentPreferences.preferredLength}
- Topic Depth: ${contentPreferences.topicDepth}
- Action Orientation: ${contentPreferences.actionOrientation}
- Evidence Preference: ${contentPreferences.evidencePreference}
- Tone Preference: ${contentPreferences.tonePreference}

PERSONALIZATION PRINCIPLES:
1. Match content to user's current skill level and interests
2. Consider their time context and daily rhythm
3. Build on their existing habits and streak momentum
4. Adapt to their personality and communication style
5. Provide actionable, specific, and relevant advice
6. Include motivational elements that resonate with their style
7. Respect their preferences for content depth and evidence
8. Consider their recent activity and feedback patterns

HEALTH EXPERTISE AREAS:
- Nutrition science and practical meal planning
- Exercise physiology and movement patterns
- Sleep science and circadian rhythm optimization
- Stress management and mental wellness techniques
- Habit formation and behavior change psychology
- Preventive health and wellness maintenance`;
  }

  /**
   * Build detailed user prompt with rich context
   */
  private buildUserPrompt(request: AIPersonalizationRequest): string {
    const { context, requestType, count, specificCategory, userMood } = request;
    const { profile, engagementHistory, currentStreak, timeContext, recentActivity } = context;

    let prompt = `Generate ${count} highly personalized health tips for this user based on their comprehensive profile and current context.

USER PROFILE ANALYSIS:
Name: ${profile.name || 'User'}
Age: ${profile.age || 'Not specified'}
Health Interests: ${profile.healthInterests.map(hi => `${hi.category} (${hi.level} level)`).join(', ')}
Primary Goals: ${profile.goals.join(', ')}
Current Streak: ${currentStreak} days
Timezone: ${profile.timezone}

ENGAGEMENT INSIGHTS:
- Total Interactions: ${engagementHistory.totalInteractions}
- Completion Rate: ${Math.round(engagementHistory.completionRate * 100)}%
- Favorite Categories: ${engagementHistory.favoriteCategories.join(', ')}
- Preferred Difficulty: ${engagementHistory.preferredDifficulty}
- Engagement Score: ${engagementHistory.engagementScore}/1.0
- Average Read Time: ${engagementHistory.averageReadTime} minutes

CURRENT CONTEXT:
- Time: ${timeContext.currentTime.toLocaleString()}
- Time of Day: ${timeContext.timeOfDay}
- Day: ${timeContext.dayOfWeek} (${timeContext.isWeekend ? 'Weekend' : 'Weekday'})
- Season: ${timeContext.seasonalContext}
- Timezone: ${timeContext.timezone}`;

    if (userMood) {
      prompt += `\n- Current Mood: ${userMood}`;
    }

    prompt += `\n\nRECENT ACTIVITY PATTERNS:
- Recently Viewed: ${recentActivity.lastTipsViewed.length} tips
- Recent Completions: ${recentActivity.recentCompletions.length} tips
- Recent Likes: ${recentActivity.recentLikes.length} tips
- Recent Bookmarks: ${recentActivity.recentBookmarks.length} tips`;

    if (recentActivity.feedbackGiven.length > 0) {
      prompt += `\n- Recent Feedback: ${recentActivity.feedbackGiven.length} feedback items`;
    }

    if (specificCategory) {
      prompt += `\n\nSPECIFIC REQUEST: Focus on ${specificCategory} category tips`;
    }

    prompt += `\n\nPERSONALIZATION REQUIREMENTS:
1. Match their ${engagementHistory.preferredDifficulty} difficulty preference
2. Align with their ${context.personalityInsights.motivationStyle} motivation style
3. Use ${context.personalityInsights.communicationPreference} communication approach
4. Consider their ${context.personalityInsights.challengeLevel} challenge preference
5. Adapt to their ${context.personalityInsights.learningStyle} learning style
6. Build on their ${currentStreak}-day streak momentum
7. Optimize for ${timeContext.timeOfDay} timing
8. Respect their ${context.contentPreferences.preferredLength} content length preference

BEHAVIORAL INSIGHTS:
- Consistency Pattern: ${context.personalityInsights.consistencyPattern}
- Action Orientation: ${context.contentPreferences.actionOrientation}
- Evidence Preference: ${context.contentPreferences.evidencePreference}

Generate tips that are:
- Immediately actionable and specific
- Perfectly timed for ${timeContext.timeOfDay} on ${timeContext.dayOfWeek}
- Matched to their skill level and interests
- Motivating for someone with a ${currentStreak}-day streak
- Aligned with their personality and communication preferences
- Building on their recent positive engagements
- Addressing their primary goals: ${profile.goals.join(', ')}`;

    return prompt;
  }

  /**
   * Build constraints for AI generation
   */
  private buildConstraints(context: UserContext, requestType: string): string[] {
    const constraints = [
      'Each tip must be actionable within the next 24 hours',
      'Content must be appropriate for the user\'s skill level',
      'Tips should build progressively on each other when possible',
      'Include specific, measurable actions where applicable',
      'Avoid repeating recently viewed content',
      'Maintain consistency with user\'s established preferences',
      'Ensure cultural sensitivity and inclusivity',
      'Provide evidence-based recommendations when requested',
    ];

    // Add time-specific constraints
    if (context.timeContext.timeOfDay === 'morning') {
      constraints.push('Focus on energizing and preparation activities');
    } else if (context.timeContext.timeOfDay === 'evening') {
      constraints.push('Emphasize relaxation and recovery activities');
    }

    // Add streak-specific constraints
    if (context.currentStreak > 14) {
      constraints.push('Provide advanced or challenging recommendations to maintain engagement');
    } else if (context.currentStreak < 3) {
      constraints.push('Focus on simple, achievable actions to build confidence');
    }

    // Add personality-specific constraints
    if (context.personalityInsights.communicationPreference === 'scientific') {
      constraints.push('Include relevant research or scientific backing');
    } else if (context.personalityInsights.communicationPreference === 'casual') {
      constraints.push('Use conversational, friendly language');
    }

    return constraints;
  }

  /**
   * Build structured output format
   */
  private buildOutputFormat(): object {
    return {
      tips: [
        {
          title: 'string (max 60 characters, engaging and specific)',
          content: 'string (150-300 words, detailed and actionable)',
          category: 'nutrition|mental_wellness|fitness|sleep|recovery|hygiene',
          difficulty: 'easy|medium|hard',
          estimatedReadTime: 'number (2-8 minutes)',
          tags: ['array of 3-5 relevant tags'],
          personalizedReason: 'string (why this tip is perfect for this user)',
          confidenceScore: 'number (0-1, how confident you are in this recommendation)',
          actionItems: ['array of 2-4 specific action steps'],
          motivationalHook: 'string (personalized motivational message)',
        },
      ],
      personalizationScore: 'number (0-1, overall personalization quality)',
      reasoning: 'string (brief explanation of personalization strategy)',
      adaptationStrategy: 'string (how you adapted to user preferences)',
      followUpSuggestions: ['array of 2-3 suggestions for future tips'],
    };
  }

  /**
   * Build examples for few-shot learning
   */
  private buildExamples(context: UserContext): Array<{ input: string; output: string }> {
    // These would be dynamically generated based on user context
    // For now, providing a template structure
    return [
      {
        input: 'User with nutrition interest, beginner level, morning time, 5-day streak',
        output: JSON.stringify({
          tips: [
            {
              title: 'Start Your Day with Protein-Rich Breakfast',
              content: 'Begin your morning with a protein-rich breakfast to stabilize blood sugar and maintain energy throughout the day. Aim for 20-25 grams of protein from sources like Greek yogurt with berries, eggs with whole grain toast, or a protein smoothie. This simple change can improve focus, reduce mid-morning cravings, and support your health goals.',
              category: 'nutrition',
              difficulty: 'easy',
              estimatedReadTime: 3,
              tags: ['breakfast', 'protein', 'energy', 'beginner'],
              personalizedReason: 'Perfect for your beginner nutrition level and morning routine',
              confidenceScore: 0.9,
              actionItems: [
                'Choose one protein source for tomorrow\'s breakfast',
                'Prepare ingredients tonight for easy morning prep',
                'Set a reminder to eat within 1 hour of waking',
              ],
              motivationalHook: 'You\'re building amazing momentum with your 5-day streak!',
            },
          ],
          personalizationScore: 0.85,
          reasoning: 'Matched to beginner nutrition level, morning timing, and streak motivation',
          adaptationStrategy: 'Used encouraging tone for achievement-motivated user',
          followUpSuggestions: ['Hydration tips', 'Meal prep strategies', 'Energy-boosting snacks'],
        }),
      },
    ];
  }

  /**
   * Build time context
   */
  private buildTimeContext(): TimeContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const month = now.getMonth();

    let timeOfDay: TimeContext['timeOfDay'];
    if (hour < 6) timeOfDay = 'night';
    else if (hour < 9) timeOfDay = 'early_morning';
    else if (hour < 12) timeOfDay = 'morning';
    else if (hour < 14) timeOfDay = 'midday';
    else if (hour < 18) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    let seasonalContext: TimeContext['seasonalContext'];
    if (month >= 2 && month <= 4) seasonalContext = 'spring';
    else if (month >= 5 && month <= 7) seasonalContext = 'summer';
    else if (month >= 8 && month <= 10) seasonalContext = 'fall';
    else seasonalContext = 'winter';

    return {
      currentTime: now,
      timeOfDay,
      dayOfWeek,
      isWeekend,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      seasonalContext,
    };
  }

  /**
   * Build engagement summary from raw data
   */
  private buildEngagementSummary(engagementData: any): EngagementSummary {
    return {
      totalInteractions: engagementData.totalInteractions || 0,
      completionRate: engagementData.completionRate || 0,
      favoriteCategories: engagementData.favoriteCategories || [],
      preferredDifficulty: engagementData.preferredDifficulty || 'easy',
      averageReadTime: engagementData.averageReadTime || 3,
      engagementScore: engagementData.engagementScore || 0.5,
      lastActiveDate: new Date(engagementData.lastActiveDate || Date.now()),
      streakHistory: engagementData.streakHistory || [],
    };
  }

  /**
   * Build recent activity summary
   */
  private buildRecentActivity(recentActivity: any): RecentActivity {
    return {
      lastTipsViewed: recentActivity.lastTipsViewed || [],
      recentCompletions: recentActivity.recentCompletions || [],
      recentLikes: recentActivity.recentLikes || [],
      recentBookmarks: recentActivity.recentBookmarks || [],
      searchQueries: recentActivity.searchQueries || [],
      feedbackGiven: recentActivity.feedbackGiven || [],
    };
  }

  /**
   * Infer personality insights from user data
   */
  private inferPersonalityInsights(
    profile: UserProfile,
    engagement: EngagementSummary
  ): PersonalityInsights {
    // Advanced personality inference based on behavior patterns
    let motivationStyle: PersonalityInsights['motivationStyle'] = 'routine';
    let communicationPreference: PersonalityInsights['communicationPreference'] = 'encouraging';
    let challengeLevel: PersonalityInsights['challengeLevel'] = 'moderate_challenge';
    let learningStyle: PersonalityInsights['learningStyle'] = 'practical';
    let consistencyPattern: PersonalityInsights['consistencyPattern'] = 'steady';

    // Infer motivation style from goals and engagement patterns
    if (profile.goals.includes('weight_loss') || profile.goals.includes('muscle_building')) {
      motivationStyle = 'achievement';
    } else if (engagement.engagementScore > 0.8) {
      motivationStyle = 'knowledge';
    }

    // Infer communication preference from engagement patterns
    if (engagement.averageReadTime > 5) {
      communicationPreference = 'scientific';
    } else if (engagement.completionRate > 0.8) {
      communicationPreference = 'direct';
    }

    // Infer challenge level from difficulty preferences and completion rate
    if (engagement.preferredDifficulty === 'hard' && engagement.completionRate > 0.7) {
      challengeLevel = 'high_challenge';
    } else if (engagement.preferredDifficulty === 'easy') {
      challengeLevel = 'comfort_zone';
    }

    // Infer consistency pattern from streak history
    if (engagement.streakHistory.length > 0) {
      const avgStreak = engagement.streakHistory.reduce((a, b) => a + b, 0) / engagement.streakHistory.length;
      if (avgStreak > 14) {
        consistencyPattern = 'steady';
      } else if (avgStreak > 7) {
        consistencyPattern = 'burst';
      }
    }

    return {
      motivationStyle,
      communicationPreference,
      challengeLevel,
      learningStyle,
      consistencyPattern,
    };
  }

  /**
   * Infer content preferences from user behavior
   */
  private inferContentPreferences(
    profile: UserProfile,
    engagement: EngagementSummary,
    recentActivity: any
  ): ContentPreferences {
    let preferredLength: ContentPreferences['preferredLength'] = 'moderate';
    let topicDepth: ContentPreferences['topicDepth'] = 'moderate';
    let actionOrientation: ContentPreferences['actionOrientation'] = 'immediate';
    let evidencePreference: ContentPreferences['evidencePreference'] = 'mixed';
    let tonePreference: ContentPreferences['tonePreference'] = 'motivational';

    // Infer from average read time
    if (engagement.averageReadTime < 3) {
      preferredLength = 'quick';
      topicDepth = 'surface';
    } else if (engagement.averageReadTime > 6) {
      preferredLength = 'detailed';
      topicDepth = 'deep';
    }

    // Infer from completion patterns
    if (engagement.completionRate > 0.8) {
      actionOrientation = 'immediate';
    } else if (engagement.completionRate < 0.5) {
      actionOrientation = 'educational';
    }

    // Infer from health interests level
    const hasAdvancedInterests = profile.healthInterests.some(hi => hi.level === 'advanced');
    if (hasAdvancedInterests) {
      evidencePreference = 'scientific';
      tonePreference = 'professional';
    }

    return {
      preferredLength,
      topicDepth,
      actionOrientation,
      evidencePreference,
      tonePreference,
    };
  }

  /**
   * Validate and score prompt quality
   */
  validatePrompt(prompt: PromptTemplate, context: UserContext): {
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 1.0;

    // Check prompt length
    if (prompt.userPrompt.length < 500) {
      issues.push('Prompt may be too short for comprehensive personalization');
      score -= 0.1;
    }

    // Check personalization elements
    if (!prompt.userPrompt.includes(context.profile.name || 'User')) {
      issues.push('Missing user name personalization');
      score -= 0.05;
    }

    if (!prompt.userPrompt.includes(context.timeContext.timeOfDay)) {
      issues.push('Missing time context');
      score -= 0.05;
    }

    // Check constraint completeness
    if (prompt.constraints.length < 5) {
      issues.push('Insufficient constraints for quality control');
      score -= 0.1;
    }

    // Provide suggestions
    if (context.currentStreak > 7) {
      suggestions.push('Consider adding streak milestone recognition');
    }

    if (context.engagementHistory.completionRate < 0.5) {
      suggestions.push('Focus on simpler, more achievable recommendations');
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(score, 0),
      issues,
      suggestions,
    };
  }
}

export const promptEngineeringService = PromptEngineeringService.getInstance();