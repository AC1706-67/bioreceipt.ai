/**
 * Progress Service
 * Core service for user progress tracking and streak management
 */

import { storage } from '../../utils/storage';
import { loggingService } from '../logging/loggingService';
import { kiroAIService } from '../ai/kiroAIService';
import { cacheService } from '../cache/cacheService';

export interface UserProgress {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalTipsCompleted: number;
  totalEngagementTime: number; // in minutes
  lastActivityDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryProgress {
  category: string;
  tipsCompleted: number;
  totalTimeSpent: number; // in minutes
  averageRating: number;
  lastActivity: Date;
  level: number;
  experiencePoints: number;
  streakCount: number;
  longestStreak: number;
  completionRate: number; // 0-1
  engagementScore: number; // 0-1
  preferenceScore: number; // 0-1, how much user likes this category
  milestones: CategoryMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryMilestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  completedAt?: Date;
  reward?: string;
}

export interface Recommendation {
  id: string;
  type: 'streak_motivation' | 'goal_adjustment' | 'category_focus' | 'engagement_boost' | 'milestone_celebration';
  title: string;
  description: string;
  actionText: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  reasoning: string[];
  metadata?: {
    targetStreak?: number;
    suggestedGoal?: number;
    category?: string;
    milestone?: string;
    [key: string]: any;
  };
  createdAt: Date;
  expiresAt?: Date;
}

class ProgressService {
  private static instance: ProgressService;
  private readonly STORAGE_KEY = 'USER_PROGRESS';

  private constructor() {}

  static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  /**
   * Get user progress data
   */
  async getUserProgress(userId: string): Promise<UserProgress> {
    try {
      await loggingService.logInfo('Getting user progress', { userId });
      
      const progressData = await storage.getData(this.STORAGE_KEY) || {};
      let userProgress = progressData[userId];

      if (!userProgress) {
        // Create initial progress for new user
        userProgress = await this.createInitialProgress(userId);
        await loggingService.logInfo('Created initial progress for new user', { userId });
      } else {
        // Ensure dates are properly parsed
        userProgress = this.parseProgressDates(userProgress);
      }

      return userProgress;
    } catch (error) {
      await loggingService.logError('Error getting user progress', error as Error);
      throw new Error(`Failed to get user progress: ${error.message}`);
    }
  }

  /**
   * Update user progress when a tip is completed
   */
  async updateUserProgress(userId: string, tipId: string, tipMetadata?: {
    category?: string;
    readingTime?: number;
    rating?: number;
  }): Promise<void> {
    try {
      await loggingService.logInfo('Updating user progress', { userId, tipId });

      const userProgress = await this.getUserProgress(userId);
      const now = new Date();
      const lastActivity = new Date(userProgress.lastActivityDate);

      // Update basic progress
      userProgress.totalTipsCompleted++;
      const engagementTime = tipMetadata?.readingTime || 2;
      userProgress.totalEngagementTime += engagementTime;
      userProgress.lastActivityDate = now;
      userProgress.updatedAt = now;

      // Update streak logic
      const daysSinceLastActivity = this.getDaysDifference(lastActivity, now);
      
      if (daysSinceLastActivity === 0) {
        // Same day - no streak change
        await loggingService.logDebug('Same day activity, streak unchanged', { userId, currentStreak: userProgress.currentStreak });
      } else if (daysSinceLastActivity === 1) {
        // Next day - increment streak
        userProgress.currentStreak++;
        if (userProgress.currentStreak > userProgress.longestStreak) {
          userProgress.longestStreak = userProgress.currentStreak;
        }
        await loggingService.logInfo('Streak incremented', { userId, newStreak: userProgress.currentStreak });
      } else {
        // Streak broken - reset to 1
        userProgress.currentStreak = 1;
        await loggingService.logInfo('Streak reset due to gap in activity', { userId, daysSinceLastActivity });
      }

      // Update category-specific progress
      if (tipMetadata?.category) {
        await this.updateCategoryProgress(userId, tipMetadata.category, {
          tipsCompleted: 1,
          timeSpent: engagementTime,
          rating: tipMetadata.rating
        });
      }

      // Save updated progress
      await this.saveUserProgress(userProgress);
      
      await loggingService.logInfo('User progress updated successfully', {
        userId,
        tipId,
        currentStreak: userProgress.currentStreak,
        totalTipsCompleted: userProgress.totalTipsCompleted,
        category: tipMetadata?.category
      });
    } catch (error) {
      await loggingService.logError('Error updating user progress', error as Error);
      throw new Error(`Failed to update user progress: ${error.message}`);
    }
  }

