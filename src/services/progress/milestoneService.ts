import { 
  Milestone, 
  MilestoneType, 
  MilestoneReward, 
  UserProgress, 
  HealthCategory,
  Achievement
} from '../../types/progress';
import { kiroAIService } from '../ai/kiroAIService';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';
import { notificationService } from '../notification/notificationService';
import { analyticsService } from '../analytics/analyticsService';

class MilestoneService {
  private readonly CACHE_KEY = 'milestones_';
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private readonly MILESTONE_TEMPLATES = {
    streak: [
      { days: 3, title: 'Getting Started', difficulty: 'easy' as const },
      { days: 7, title: 'Week Warrior', difficulty: 'easy' as const },
      { days: 14, title: 'Two Week Champion', difficulty: 'medium' as const },
      { days: 30, title: 'Monthly Master', difficulty: 'medium' as const },
      { days: 60, title: 'Consistency King', difficulty: 'hard' as const },
      { days: 100, title: 'Century Achiever', difficulty: 'hard' as const },
      { days: 365, title: 'Year-Long Legend', difficulty: 'expert' as const }
    ],
    completion: [
      { count: 5, title: 'First Steps', difficulty: 'easy' as const },
      { count: 25, title: 'Quarter Century', difficulty: 'easy' as const },
      { count: 50, title: 'Half Century', difficulty: 'medium' as const },
      { count: 100, title: 'Centurion', difficulty: 'medium' as const },
      { count: 250, title: 'Knowledge Seeker', difficulty: 'hard' as const },
      { count: 500, title: 'Wisdom Collector', difficulty: 'hard' as const },
      { count: 1000, title: 'Master of Health', difficulty: 'expert' as const }
    ],
    engagement: [
      { minutes: 30, title: 'Time Investor', difficulty: 'easy' as const },
      { minutes: 120, title: 'Dedicated Learner', difficulty: 'easy' as const },
      { minutes: 300, title: 'Knowledge Enthusiast', difficulty: 'medium' as const },
      { minutes: 600, title: 'Study Champion', difficulty: 'medium' as const },
      { minutes: 1200, title: 'Learning Master', difficulty: 'hard' as const },
      { minutes: 2400, title: 'Time Devotee', difficulty: 'hard' as const },
      { minutes: 5000, title: 'Lifetime Learner', difficulty: 'expert' as const }
    ]
  };

  private readonly REWARD_TYPES = {
    easy: ['badge', 'customization'],
    medium: ['badge', 'streak_freeze', 'customization'],
    hard: ['badge', 'streak_freeze', 'premium_content'],
    expert: ['badge', 'streak_freeze', 'premium_content', 'customization']
  };

  /**
   * Generate personalized milestones for a user
   */
  async generatePersonalizedMilestones(userId: string, userProgress: UserProgress): Promise<Milestone[]> {
    try {
      const existingMilestones = await this.getUserMilestones(userId);
      const activeMilestones = existingMilestones.filter(m => !m.isCompleted);
      
      // Don't generate too many active milestones at once
      if (activeMilestones.length >= 5) {
        return existingMilestones;
      }

      const newMilestones: Milestone[] = [];

      // Generate streak milestones
      const streakMilestones = await this.generateStreakMilestones(userId, userProgress);
      newMilestones.push(...streakMilestones);

      // Generate completion milestones
      const completionMilestones = await this.generateCompletionMilestones(userId, userProgress);
      newMilestones.push(...completionMilestones);

      // Generate engagement milestones
      const engagementMilestones = await this.generateEngagementMilestones(userId, userProgress);
      newMilestones.push(...engagementMilestones);

      // Generate category-specific milestones
      const categoryMilestones = await this.generateCategoryMilestones(userId, userProgress);
      newMilestones.push(...categoryMilestones);

      // Generate AI-powered personalized milestones
      const aiMilestones = await this.generateAIMilestones(userId, userProgress);
      newMilestones.push(...aiMilestones);

      // Filter out duplicates and already existing milestones
      const uniqueNewMilestones = this.filterUniqueMilestones(newMilestones, existingMilestones);

      // Combine with existing milestones
      const allMilestones = [...existingMilestones, ...uniqueNewMilestones];

      await this.saveMilestones(userId, allMilestones);
      return allMilestones;

    } catch (error) {
      console.error('Error generating personalized milestones:', error);
      throw new Error('Failed to generate personalized milestones');
    }
  }

