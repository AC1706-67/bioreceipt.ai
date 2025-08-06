import { 
  UserProgress, 
  StreakData, 
  Milestone, 
  Achievement, 
  ProgressInsight,
  ProgressAnalytics,
  CategoryProgress,
  WeeklyGoal,
  MonthlyGoal,
  EngagementQuality,
  StreakType,
  HealthCategory,
  ProgressNotificationData
} from '../../types/progress';
import { UserEngagement } from '../../types/healthTip';
import { kiroAIService } from '../ai/kiroAIService';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';
import { notificationService } from '../notification/notificationService';
import { analyticsService } from '../analytics/analyticsService';

class ProgressTrackingService {
  private readonly CACHE_KEYS = {
    USER_PROGRESS: 'user_progress_',
    STREAK_DATA: 'streak_data_',
    MILESTONES: 'milestones_',
    ACHIEVEMENTS: 'achievements_',
    INSIGHTS: 'progress_insights_',
    ANALYTICS: 'progress_analytics_'
  };

  private readonly CACHE_TTL = {
    PROGRESS: 5 * 60 * 1000, // 5 minutes
    ANALYTICS: 30 * 60 * 1000, // 30 minutes
    INSIGHTS: 60 * 60 * 1000 // 1 hour
  };

  /**
   * Initialize progress tracking for a new user
   */
  async initializeUserProgress(userId: string): Promise<UserProgress> {
    try {
      const initialProgress: UserProgress = {
        id: `progress_${userId}`,
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalTipsCompleted: 0,
        totalEngagementTime: 0,
        lastActivityDate: new Date(),
        streakFreezeUsed: 0,
        streakFreezeRemaining: 3, // Start with 3 streak freezes
        categoryProgress: this.initializeCategoryProgress(),
        weeklyGoals: [],
        monthlyGoals: [],
        achievements: [],
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveUserProgress(initialProgress);
      await this.generateInitialMilestones(userId);
      await this.createWeeklyGoal(userId);
      await this.createMonthlyGoal(userId);

      return initialProgress;
    } catch (error) {
      console.error('Error initializing user progress:', error);
      throw new Error('Failed to initialize user progress');
    }
  }

  /**
   * Record user engagement and update progress
   */
  async recordEngagement(userId: string, engagement: UserEngagement, quality: EngagementQuality): Promise<void> {
    try {
      const progress = await this.getUserProgress(userId);
      const today = new Date().toDateString();
      const lastActivity = progress.lastActivityDate.toDateString();

      // Update basic progress metrics
      progress.totalTipsCompleted += 1;
      progress.totalEngagementTime += quality.readingTime;
      progress.lastActivityDate = new Date();

      // Update streak
      await this.updateStreak(userId, progress, today !== lastActivity);

      // Update category progress
      await this.updateCategoryProgress(progress, engagement, quality);

      // Update goals
      await this.updateGoalProgress(userId, progress, engagement);

      // Check for milestone completions
      await this.checkMilestoneCompletions(userId, progress);

      // Generate insights if needed
      await this.generateProgressInsights(userId, progress);

      // Save updated progress
      await this.saveUserProgress(progress);

      // Track analytics
      analyticsService.trackEvent('progress_updated', {
        userId,
        tipId: engagement.tipId,
        engagementTime: quality.readingTime,
        currentStreak: progress.currentStreak
      });

    } catch (error) {
      console.error('Error recording engagement:', error);
      throw new Error('Failed to record engagement');
    }
  }

  /**
   * Get comprehensive user progress data
   */
  async getUserProgress(userId: string): Promise<UserProgress> {
    try {
      const cacheKey = `${this.CACHE_KEYS.USER_PROGRESS}${userId}`;
      const cached = await cacheService.get<UserProgress>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const stored = await storage.getItem(`progress_${userId}`);
      if (!stored) {
        return await this.initializeUserProgress(userId);
      }

      const progress = JSON.parse(stored);
      // Convert date strings back to Date objects
      progress.lastActivityDate = new Date(progress.lastActivityDate);
      progress.createdAt = new Date(progress.createdAt);
      progress.updatedAt = new Date(progress.updatedAt);

      await cacheService.set(cacheKey, progress, this.CACHE_TTL.PROGRESS);
      return progress;
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw new Error('Failed to get user progress');
    }
  }

  /**
   * Get detailed streak data
   */
  async getStreakData(userId: string, streakType: StreakType = 'daily'): Promise<StreakData> {
    try {
      const cacheKey = `${this.CACHE_KEYS.STREAK_DATA}${userId}_${streakType}`;
      const cached = await cacheService.get<StreakData>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const stored = await storage.getItem(`streak_${userId}_${streakType}`);
      if (!stored) {
        return await this.initializeStreakData(userId, streakType);
      }

      const streakData = JSON.parse(stored);
      await cacheService.set(cacheKey, streakData, this.CACHE_TTL.PROGRESS);
      return streakData;
    } catch (error) {
      console.error('Error getting streak data:', error);
      throw new Error('Failed to get streak data');
    }
  }

  /**
   * Get user milestones
   */
  async getUserMilestones(userId: string, includeCompleted: boolean = true): Promise<Milestone[]> {
    try {
      const cacheKey = `${this.CACHE_KEYS.MILESTONES}${userId}`;
      const cached = await cacheService.get<Milestone[]>(cacheKey);
      
      if (cached) {
        return includeCompleted ? cached : cached.filter(m => !m.isCompleted);
      }

      const stored = await storage.getItem(`milestones_${userId}`);
      const milestones: Milestone[] = stored ? JSON.parse(stored) : [];

      await cacheService.set(cacheKey, milestones, this.CACHE_TTL.PROGRESS);
      return includeCompleted ? milestones : milestones.filter(m => !m.isCompleted);
    } catch (error) {
      console.error('Error getting user milestones:', error);
      throw new Error('Failed to get user milestones');
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const cacheKey = `${this.CACHE_KEYS.ACHIEVEMENTS}${userId}`;
      const cached = await cacheService.get<Achievement[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const stored = await storage.getItem(`achievements_${userId}`);
      const achievements: Achievement[] = stored ? JSON.parse(stored) : [];

      await cacheService.set(cacheKey, achievements, this.CACHE_TTL.PROGRESS);
      return achievements;
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw new Error('Failed to get user achievements');
    }
  }

  /**
   * Get progress insights
   */
  async getProgressInsights(userId: string, limit: number = 10): Promise<ProgressInsight[]> {
    try {
      const cacheKey = `${this.CACHE_KEYS.INSIGHTS}${userId}`;
      const cached = await cacheService.get<ProgressInsight[]>(cacheKey);
      
      if (cached) {
        return cached.slice(0, limit);
      }

      const stored = await storage.getItem(`insights_${userId}`);
      const insights: ProgressInsight[] = stored ? JSON.parse(stored) : [];

      // Filter out expired insights
      const validInsights = insights.filter(insight => 
        !insight.expiresAt || new Date(insight.expiresAt) > new Date()
      );

      await cacheService.set(cacheKey, validInsights, this.CACHE_TTL.INSIGHTS);
      return validInsights.slice(0, limit);
    } catch (error) {
      console.error('Error getting progress insights:', error);
      throw new Error('Failed to get progress insights');
    }
  }

  /**
   * Generate comprehensive progress analytics
   */
  async generateProgressAnalytics(userId: string, timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<ProgressAnalytics> {
    try {
      const cacheKey = `${this.CACHE_KEYS.ANALYTICS}${userId}_${timeframe}`;
      const cached = await cacheService.get<ProgressAnalytics>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const progress = await this.getUserProgress(userId);
      const streakData = await this.getStreakData(userId);
      
      // Use AI to generate comprehensive analytics
      const analyticsPrompt = `
        Generate comprehensive progress analytics for user with the following data:
        - Current streak: ${progress.currentStreak} days
        - Total tips completed: ${progress.totalTipsCompleted}
        - Total engagement time: ${progress.totalEngagementTime} minutes
        - Category progress: ${JSON.stringify(progress.categoryProgress)}
        - Timeframe: ${timeframe}
        
        Provide insights on trends, patterns, predictions, and recommendations.
      `;

      const aiAnalytics = await kiroAIService.generateInsights(analyticsPrompt, {
        userId,
        progressData: progress,
        streakData,
        timeframe
      });

      const analytics: ProgressAnalytics = {
        userId,
        timeframe,
        engagementTrends: this.calculateEngagementTrends(progress, timeframe),
        categoryBreakdown: this.calculateCategoryBreakdown(progress),
        streakAnalysis: this.analyzeStreakHealth(streakData),
        goalProgress: this.analyzeGoalProgress(progress),
        behaviorPatterns: aiAnalytics.behaviorPatterns || [],
        predictions: aiAnalytics.predictions || [],
        recommendations: aiAnalytics.recommendations || [],
        generatedAt: new Date()
      };

      await cacheService.set(cacheKey, analytics, this.CACHE_TTL.ANALYTICS);
      return analytics;
    } catch (error) {
      console.error('Error generating progress analytics:', error);
      throw new Error('Failed to generate progress analytics');
    }
  }

  /**
   * Use streak freeze
   */
  async useStreakFreeze(userId: string): Promise<boolean> {
    try {
      const progress = await this.getUserProgress(userId);
      
      if (progress.streakFreezeRemaining <= 0) {
        return false;
      }

      progress.streakFreezeUsed += 1;
      progress.streakFreezeRemaining -= 1;
      
      // Extend streak by one day
      const streakData = await this.getStreakData(userId);
      streakData.freezeCount += 1;
      streakData.freezeEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      await this.saveUserProgress(progress);
      await this.saveStreakData(streakData);

      // Send notification
      await notificationService.scheduleNotification({
        type: 'streak',
        title: 'Streak Freeze Activated! 🧊',
        message: 'Your streak is protected for the next 24 hours. Get back to your healthy habits tomorrow!',
        data: { userId, streakFreezeUsed: true },
        priority: 'medium',
        userId
      });

      return true;
    } catch (error) {
      console.error('Error using streak freeze:', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private initializeCategoryProgress(): CategoryProgress[] {
    const categories: HealthCategory[] = ['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'];
    
    return categories.map(category => ({
      category,
      completedTips: 0,
      totalTimeSpent: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageEngagementScore: 0,
      lastActivityDate: new Date(),
      progressPercentage: 0,
      level: 'beginner'
    }));
  }

  private async initializeStreakData(userId: string, streakType: StreakType): Promise<StreakData> {
    const streakData: StreakData = {
      id: `streak_${userId}_${streakType}`,
      userId,
      streakType,
      currentCount: 0,
      longestCount: 0,
      startDate: new Date(),
      lastActivityDate: new Date(),
      isActive: true,
      freezeCount: 0,
      streakHistory: [],
      qualityScore: 0,
      consistencyScore: 0,
      metadata: {
        averageEngagementTime: 0,
        preferredEngagementTime: '09:00',
        categoryDistribution: {} as Record<HealthCategory, number>,
        difficultyDistribution: {},
        seasonalPatterns: []
      }
    };

    await this.saveStreakData(streakData);
    return streakData;
  }

  private async updateStreak(userId: string, progress: UserProgress, isNewDay: boolean): Promise<void> {
    if (isNewDay) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const wasActiveYesterday = progress.lastActivityDate.toDateString() === yesterday.toDateString();
      
      if (wasActiveYesterday || progress.streakFreezeRemaining > 0) {
        progress.currentStreak += 1;
        if (progress.currentStreak > progress.longestStreak) {
          progress.longestStreak = progress.currentStreak;
        }
      } else {
        progress.currentStreak = 1; // Reset streak but count today
      }
    }
  }

  private async updateCategoryProgress(progress: UserProgress, engagement: UserEngagement, quality: EngagementQuality): Promise<void> {
    // This would be implemented based on the tip's category
    // For now, we'll update a random category as an example
    const categoryIndex = Math.floor(Math.random() * progress.categoryProgress.length);
    const categoryProgress = progress.categoryProgress[categoryIndex];
    
    categoryProgress.completedTips += 1;
    categoryProgress.totalTimeSpent += quality.readingTime;
    categoryProgress.lastActivityDate = new Date();
    
    // Update level based on completed tips
    if (categoryProgress.completedTips >= 100) {
      categoryProgress.level = 'expert';
    } else if (categoryProgress.completedTips >= 50) {
      categoryProgress.level = 'advanced';
    } else if (categoryProgress.completedTips >= 20) {
      categoryProgress.level = 'intermediate';
    }
  }

  private async updateGoalProgress(userId: string, progress: UserProgress, engagement: UserEngagement): Promise<void> {
    // Update weekly goals
    const currentWeek = this.getCurrentWeek();
    let weeklyGoal = progress.weeklyGoals.find(g => g.week === currentWeek);
    
    if (!weeklyGoal) {
      weeklyGoal = await this.createWeeklyGoal(userId);
      progress.weeklyGoals.push(weeklyGoal);
    }
    
    weeklyGoal.completedTips += 1;
    weeklyGoal.actualEngagementTime += 5; // Assuming 5 minutes per tip
    
    if (weeklyGoal.completedTips >= weeklyGoal.targetTips) {
      weeklyGoal.isCompleted = true;
      weeklyGoal.completedAt = new Date();
    }

    // Update monthly goals
    const currentMonth = this.getCurrentMonth();
    let monthlyGoal = progress.monthlyGoals.find(g => g.month === currentMonth);
    
    if (!monthlyGoal) {
      monthlyGoal = await this.createMonthlyGoal(userId);
      progress.monthlyGoals.push(monthlyGoal);
    }
    
    monthlyGoal.actualStreak = Math.max(monthlyGoal.actualStreak, progress.currentStreak);
  }

  private async checkMilestoneCompletions(userId: string, progress: UserProgress): Promise<void> {
    const milestones = await this.getUserMilestones(userId, false);
    
    for (const milestone of milestones) {
      let currentValue = 0;
      
      switch (milestone.type) {
        case 'streak':
          currentValue = progress.currentStreak;
          break;
        case 'completion':
          currentValue = progress.totalTipsCompleted;
          break;
        case 'engagement':
          currentValue = progress.totalEngagementTime;
          break;
      }
      
      milestone.currentValue = currentValue;
      
      if (currentValue >= milestone.targetValue && !milestone.isCompleted) {
        milestone.isCompleted = true;
        milestone.completedAt = new Date();
        
        await this.celebrateMilestone(userId, milestone);
      }
    }
    
    await this.saveMilestones(userId, milestones);
  }

  private async celebrateMilestone(userId: string, milestone: Milestone): Promise<void> {
    // Send celebration notification
    await notificationService.scheduleNotification({
      type: 'milestone',
      title: '🎉 Milestone Achieved!',
      message: `Congratulations! You've completed: ${milestone.title}`,
      data: { userId, milestoneId: milestone.id },
      priority: 'high',
      userId
    });

    // Award achievement if applicable
    if (milestone.reward.type === 'badge') {
      await this.awardAchievement(userId, milestone.reward.value as string);
    }
  }

  private async awardAchievement(userId: string, badgeId: string): Promise<void> {
    const achievements = await this.getUserAchievements(userId);
    
    // Check if already awarded
    if (achievements.some(a => a.badgeId === badgeId)) {
      return;
    }

    const newAchievement: Achievement = {
      id: `achievement_${userId}_${badgeId}_${Date.now()}`,
      userId,
      badgeId,
      title: `Achievement: ${badgeId}`,
      description: 'Congratulations on your achievement!',
      category: 'general',
      rarity: 'common',
      unlockedAt: new Date(),
      progress: 100,
      maxProgress: 100,
      isVisible: true,
      imageUrl: `/badges/${badgeId}.png`
    };

    achievements.push(newAchievement);
    await this.saveAchievements(userId, achievements);
  }

  private async generateProgressInsights(userId: string, progress: UserProgress): Promise<void> {
    try {
      const insights = await this.getProgressInsights(userId);
      
      // Generate new insights using AI if we don't have recent ones
      const recentInsights = insights.filter(i => 
        new Date().getTime() - new Date(i.generatedAt).getTime() < 24 * 60 * 60 * 1000
      );

      if (recentInsights.length < 3) {
        const aiInsights = await kiroAIService.generateInsights(
          `Generate personalized progress insights for user with ${progress.currentStreak} day streak and ${progress.totalTipsCompleted} completed tips.`,
          { userId, progressData: progress }
        );

        // Add AI-generated insights to the list
        if (aiInsights.insights) {
          insights.push(...aiInsights.insights);
          await this.saveInsights(userId, insights);
        }
      }
    } catch (error) {
      console.error('Error generating progress insights:', error);
    }
  }

  private async generateInitialMilestones(userId: string): Promise<void> {
    const initialMilestones: Milestone[] = [
      {
        id: `milestone_${userId}_first_tip`,
        userId,
        type: 'completion',
        title: 'First Step',
        description: 'Complete your first health tip',
        targetValue: 1,
        currentValue: 0,
        isCompleted: false,
        difficulty: 'easy',
        reward: {
          type: 'badge',
          value: 'first_step',
          description: 'Your journey begins!'
        },
        aiGenerated: false,
        celebrationShown: false,
        createdAt: new Date()
      },
      {
        id: `milestone_${userId}_week_streak`,
        userId,
        type: 'streak',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        targetValue: 7,
        currentValue: 0,
        isCompleted: false,
        difficulty: 'medium',
        reward: {
          type: 'streak_freeze',
          value: 1,
          description: 'Earn an extra streak freeze!'
        },
        aiGenerated: false,
        celebrationShown: false,
        createdAt: new Date()
      }
    ];

    await this.saveMilestones(userId, initialMilestones);
  }

  private async createWeeklyGoal(userId: string): Promise<WeeklyGoal> {
    const currentWeek = this.getCurrentWeek();
    
    const weeklyGoal: WeeklyGoal = {
      id: `weekly_${userId}_${currentWeek}`,
      userId,
      week: currentWeek,
      targetTips: 7, // One tip per day
      completedTips: 0,
      targetCategories: ['nutrition', 'mental_wellness'],
      completedCategories: [],
      targetEngagementTime: 35, // 5 minutes per day
      actualEngagementTime: 0,
      isCompleted: false,
      aiAdjusted: false,
      difficultyLevel: 1
    };

    return weeklyGoal;
  }

  private async createMonthlyGoal(userId: string): Promise<MonthlyGoal> {
    const currentMonth = this.getCurrentMonth();
    
    const monthlyGoal: MonthlyGoal = {
      id: `monthly_${userId}_${currentMonth}`,
      userId,
      month: currentMonth,
      targetStreak: 14,
      actualStreak: 0,
      targetMilestones: 2,
      completedMilestones: 0,
      targetCategoryMastery: ['nutrition'],
      achievedCategoryMastery: [],
      isCompleted: false,
      progressScore: 0
    };

    return monthlyGoal;
  }

  private getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private calculateEngagementTrends(progress: UserProgress, timeframe: string): any[] {
    // This would calculate actual engagement trends from historical data
    // For now, return mock data
    return [];
  }

  private calculateCategoryBreakdown(progress: UserProgress): any[] {
    return progress.categoryProgress.map(cp => ({
      category: cp.category,
      completionRate: cp.completedTips > 0 ? (cp.completedTips / 100) * 100 : 0,
      averageEngagementTime: cp.totalTimeSpent / Math.max(cp.completedTips, 1),
      streakDays: cp.currentStreak,
      progressLevel: this.getCategoryProgressLevel(cp.level),
      trendsUp: cp.currentStreak > cp.longestStreak * 0.8,
      lastActivity: cp.lastActivityDate
    }));
  }

  private getCategoryProgressLevel(level: string): number {
    switch (level) {
      case 'beginner': return 1;
      case 'intermediate': return 2;
      case 'advanced': return 3;
      case 'expert': return 4;
      default: return 1;
    }
  }

  private analyzeStreakHealth(streakData: StreakData): any {
    return {
      currentStreakHealth: Math.min(streakData.qualityScore * 100, 100),
      streakStability: streakData.consistencyScore * 100,
      riskOfBreaking: Math.max(0, 100 - (streakData.qualityScore * 50 + streakData.consistencyScore * 50)),
      optimalEngagementTime: streakData.metadata.preferredEngagementTime,
      streakQualityTrend: streakData.qualityScore > 0.7 ? 'improving' : streakData.qualityScore > 0.4 ? 'stable' : 'declining',
      recommendedActions: this.getStreakRecommendations(streakData)
    };
  }

  private getStreakRecommendations(streakData: StreakData): string[] {
    const recommendations = [];
    
    if (streakData.qualityScore < 0.5) {
      recommendations.push('Focus on spending more quality time with each tip');
    }
    
    if (streakData.consistencyScore < 0.7) {
      recommendations.push('Try to engage at the same time each day');
    }
    
    if (streakData.freezeCount > 2) {
      recommendations.push('Consider setting more realistic daily goals');
    }

    return recommendations;
  }

  private analyzeGoalProgress(progress: UserProgress): any {
    const weeklyCompletion = progress.weeklyGoals.filter(g => g.isCompleted).length / Math.max(progress.weeklyGoals.length, 1);
    const monthlyCompletion = progress.monthlyGoals.filter(g => g.isCompleted).length / Math.max(progress.monthlyGoals.length, 1);
    
    return {
      weeklyGoalCompletion: weeklyCompletion * 100,
      monthlyGoalCompletion: monthlyCompletion * 100,
      goalAchievementTrend: weeklyCompletion > 0.7 ? 'improving' : weeklyCompletion > 0.4 ? 'stable' : 'declining',
      averageGoalDifficulty: 2, // Mock value
      recommendedGoalAdjustments: []
    };
  }

  // Storage helper methods
  private async saveUserProgress(progress: UserProgress): Promise<void> {
    progress.updatedAt = new Date();
    await storage.setItem(`progress_${progress.userId}`, JSON.stringify(progress));
    await cacheService.delete(`${this.CACHE_KEYS.USER_PROGRESS}${progress.userId}`);
  }

  private async saveStreakData(streakData: StreakData): Promise<void> {
    await storage.setItem(`streak_${streakData.userId}_${streakData.streakType}`, JSON.stringify(streakData));
    await cacheService.delete(`${this.CACHE_KEYS.STREAK_DATA}${streakData.userId}_${streakData.streakType}`);
  }

  private async saveMilestones(userId: string, milestones: Milestone[]): Promise<void> {
    await storage.setItem(`milestones_${userId}`, JSON.stringify(milestones));
    await cacheService.delete(`${this.CACHE_KEYS.MILESTONES}${userId}`);
  }

  private async saveAchievements(userId: string, achievements: Achievement[]): Promise<void> {
    await storage.setItem(`achievements_${userId}`, JSON.stringify(achievements));
    await cacheService.delete(`${this.CACHE_KEYS.ACHIEVEMENTS}${userId}`);
  }

  private async saveInsights(userId: string, insights: ProgressInsight[]): Promise<void> {
    await storage.setItem(`insights_${userId}`, JSON.stringify(insights));
    await cacheService.delete(`${this.CACHE_KEYS.INSIGHTS}${userId}`);
  }
}

export const progressTrackingService = new ProgressTrackingService();