  /**
   * Reset user streak to 0
   */
  async resetStreak(userId: string): Promise<void> {
    try {
      await loggingService.logInfo('Resetting user streak', { userId });

      const userProgress = await this.getUserProgress(userId);
      const previousStreak = userProgress.currentStreak;
      
      userProgress.currentStreak = 0;
      userProgress.updatedAt = new Date();

      await this.saveUserProgress(userProgress);
      
      await loggingService.logInfo('User streak reset successfully', { 
        userId, 
        previousStreak, 
        newStreak: userProgress.currentStreak 
      });
    } catch (error) {
      await loggingService.logError('Error resetting user streak', error as Error);
      throw new Error(`Failed to reset user streak: ${error.message}`);
    }
  }

  /**
   * Get AI-powered progress insights and recommendations
   */
  async getProgressInsights(userId: string): Promise<Recommendation[]> {
    try {
      await loggingService.logInfo('Getting AI-powered progress insights', { userId });

      // Get user progress data
      const userProgress = await this.getUserProgress(userId);
      
      // Get user profile for AI context (if available)
      const userProfiles = await storage.getData('USER_PROFILES') || {};
      const userProfile = userProfiles[userId] || {};

      // Prepare AI input data
      const aiInput = {
        userId,
        progressData: {
          currentStreak: userProgress.currentStreak,
          longestStreak: userProgress.longestStreak,
          totalTipsCompleted: userProgress.totalTipsCompleted,
          totalEngagementTime: userProgress.totalEngagementTime,
          daysSinceLastActivity: this.getDaysDifference(userProgress.lastActivityDate, new Date()),
          accountAge: this.getDaysDifference(userProgress.createdAt, new Date())
        },
        userProfile: {
          healthGoals: userProfile.healthGoals || [],
          interests: userProfile.interests || [],
          fitnessLevel: userProfile.fitnessLevel || 'beginner'
        },
        context: {
          requestType: 'progress_insights',
          timestamp: new Date().toISOString()
        }
      };

      // Call KIRO AI service for insights
      let aiRecommendations: Recommendation[] = [];
      
      try {
        const aiResponse = await kiroAIService.getPersonalizedRecommendations(aiInput, 5);
        aiRecommendations = await this.mapAIResponseToRecommendations(aiResponse, userId);
        
        await loggingService.logInfo('AI insights generated successfully', { 
          userId, 
          recommendationCount: aiRecommendations.length 
        });
      } catch (aiError) {
        await loggingService.logWarn('AI service unavailable, using fallback insights', { 
          userId, 
          error: aiError.message 
        });
        
        // Fallback to rule-based insights
        aiRecommendations = await this.generateFallbackInsights(userProgress, userProfile);
      }

      // Filter and prioritize recommendations
      const finalRecommendations = await this.prioritizeRecommendations(aiRecommendations);

      await loggingService.logInfo('Progress insights generated', { 
        userId, 
        totalRecommendations: finalRecommendations.length,
        highPriority: finalRecommendations.filter(r => r.priority === 'high').length
      });

      return finalRecommendations;
    } catch (error) {
      await loggingService.logError('Error getting progress insights', error as Error);
      throw new Error(`Failed to get progress insights: ${error.message}`);
    }
  }