  /**
   * Check and update milestone progress
   */
  async updateMilestoneProgress(userId: string, userProgress: UserProgress): Promise<Milestone[]> {
    try {
      const milestones = await this.getUserMilestones(userId);
      const completedMilestones: Milestone[] = [];

      for (const milestone of milestones) {
        if (milestone.isCompleted) continue;

        const previousValue = milestone.currentValue;
        milestone.currentValue = this.calculateCurrentValue(milestone, userProgress);

        // Check if milestone is completed
        if (milestone.currentValue >= milestone.targetValue) {
          milestone.isCompleted = true;
          milestone.completedAt = new Date();
          completedMilestones.push(milestone);

          // Celebrate milestone completion
          await this.celebrateMilestone(userId, milestone);

          // Award rewards
          await this.awardMilestoneReward(userId, milestone);
        }

        // Track progress analytics
        if (milestone.currentValue !== previousValue) {
          analyticsService.trackEvent('milestone_progress', {
            userId,
            milestoneId: milestone.id,
            milestoneType: milestone.type,
            previousValue,
            currentValue: milestone.currentValue,
            targetValue: milestone.targetValue,
            progressPercentage: (milestone.currentValue / milestone.targetValue) * 100
          });
        }
      }

      await this.saveMilestones(userId, milestones);
      return completedMilestones;

    } catch (error) {
      console.error('Error updating milestone progress:', error);
      throw new Error('Failed to update milestone progress');
    }
  }

  /**
   * Get user milestones with filtering options
   */
  async getUserMilestones(
    userId: string, 
    options: {
      includeCompleted?: boolean;
      category?: HealthCategory;
      type?: MilestoneType;
      difficulty?: string;
    } = {}
  ): Promise<Milestone[]> {
    try {
      const cacheKey = `${this.CACHE_KEY}${userId}`;
      let milestones = await cacheService.get<Milestone[]>(cacheKey);

      if (!milestones) {
        const stored = await storage.getItem(`milestones_${userId}`);
        milestones = stored ? JSON.parse(stored) : [];
        await cacheService.set(cacheKey, milestones, this.CACHE_TTL);
      }

      // Apply filters
      let filteredMilestones = milestones;

      if (!options.includeCompleted) {
        filteredMilestones = filteredMilestones.filter(m => !m.isCompleted);
      }

      if (options.category) {
        filteredMilestones = filteredMilestones.filter(m => m.category === options.category);
      }

      if (options.type) {
        filteredMilestones = filteredMilestones.filter(m => m.type === options.type);
      }

      if (options.difficulty) {
        filteredMilestones = filteredMilestones.filter(m => m.difficulty === options.difficulty);
      }

      return filteredMilestones;

    } catch (error) {
      console.error('Error getting user milestones:', error);
      throw new Error('Failed to get user milestones');
    }
  }

  /**
   * Create custom milestone
   */
  async createCustomMilestone(userId: string, milestoneData: Partial<Milestone>): Promise<Milestone> {
    try {
      const milestone: Milestone = {
        id: `milestone_${userId}_custom_${Date.now()}`,
        userId,
        type: milestoneData.type || 'completion',
        title: milestoneData.title || 'Custom Goal',
        description: milestoneData.description || 'Your personal milestone',
        targetValue: milestoneData.targetValue || 1,
        currentValue: 0,
        isCompleted: false,
        category: milestoneData.category,
        difficulty: milestoneData.difficulty || 'medium',
        reward: milestoneData.reward || this.generateReward('medium'),
        aiGenerated: false,
        personalizedMessage: milestoneData.personalizedMessage,
        celebrationShown: false,
        createdAt: new Date(),
        expiresAt: milestoneData.expiresAt
      };

      const existingMilestones = await this.getUserMilestones(userId, { includeCompleted: true });
      existingMilestones.push(milestone);
      await this.saveMilestones(userId, existingMilestones);

      return milestone;

    } catch (error) {
      console.error('Error creating custom milestone:', error);
      throw new Error('Failed to create custom milestone');
    }
  }