  /**
   * Get category-level progress for a user
   */
  async getCategoryProgress(userId: string): Promise<CategoryProgress[]> {
    try {
      await loggingService.logInfo('Getting category progress', { userId });

      const cacheKey = `category_progress_${userId}`;
      const cached = await cacheService.getAdvanced<CategoryProgress[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Load category progress data
      const categoryData = await storage.getData('PROGRESS_DATA') || {};
      const userCategoryData = categoryData[`${userId}_categories`] || {};

      // Get all available categories from BioReceipt enum
      const allCategories = [
        'nutrition', 'fitness', 'mental_wellness', 'sleep', 
        'recovery', 'hygiene', 'general'
      ];

      const categoryProgress: CategoryProgress[] = [];

      for (const category of allCategories) {
        let progress = userCategoryData[category];
        
        if (!progress) {
          // Create initial category progress
          progress = await this.createInitialCategoryProgress(userId, category);
        } else {
          // Parse dates
          progress = this.parseCategoryProgressDates(progress);
        }

        categoryProgress.push(progress);
      }

      // Sort by engagement score (most engaged categories first)
      categoryProgress.sort((a, b) => b.engagementScore - a.engagementScore);

      // Cache for 15 minutes
      await cacheService.setAdvanced(cacheKey, categoryProgress, {
        ttl: 15,
        level: 'memory',
        importance: 0.7
      });

      await loggingService.logInfo('Category progress retrieved', { 
        userId, 
        categoriesCount: categoryProgress.length 
      });

      return categoryProgress;
    } catch (error) {
      await loggingService.logError('Error getting category progress', error as Error);
      throw new Error(`Failed to get category progress: ${error.message}`);
    }
  }

  /**
   * Get progress statistics for multiple users (admin function)
   */
  async getProgressStatistics(): Promise<{
    totalUsers: number;
    averageStreak: number;
    totalTipsCompleted: number;
    averageEngagementTime: number;
  }> {
    try {
      await loggingService.logInfo('Getting progress statistics');

      const progressData = await storage.getData(this.STORAGE_KEY) || {};
      const allProgress = Object.values(progressData) as UserProgress[];

      if (allProgress.length === 0) {
        return {
          totalUsers: 0,
          averageStreak: 0,
          totalTipsCompleted: 0,
          averageEngagementTime: 0
        };
      }

      const stats = {
        totalUsers: allProgress.length,
        averageStreak: allProgress.reduce((sum, p) => sum + p.currentStreak, 0) / allProgress.length,
        totalTipsCompleted: allProgress.reduce((sum, p) => sum + p.totalTipsCompleted, 0),
        averageEngagementTime: allProgress.reduce((sum, p) => sum + p.totalEngagementTime, 0) / allProgress.length
      };

      await loggingService.logInfo('Progress statistics calculated', stats);
      return stats;
    } catch (error) {
      await loggingService.logError('Error getting progress statistics', error as Error);
      throw new Error(`Failed to get progress statistics: ${error.message}`);
    }
  }

  // Private helper methods

  private async createInitialProgress(userId: string): Promise<UserProgress> {
    const now = new Date();
    const initialProgress: UserProgress = {
      id: `progress_${userId}_${Date.now()}`,
      userId,
      currentStreak: 0,
      longestStreak: 0,
      totalTipsCompleted: 0,
      totalEngagementTime: 0,
      lastActivityDate: now,
      createdAt: now,
      updatedAt: now
    };

    await this.saveUserProgress(initialProgress);
    return initialProgress;
  }

  private parseProgressDates(progress: any): UserProgress {
    return {
      ...progress,
      lastActivityDate: new Date(progress.lastActivityDate),
      createdAt: new Date(progress.createdAt),
      updatedAt: new Date(progress.updatedAt)
    };
  }

  private async saveUserProgress(progress: UserProgress): Promise<void> {
    try {
      const progressData = await storage.getData(this.STORAGE_KEY) || {};
      progressData[progress.userId] = progress;
      await storage.storeData(this.STORAGE_KEY, progressData);
    } catch (error) {
      await loggingService.logError('Error saving user progress', error as Error);
      throw error;
    }
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const firstDate = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const secondDate = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay));
  }

  /**
   * Map AI service response to Recommendation objects
   */
  private async mapAIResponseToRecommendations(aiResponse: any, userId: string): Promise<Recommendation[]> {
    try {
      if (!aiResponse || !aiResponse.recommendations) {
        return [];
      }

      return aiResponse.recommendations.map((rec: any, index: number) => ({
        id: `ai-rec-${userId}-${Date.now()}-${index}`,
        type: rec.type || 'engagement_boost',
        title: rec.title || 'Improve Your Progress',
        description: rec.description || 'AI-generated recommendation to enhance your health journey',
        actionText: rec.actionText || 'Take Action',
        priority: rec.priority || 'medium',
        confidence: Math.max(0, Math.min(1, rec.confidence || 0.7)),
        reasoning: Array.isArray(rec.reasoning) ? rec.reasoning : ['AI-generated insight'],
        metadata: rec.metadata || {},
        createdAt: new Date(),
        expiresAt: rec.expiresAt ? new Date(rec.expiresAt) : undefined
      }));
    } catch (error) {
      await loggingService.logError('Error mapping AI response to recommendations', error as Error);
      return [];
    }
  }

  /**
   * Generate fallback insights using rule-based logic
   */
  private async generateFallbackInsights(userProgress: UserProgress, userProfile: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const now = new Date();

    try {
      // Streak-based recommendations
      if (userProgress.currentStreak === 0) {
        recommendations.push({
          id: `fallback-${userProgress.userId}-streak-start-${Date.now()}`,
          type: 'streak_motivation',
          title: 'Start Your Health Streak Today!',
          description: 'Begin building a healthy habit by completing your first tip today. Every journey starts with a single step.',
          actionText: 'Complete a Tip',
          priority: 'high',
          confidence: 0.9,
          reasoning: ['User has no current streak', 'Starting is the most important step'],
          metadata: { targetStreak: 1 },
          createdAt: now
        });
      } else if (userProgress.currentStreak >= 7 && userProgress.currentStreak < 30) {
        recommendations.push({
          id: `fallback-${userProgress.userId}-streak-maintain-${Date.now()}`,
          type: 'streak_motivation',
          title: 'Keep Your Amazing Streak Going!',
          description: `You're on a ${userProgress.currentStreak}-day streak! You're building great habits. Keep it up to reach your next milestone.`,
          actionText: 'Continue Streak',
          priority: 'medium',
          confidence: 0.8,
          reasoning: ['User has active streak', 'Positive reinforcement helps maintain habits'],
          metadata: { targetStreak: 30 },
          createdAt: now
        });
      }

      // Engagement-based recommendations
      if (userProgress.totalEngagementTime < 30) {
        recommendations.push({
          id: `fallback-${userProgress.userId}-engagement-${Date.now()}`,
          type: 'engagement_boost',
          title: 'Spend More Time Learning',
          description: 'Try spending a few extra minutes reading health tips. The more you engage, the more you learn!',
          actionText: 'Read Longer',
          priority: 'medium',
          confidence: 0.7,
          reasoning: ['Low total engagement time', 'Increased engagement improves learning'],
          metadata: { suggestedGoal: 60 },
          createdAt: now
        });
      }

      // Milestone celebrations
      if (userProgress.totalTipsCompleted > 0 && userProgress.totalTipsCompleted % 10 === 0) {
        recommendations.push({
          id: `fallback-${userProgress.userId}-milestone-${Date.now()}`,
          type: 'milestone_celebration',
          title: `Congratulations on ${userProgress.totalTipsCompleted} Tips!`,
          description: `You've completed ${userProgress.totalTipsCompleted} health tips! That's fantastic progress on your wellness journey.`,
          actionText: 'Keep Going',
          priority: 'high',
          confidence: 0.9,
          reasoning: ['User reached milestone', 'Celebration reinforces positive behavior'],
          metadata: { milestone: `${userProgress.totalTipsCompleted}_tips` },
          createdAt: now
        });
      }

      // Goal adjustment recommendations
      if (userProgress.currentStreak > userProgress.longestStreak) {
        recommendations.push({
          id: `fallback-${userProgress.userId}-goal-${Date.now()}`,
          type: 'goal_adjustment',
          title: 'New Personal Record!',
          description: `You've set a new personal record with your ${userProgress.currentStreak}-day streak! Consider setting a higher goal.`,
          actionText: 'Set New Goal',
          priority: 'medium',
          confidence: 0.8,
          reasoning: ['User exceeded previous best', 'Success indicates readiness for higher goals'],
          metadata: { suggestedGoal: userProgress.currentStreak + 7 },
          createdAt: now
        });
      }

      return recommendations;
    } catch (error) {
      await loggingService.logError('Error generating fallback insights', error as Error);
      return [];
    }
  }