  /**
   * Get milestone recommendations
   */
  async getMilestoneRecommendations(userId: string, userProgress: UserProgress): Promise<{
    recommended: Milestone[];
    reasoning: string[];
    aiInsights: string[];
  }> {
    try {
      // Analyze user progress patterns
      const progressAnalysis = this.analyzeProgressPatterns(userProgress);
      
      // Generate AI-powered recommendations
      const aiRecommendations = await this.getAIMilestoneRecommendations(userId, userProgress, progressAnalysis);
      
      // Generate template-based recommendations
      const templateRecommendations = this.getTemplateMilestoneRecommendations(userProgress, progressAnalysis);
      
      // Combine and rank recommendations
      const allRecommendations = [...aiRecommendations.milestones, ...templateRecommendations];
      const rankedRecommendations = this.rankMilestoneRecommendations(allRecommendations, progressAnalysis);

      return {
        recommended: rankedRecommendations.slice(0, 3), // Top 3 recommendations
        reasoning: this.generateRecommendationReasoning(rankedRecommendations, progressAnalysis),
        aiInsights: aiRecommendations.insights
      };

    } catch (error) {
      console.error('Error getting milestone recommendations:', error);
      throw new Error('Failed to get milestone recommendations');
    }
  }

  /**
   * Private helper methods
   */
  private async generateStreakMilestones(userId: string, userProgress: UserProgress): Promise<Milestone[]> {
    const milestones: Milestone[] = [];
    const currentStreak = userProgress.currentStreak;

    for (const template of this.MILESTONE_TEMPLATES.streak) {
      if (template.days > currentStreak && template.days <= currentStreak + 30) {
        const milestone: Milestone = {
          id: `milestone_${userId}_streak_${template.days}`,
          userId,
          type: 'streak',
          title: template.title,
          description: `Maintain a ${template.days}-day streak`,
          targetValue: template.days,
          currentValue: currentStreak,
          isCompleted: false,
          difficulty: template.difficulty,
          reward: this.generateReward(template.difficulty),
          aiGenerated: false,
          celebrationShown: false,
          createdAt: new Date()
        };

        milestones.push(milestone);
      }
    }

    return milestones;
  }

  private async generateCompletionMilestones(userId: string, userProgress: UserProgress): Promise<Milestone[]> {
    const milestones: Milestone[] = [];
    const currentCount = userProgress.totalTipsCompleted;

    for (const template of this.MILESTONE_TEMPLATES.completion) {
      if (template.count > currentCount && template.count <= currentCount + 50) {
        const milestone: Milestone = {
          id: `milestone_${userId}_completion_${template.count}`,
          userId,
          type: 'completion',
          title: template.title,
          description: `Complete ${template.count} health tips`,
          targetValue: template.count,
          currentValue: currentCount,
          isCompleted: false,
          difficulty: template.difficulty,
          reward: this.generateReward(template.difficulty),
          aiGenerated: false,
          celebrationShown: false,
          createdAt: new Date()
        };

        milestones.push(milestone);
      }
    }

    return milestones;
  }

  private async generateEngagementMilestones(userId: string, userProgress: UserProgress): Promise<Milestone[]> {
    const milestones: Milestone[] = [];
    const currentTime = userProgress.totalEngagementTime;

    for (const template of this.MILESTONE_TEMPLATES.engagement) {
      if (template.minutes > currentTime && template.minutes <= currentTime + 300) {
        const milestone: Milestone = {
          id: `milestone_${userId}_engagement_${template.minutes}`,
          userId,
          type: 'engagement',
          title: template.title,
          description: `Spend ${template.minutes} minutes learning`,
          targetValue: template.minutes,
          currentValue: currentTime,
          isCompleted: false,
          difficulty: template.difficulty,
          reward: this.generateReward(template.difficulty),
          aiGenerated: false,
          celebrationShown: false,
          createdAt: new Date()
        };

        milestones.push(milestone);
      }
    }

    return milestones;
  }