  /**
   * Prioritize and filter recommendations
   */
  private async prioritizeRecommendations(recommendations: Recommendation[]): Promise<Recommendation[]> {
    try {
      // Filter out low-confidence recommendations
      const filtered = recommendations.filter(rec => rec.confidence >= 0.5);

      // Sort by priority and confidence
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      
      return filtered
        .sort((a, b) => {
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.confidence - a.confidence;
        })
        .slice(0, 5); // Return top 5 recommendations
    } catch (error) {
      await loggingService.logError('Error prioritizing recommendations', error as Error);
      return recommendations.slice(0, 5);
    }
  }

  /**
   * Create initial category progress for a new category
   */
  private async createInitialCategoryProgress(userId: string, category: string): Promise<CategoryProgress> {
    const now = new Date();
    const initialProgress: CategoryProgress = {
      category,
      tipsCompleted: 0,
      totalTimeSpent: 0,
      averageRating: 0,
      lastActivity: now,
      level: 1,
      experiencePoints: 0,
      streakCount: 0,
      longestStreak: 0,
      completionRate: 0,
      engagementScore: 0,
      preferenceScore: 0.5, // Neutral starting preference
      milestones: this.createInitialCategoryMilestones(category),
      createdAt: now,
      updatedAt: now
    };

    await this.saveCategoryProgress(userId, category, initialProgress);
    return initialProgress;
  }

  /**
   * Update category-specific progress
   */
  private async updateCategoryProgress(userId: string, category: string, updates: {
    tipsCompleted?: number;
    timeSpent?: number;
    rating?: number;
  }): Promise<void> {
    try {
      const categoryData = await storage.getData('PROGRESS_DATA') || {};
      const userCategoryData = categoryData[`${userId}_categories`] || {};
      let categoryProgress = userCategoryData[category];

      if (!categoryProgress) {
        categoryProgress = await this.createInitialCategoryProgress(userId, category);
      } else {
        categoryProgress = this.parseCategoryProgressDates(categoryProgress);
      }

      const now = new Date();

      // Update basic metrics
      if (updates.tipsCompleted) {
        categoryProgress.tipsCompleted += updates.tipsCompleted;
        categoryProgress.experiencePoints += updates.tipsCompleted * 10; // 10 XP per tip
      }

      if (updates.timeSpent) {
        categoryProgress.totalTimeSpent += updates.timeSpent;
      }

      if (updates.rating) {
        // Update average rating
        const totalRatings = categoryProgress.tipsCompleted;
        const currentTotal = categoryProgress.averageRating * (totalRatings - 1);
        categoryProgress.averageRating = (currentTotal + updates.rating) / totalRatings;
        
        // Update preference score based on rating
        const ratingInfluence = (updates.rating - 3) * 0.1; // -0.2 to +0.2
        categoryProgress.preferenceScore = Math.max(0, Math.min(1, 
          categoryProgress.preferenceScore + ratingInfluence
        ));
      }

      // Update level based on experience points
      categoryProgress.level = Math.floor(categoryProgress.experiencePoints / 100) + 1;

      // Update engagement score (combination of activity and preference)
      categoryProgress.engagementScore = this.calculateCategoryEngagementScore(categoryProgress);

      // Update completion rate (simplified - could be more sophisticated)
      categoryProgress.completionRate = Math.min(1, categoryProgress.tipsCompleted / 10);

      // Check for category streaks
      const daysSinceLastActivity = this.getDaysDifference(categoryProgress.lastActivity, now);
      if (daysSinceLastActivity <= 1) {
        if (daysSinceLastActivity === 1) {
          categoryProgress.streakCount++;
          if (categoryProgress.streakCount > categoryProgress.longestStreak) {
            categoryProgress.longestStreak = categoryProgress.streakCount;
          }
        }
      } else {
        categoryProgress.streakCount = 1; // Reset streak
      }

      categoryProgress.lastActivity = now;
      categoryProgress.updatedAt = now;

      // Check and update milestones
      this.updateCategoryMilestones(categoryProgress);

      // Save updated category progress
      await this.saveCategoryProgress(userId, category, categoryProgress);

      // Invalidate cache
      await cacheService.invalidatePattern(new RegExp(`category_progress_${userId}`));

    } catch (error) {
      await loggingService.logError('Error updating category progress', error as Error);
    }
  }

  /**
   * Calculate engagement score for a category
   */
  private calculateCategoryEngagementScore(progress: CategoryProgress): number {
    let score = 0;

    // Tips completed factor (40%)
    score += Math.min(progress.tipsCompleted / 20, 1) * 0.4;

    // Time spent factor (30%)
    score += Math.min(progress.totalTimeSpent / 60, 1) * 0.3; // 60 minutes = max

    // Preference score factor (20%)
    score += progress.preferenceScore * 0.2;

    // Streak factor (10%)
    score += Math.min(progress.streakCount / 7, 1) * 0.1; // 7 days = max

    return Math.min(score, 1.0);
  }

  /**
   * Create initial milestones for a category
   */
  private createInitialCategoryMilestones(category: string): CategoryMilestone[] {
    return [
      {
        id: `${category}_first_tip`,
        title: 'First Step',
        description: `Complete your first ${category} tip`,
        targetValue: 1,
        currentValue: 0,
        isCompleted: false,
        reward: '10 bonus XP'
      },
      {
        id: `${category}_ten_tips`,
        title: 'Getting Serious',
        description: `Complete 10 ${category} tips`,
        targetValue: 10,
        currentValue: 0,
        isCompleted: false,
        reward: 'Category badge'
      },
      {
        id: `${category}_week_streak`,
        title: 'Weekly Warrior',
        description: `Maintain a 7-day streak in ${category}`,
        targetValue: 7,
        currentValue: 0,
        isCompleted: false,
        reward: 'Streak freeze'
      }
    ];
  }

  /**
   * Update category milestones based on current progress
   */
  private updateCategoryMilestones(progress: CategoryProgress): void {
    for (const milestone of progress.milestones) {
      if (milestone.isCompleted) continue;

      let currentValue = 0;
      if (milestone.id.includes('tips')) {
        currentValue = progress.tipsCompleted;
      } else if (milestone.id.includes('streak')) {
        currentValue = progress.streakCount;
      }

      milestone.currentValue = currentValue;

      if (currentValue >= milestone.targetValue) {
        milestone.isCompleted = true;
        milestone.completedAt = new Date();
      }
    }
  }

  /**
   * Save category progress to storage
   */
  private async saveCategoryProgress(userId: string, category: string, progress: CategoryProgress): Promise<void> {
    try {
      const categoryData = await storage.getData('PROGRESS_DATA') || {};
      
      const categoryKey = `${userId}_categories`;
      if (!categoryData[categoryKey]) {
        categoryData[categoryKey] = {};
      }
      
      categoryData[categoryKey][category] = progress;
      await storage.storeData('PROGRESS_DATA', categoryData);
    } catch (error) {
      await loggingService.logError('Error saving category progress', error as Error);
      throw error;
    }
  }

  /**
   * Parse category progress dates from storage
   */
  private parseCategoryProgressDates(progress: any): CategoryProgress {
    return {
      ...progress,
      lastActivity: new Date(progress.lastActivity),
      createdAt: new Date(progress.createdAt),
      updatedAt: new Date(progress.updatedAt),
      milestones: progress.milestones.map((m: any) => ({
        ...m,
        completedAt: m.completedAt ? new Date(m.completedAt) : undefined
      }))
    };
  }
}

export const progressService = ProgressService.getInstance();