  private async generateCategoryMilestones(userId: string, userProgress: UserProgress): Promise<Milestone[]> {
    const milestones: Milestone[] = [];

    for (const categoryProgress of userProgress.categoryProgress) {
      if (categoryProgress.completedTips >= 5 && categoryProgress.completedTips < 20) {
        const milestone: Milestone = {
          id: `milestone_${userId}_category_${categoryProgress.category}_20`,
          userId,
          type: 'category',
          title: `${this.formatCategoryName(categoryProgress.category)} Explorer`,
          description: `Complete 20 tips in ${this.formatCategoryName(categoryProgress.category)}`,
          targetValue: 20,
          currentValue: categoryProgress.completedTips,
          isCompleted: false,
          category: categoryProgress.category,
          difficulty: 'medium',
          reward: this.generateReward('medium'),
          aiGenerated: false,
          celebrationShown: false,
          createdAt: new Date()
        };

        milestones.push(milestone);
      }
    }

    return milestones;
  }

  private async generateAIMilestones(userId: string, userProgress: UserProgress): Promise<Milestone[]> {
    try {
      const aiPrompt = `
        Generate 2-3 personalized milestones for a user with:
        - Current streak: ${userProgress.currentStreak} days
        - Total tips completed: ${userProgress.totalTipsCompleted}
        - Total engagement time: ${userProgress.totalEngagementTime} minutes
        - Category progress: ${JSON.stringify(userProgress.categoryProgress)}
        
        Create unique, motivating milestones that are challenging but achievable.
      `;

      const aiResponse = await kiroAIService.generateInsights(aiPrompt, {
        userId,
        userProgress: {
          currentStreak: userProgress.currentStreak,
          totalTipsCompleted: userProgress.totalTipsCompleted,
          totalEngagementTime: userProgress.totalEngagementTime,
          categoryProgress: userProgress.categoryProgress
        }
      });

      const aiMilestones: Milestone[] = [];

      if (aiResponse.milestones && Array.isArray(aiResponse.milestones)) {
        for (const aiMilestone of aiResponse.milestones) {
          const milestone: Milestone = {
            id: `milestone_${userId}_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            type: aiMilestone.type || 'completion',
            title: aiMilestone.title || 'AI Generated Goal',
            description: aiMilestone.description || 'Personalized milestone for you',
            targetValue: aiMilestone.targetValue || 1,
            currentValue: this.calculateCurrentValueForType(aiMilestone.type, userProgress),
            isCompleted: false,
            category: aiMilestone.category,
            difficulty: aiMilestone.difficulty || 'medium',
            reward: this.generateReward(aiMilestone.difficulty || 'medium'),
            aiGenerated: true,
            personalizedMessage: aiMilestone.personalizedMessage,
            celebrationShown: false,
            createdAt: new Date(),
            expiresAt: aiMilestone.expiresAt ? new Date(aiMilestone.expiresAt) : undefined
          };

          aiMilestones.push(milestone);
        }
      }

      return aiMilestones;

    } catch (error) {
      console.error('Error generating AI milestones:', error);
      return [];
    }
  }

  private calculateCurrentValue(milestone: Milestone, userProgress: UserProgress): number {
    switch (milestone.type) {
      case 'streak':
        return userProgress.currentStreak;
      case 'completion':
        return userProgress.totalTipsCompleted;
      case 'engagement':
        return userProgress.totalEngagementTime;
      case 'category':
        if (milestone.category) {
          const categoryProgress = userProgress.categoryProgress.find(cp => cp.category === milestone.category);
          return categoryProgress ? categoryProgress.completedTips : 0;
        }
        return 0;
      case 'time':
        return userProgress.totalEngagementTime;
      case 'quality':
        // This would require more complex calculation based on engagement quality
        return Math.floor(userProgress.totalTipsCompleted * 0.8); // Simplified
      default:
        return 0;
    }
  }

  private calculateCurrentValueForType(type: string, userProgress: UserProgress): number {
    switch (type) {
      case 'streak':
        return userProgress.currentStreak;
      case 'completion':
        return userProgress.totalTipsCompleted;
      case 'engagement':
      case 'time':
        return userProgress.totalEngagementTime;
      default:
        return 0;
    }
  }

  private generateReward(difficulty: string): MilestoneReward {
    const rewardTypes = this.REWARD_TYPES[difficulty as keyof typeof this.REWARD_TYPES] || this.REWARD_TYPES.medium;
    const randomType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];

    switch (randomType) {
      case 'badge':
        return {
          type: 'badge',
          value: `${difficulty}_milestone_${Date.now()}`,
          description: `Earned a ${difficulty} milestone badge!`,
          imageUrl: `/badges/${difficulty}_milestone.png`
        };
      case 'streak_freeze':
        return {
          type: 'streak_freeze',
          value: difficulty === 'expert' ? 3 : difficulty === 'hard' ? 2 : 1,
          description: `Earned ${difficulty === 'expert' ? 3 : difficulty === 'hard' ? 2 : 1} streak freeze(s)!`
        };
      case 'premium_content':
        return {
          type: 'premium_content',
          value: 'premium_tips_access',
          description: 'Unlocked access to premium health tips!'
        };
      case 'customization':
        return {
          type: 'customization',
          value: 'theme_unlock',
          description: 'Unlocked new app theme customization!'
        };
      default:
        return {
          type: 'badge',
          value: 'default_milestone',
          description: 'Milestone completed!'
        };
    }
  }

  private filterUniqueMilestones(newMilestones: Milestone[], existingMilestones: Milestone[]): Milestone[] {
    const existingKeys = new Set(existingMilestones.map(m => `${m.type}_${m.targetValue}_${m.category || 'none'}`));
    
    return newMilestones.filter(milestone => {
      const key = `${milestone.type}_${milestone.targetValue}_${milestone.category || 'none'}`;
      return !existingKeys.has(key);
    });
  }

  private async celebrateMilestone(userId: string, milestone: Milestone): Promise<void> {
    try {
      // Send celebration notification
      await notificationService.scheduleNotification({
        type: 'milestone',
        title: '🎉 Milestone Achieved!',
        message: `Congratulations! You've completed: ${milestone.title}`,
        data: { 
          userId, 
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          reward: milestone.reward
        },
        priority: 'high',
        userId
      });

      // Track milestone completion
      analyticsService.trackEvent('milestone_completed', {
        userId,
        milestoneId: milestone.id,
        milestoneType: milestone.type,
        milestoneTitle: milestone.title,
        difficulty: milestone.difficulty,
        targetValue: milestone.targetValue,
        aiGenerated: milestone.aiGenerated,
        completionTime: new Date().toISOString()
      });

      milestone.celebrationShown = true;

    } catch (error) {
      console.error('Error celebrating milestone:', error);
    }
  }

  private async awardMilestoneReward(userId: string, milestone: Milestone): Promise<void> {
    try {
      const reward = milestone.reward;

      switch (reward.type) {
        case 'badge':
          await this.awardBadge(userId, reward.value as string, milestone.title);
          break;
        case 'streak_freeze':
          await this.awardStreakFreeze(userId, reward.value as number);
          break;
        case 'premium_content':
          await this.unlockPremiumContent(userId, reward.value as string);
          break;
        case 'customization':
          await this.unlockCustomization(userId, reward.value as string);
          break;
      }

      // Send reward notification
      await notificationService.scheduleNotification({
        type: 'milestone',
        title: '🎁 Reward Unlocked!',
        message: reward.description,
        data: { 
          userId, 
          rewardType: reward.type,
          rewardValue: reward.value
        },
        priority: 'medium',
        userId
      });

    } catch (error) {
      console.error('Error awarding milestone reward:', error);
    }
  }

  private async awardBadge(userId: string, badgeId: string, milestoneTitle: string): Promise<void> {
    try {
      // This would integrate with the achievement system
      const achievement: Achievement = {
        id: `achievement_${userId}_${badgeId}_${Date.now()}`,
        userId,
        badgeId,
        title: `Milestone: ${milestoneTitle}`,
        description: `Earned by completing the ${milestoneTitle} milestone`,
        category: 'general',
        rarity: 'common',
        unlockedAt: new Date(),
        progress: 100,
        maxProgress: 100,
        isVisible: true,
        imageUrl: `/badges/${badgeId}.png`
      };

      // Save achievement (this would use the achievement service)
      const existingAchievements = await storage.getItem(`achievements_${userId}`);
      const achievements: Achievement[] = existingAchievements ? JSON.parse(existingAchievements) : [];
      achievements.push(achievement);
      await storage.setItem(`achievements_${userId}`, JSON.stringify(achievements));

    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  }

  private async awardStreakFreeze(userId: string, count: number): Promise<void> {
    try {
      // This would integrate with the progress tracking service
      const progressData = await storage.getItem(`progress_${userId}`);
      if (progressData) {
        const progress = JSON.parse(progressData);
        progress.streakFreezeRemaining += count;
        await storage.setItem(`progress_${userId}`, JSON.stringify(progress));
      }
    } catch (error) {
      console.error('Error awarding streak freeze:', error);
    }
  }

  private async unlockPremiumContent(userId: string, contentType: string): Promise<void> {
    try {
      // This would integrate with the content management system
      const userPreferences = await storage.getItem(`preferences_${userId}`);
      const preferences = userPreferences ? JSON.parse(userPreferences) : {};
      
      if (!preferences.unlockedContent) {
        preferences.unlockedContent = [];
      }
      
      if (!preferences.unlockedContent.includes(contentType)) {
        preferences.unlockedContent.push(contentType);
        await storage.setItem(`preferences_${userId}`, JSON.stringify(preferences));
      }
    } catch (error) {
      console.error('Error unlocking premium content:', error);
    }
  }

  private async unlockCustomization(userId: string, customizationType: string): Promise<void> {
    try {
      // This would integrate with the customization system
      const userCustomizations = await storage.getItem(`customizations_${userId}`);
      const customizations = userCustomizations ? JSON.parse(userCustomizations) : {};
      
      if (!customizations.unlocked) {
        customizations.unlocked = [];
      }
      
      if (!customizations.unlocked.includes(customizationType)) {
        customizations.unlocked.push(customizationType);
        await storage.setItem(`customizations_${userId}`, JSON.stringify(customizations));
      }
    } catch (error) {
      console.error('Error unlocking customization:', error);
    }
  }

  private formatCategoryName(category: HealthCategory): string {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private analyzeProgressPatterns(userProgress: UserProgress): any {
    return {
      streakConsistency: userProgress.currentStreak / Math.max(userProgress.longestStreak, 1),
      completionRate: userProgress.totalTipsCompleted / Math.max(1, Math.floor((new Date().getTime() - new Date(userProgress.createdAt).getTime()) / (1000 * 60 * 60 * 24))),
      engagementDepth: userProgress.totalEngagementTime / Math.max(userProgress.totalTipsCompleted, 1),
      categoryDiversity: userProgress.categoryProgress.filter(cp => cp.completedTips > 0).length,
      strongestCategory: userProgress.categoryProgress.reduce((max, cp) => 
        cp.completedTips > max.completedTips ? cp : max
      ),
      weakestCategory: userProgress.categoryProgress.reduce((min, cp) => 
        cp.completedTips < min.completedTips ? cp : min
      )
    };
  }

  private async getAIMilestoneRecommendations(userId: string, userProgress: UserProgress, analysis: any): Promise<{
    milestones: any[];
    insights: string[];
  }> {
    try {
      const recommendationPrompt = `
        Recommend personalized milestones for a user with:
        - Streak consistency: ${analysis.streakConsistency}
        - Completion rate: ${analysis.completionRate}
        - Engagement depth: ${analysis.engagementDepth}
        - Category diversity: ${analysis.categoryDiversity}
        - Strongest category: ${analysis.strongestCategory.category}
        - Weakest category: ${analysis.weakestCategory.category}
        
        Provide 2-3 milestone recommendations with insights.
      `;

      const aiResponse = await kiroAIService.generateInsights(recommendationPrompt, {
        userId,
        analysis,
        userProgress: {
          currentStreak: userProgress.currentStreak,
          totalTipsCompleted: userProgress.totalTipsCompleted,
          totalEngagementTime: userProgress.totalEngagementTime
        }
      });

      return {
        milestones: aiResponse.milestones || [],
        insights: aiResponse.insights || []
      };

    } catch (error) {
      console.error('Error getting AI milestone recommendations:', error);
      return { milestones: [], insights: [] };
    }
  }

  private getTemplateMilestoneRecommendations(userProgress: UserProgress, analysis: any): Milestone[] {
    const recommendations: Milestone[] = [];

    // Recommend based on current progress
    if (analysis.streakConsistency < 0.7 && userProgress.currentStreak < 14) {
      recommendations.push({
        id: `rec_streak_consistency_${Date.now()}`,
        userId: userProgress.userId,
        type: 'streak',
        title: 'Consistency Builder',
        description: 'Build a steady 10-day streak',
        targetValue: 10,
        currentValue: userProgress.currentStreak,
        isCompleted: false,
        difficulty: 'medium',
        reward: this.generateReward('medium'),
        aiGenerated: false,
        celebrationShown: false,
        createdAt: new Date()
      });
    }

    // Recommend category exploration
    if (analysis.categoryDiversity < 4) {
      recommendations.push({
        id: `rec_category_diversity_${Date.now()}`,
        userId: userProgress.userId,
        type: 'category',
        title: 'Category Explorer',
        description: `Try 5 tips in ${this.formatCategoryName(analysis.weakestCategory.category)}`,
        targetValue: 5,
        currentValue: analysis.weakestCategory.completedTips,
        isCompleted: false,
        category: analysis.weakestCategory.category,
        difficulty: 'easy',
        reward: this.generateReward('easy'),
        aiGenerated: false,
        celebrationShown: false,
        createdAt: new Date()
      });
    }

    return recommendations;
  }

  private rankMilestoneRecommendations(recommendations: Milestone[], analysis: any): Milestone[] {
    return recommendations.sort((a, b) => {
      // Prioritize based on user's current patterns and needs
      let scoreA = 0;
      let scoreB = 0;

      // Prefer milestones that address weaknesses
      if (a.type === 'streak' && analysis.streakConsistency < 0.7) scoreA += 3;
      if (b.type === 'streak' && analysis.streakConsistency < 0.7) scoreB += 3;

      if (a.type === 'category' && analysis.categoryDiversity < 4) scoreA += 2;
      if (b.type === 'category' && analysis.categoryDiversity < 4) scoreB += 2;

      // Prefer achievable milestones
      const progressA = a.currentValue / a.targetValue;
      const progressB = b.currentValue / b.targetValue;

      if (progressA > 0.5) scoreA += 2;
      if (progressB > 0.5) scoreB += 2;

      // Prefer AI-generated milestones for personalization
      if (a.aiGenerated) scoreA += 1;
      if (b.aiGenerated) scoreB += 1;

      return scoreB - scoreA;
    });
  }

  private generateRecommendationReasoning(recommendations: Milestone[], analysis: any): string[] {
    const reasoning = [];

    for (const rec of recommendations.slice(0, 3)) {
      switch (rec.type) {
        case 'streak':
          reasoning.push(`Building streak consistency will help establish a sustainable habit`);
          break;
        case 'category':
          reasoning.push(`Exploring ${rec.category} will broaden your health knowledge`);
          break;
        case 'completion':
          reasoning.push(`Reaching this completion milestone will boost your confidence`);
          break;
        case 'engagement':
          reasoning.push(`Deeper engagement will improve your learning outcomes`);
          break;
      }
    }

    return reasoning;
  }

  private async saveMilestones(userId: string, milestones: Milestone[]): Promise<void> {
    await storage.setItem(`milestones_${userId}`, JSON.stringify(milestones));
    await cacheService.delete(`${this.CACHE_KEY}${userId}`);
  }
}

export const milestoneService = new MilestoneService();