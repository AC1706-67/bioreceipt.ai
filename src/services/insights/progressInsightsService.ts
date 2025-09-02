/**
 * Progress Insights Service
 * AI-powered progress analysis and personalized recommendations
 */
import { AnalyticsService } from '../analytics/analyticsService';
import { MultiProviderAIService } from '../ai/MultiProviderAIService';
import { UserProfile } from '../../models/UserProfile';
import { HealthTip } from '../../models/HealthTip';
import { AuditLogService } from '../compliance/auditLogService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Progress Insight Types
export interface ProgressInsight {
  id: string;
  userId: string;
  type: 'achievement' | 'trend' | 'recommendation' | 'milestone' | 'warning' | 'celebration';
  title: string;
  description: string;
  aiGenerated: boolean;
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'engagement' | 'learning' | 'behavior' | 'health' | 'social' | 'motivation';
  timestamp: Date;
  expiresAt?: Date;
  metadata: {
    dataPoints: Record<string, any>;
    recommendations: string[];
    actionItems: ActionItem[];
    relatedTips: string[];
    visualizations?: VisualizationData[];
  };
  userFeedback?: {
    helpful: boolean;
    rating: number; // 1-5
    comment?: string;
    timestamp: Date;
  };
}

// Action Item Interface
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  type: 'immediate' | 'short_term' | 'long_term';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  completed: boolean;
  completedAt?: Date;
}

// Visualization Data Interface
export interface VisualizationData {
  type: 'line_chart' | 'bar_chart' | 'pie_chart' | 'progress_bar' | 'heatmap';
  title: string;
  data: any[];
  config: Record<string, any>;
}

// Progress Metrics Interface
export interface ProgressMetrics {
  userId: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly';
  metrics: {
    engagement: {
      tipsViewed: number;
      tipsCompleted: number;
      streakDays: number;
      averageSessionTime: number;
      completionRate: number;
    };
    learning: {
      categoriesExplored: number;
      knowledgeRetention: number;
      skillProgression: number;
      conceptsMastered: string[];
    };
    behavior: {
      habitsFormed: number;
      consistencyScore: number;
      improvementAreas: string[];
      positiveChanges: string[];
    };
    social: {
      sharesCount: number;
      communityEngagement: number;
      helpfulnessRating: number;
    };
  };
  trends: {
    direction: 'improving' | 'stable' | 'declining';
    velocity: number; // rate of change
    predictions: Record<string, number>;
  };
  timestamp: Date;
}

// AI Analysis Context
export interface AIAnalysisContext {
  userProfile: UserProfile;
  progressMetrics: ProgressMetrics;
  recentActivity: any[];
  historicalData: any[];
  preferences: Record<string, any>;
  goals: string[];
  challenges: string[];
}

export class ProgressInsightsService {
  private static instance: ProgressInsightsService;
  private analyticsService: AnalyticsService;
  private aiService: MultiProviderAIService;
  private auditLogService: AuditLogService;
  private insightsCache: Map<string, ProgressInsight[]> = new Map();
  private metricsCache: Map<string, ProgressMetrics> = new Map();

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.aiService = MultiProviderAIService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
  }

  public static getInstance(): ProgressInsightsService {
    if (!ProgressInsightsService.instance) {
      ProgressInsightsService.instance = new ProgressInsightsService();
    }
    return ProgressInsightsService.instance;
  }

  /**
   * Generate comprehensive progress insights for a user
   */
  public async generateProgressInsights(
    userId: string,
    userProfile: UserProfile,
    timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<ProgressInsight[]> {
    try {
      // Get progress metrics
      const metrics = await this.calculateProgressMetrics(userId, timeframe);
      
      // Build AI analysis context
      const context = await this.buildAnalysisContext(userId, userProfile, metrics);
      
      // Generate AI-powered insights
      const aiInsights = await this.generateAIInsights(context);
      
      // Generate rule-based insights
      const ruleBasedInsights = await this.generateRuleBasedInsights(context);
      
      // Combine and prioritize insights
      const allInsights = [...aiInsights, ...ruleBasedInsights];
      const prioritizedInsights = this.prioritizeInsights(allInsights);
      
      // Cache insights
      this.insightsCache.set(userId, prioritizedInsights);
      await this.saveInsightsToStorage(userId, prioritizedInsights);
      
      // Log insight generation
      await this.auditLogService.logDataAccess({
        userId,
        action: 'PROGRESS_INSIGHTS_GENERATED',
        resourceType: 'PROGRESS_INSIGHTS',
        resourceId: `insights_${userId}`,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          insightCount: prioritizedInsights.length,
          timeframe,
          aiGenerated: aiInsights.length,
          ruleBasedGenerated: ruleBasedInsights.length
        }
      });

      return prioritizedInsights;
    } catch (error) {
      console.error('Failed to generate progress insights:', error);
      throw error;
    }
  }

  /**
   * Calculate detailed progress metrics
   */
  public async calculateProgressMetrics(
    userId: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Promise<ProgressMetrics> {
    try {
      // Check cache first
      const cacheKey = `${userId}_${timeframe}`;
      if (this.metricsCache.has(cacheKey)) {
        return this.metricsCache.get(cacheKey)!;
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeframe) {
        case 'daily':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Get analytics data
      const engagementMetrics = await this.analyticsService.getEngagementMetrics(startDate, endDate);
      const contentPerformance = await this.analyticsService.getContentPerformance(startDate, endDate);
      const userBehavior = await this.analyticsService.getUserBehaviorAnalytics(startDate, endDate);

      // Calculate comprehensive metrics
      const metrics: ProgressMetrics = {
        userId,
        timeframe,
        metrics: {
          engagement: {
            tipsViewed: engagementMetrics.tipViews,
            tipsCompleted: engagementMetrics.tipCompletions,
            streakDays: this.calculateStreakDays(userId, startDate, endDate),
            averageSessionTime: userBehavior.averageSessionDuration / 1000 / 60, // Convert to minutes
            completionRate: engagementMetrics.tipViews > 0 ? 
              (engagementMetrics.tipCompletions / engagementMetrics.tipViews) * 100 : 0
          },
          learning: {
            categoriesExplored: this.calculateCategoriesExplored(contentPerformance),
            knowledgeRetention: await this.calculateKnowledgeRetention(userId, startDate, endDate),
            skillProgression: await this.calculateSkillProgression(userId, startDate, endDate),
            conceptsMastered: await this.getConceptsMastered(userId, startDate, endDate)
          },
          behavior: {
            habitsFormed: await this.calculateHabitsFormed(userId, startDate, endDate),
            consistencyScore: await this.calculateConsistencyScore(userId, startDate, endDate),
            improvementAreas: await this.identifyImprovementAreas(userId, startDate, endDate),
            positiveChanges: await this.identifyPositiveChanges(userId, startDate, endDate)
          },
          social: {
            sharesCount: engagementMetrics.tipShares,
            communityEngagement: await this.calculateCommunityEngagement(userId, startDate, endDate),
            helpfulnessRating: await this.calculateHelpfulnessRating(userId, startDate, endDate)
          }
        },
        trends: {
          direction: this.calculateTrendDirection(engagementMetrics, userBehavior),
          velocity: this.calculateTrendVelocity(userId, timeframe),
          predictions: await this.generatePredictions(userId, timeframe)
        },
        timestamp: new Date()
      };

      // Cache metrics
      this.metricsCache.set(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to calculate progress metrics:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered insights using multiple AI providers
   */
  private async generateAIInsights(context: AIAnalysisContext): Promise<ProgressInsight[]> {
    try {
      const insights: ProgressInsight[] = [];

      // Prepare AI prompt
      const prompt = this.buildAIPrompt(context);

      // Get AI analysis
      const aiResponse = await this.aiService.generateText(prompt, {
        maxTokens: 1000,
        temperature: 0.7,
        model: 'gpt-4'
      });

      if (aiResponse.success && aiResponse.text) {
        // Parse AI response into structured insights
        const parsedInsights = this.parseAIResponse(aiResponse.text, context);
        insights.push(...parsedInsights);
      }

      // Generate specific AI insights for different categories
      const categoryInsights = await Promise.all([
        this.generateEngagementInsights(context),
        this.generateLearningInsights(context),
        this.generateBehaviorInsights(context),
        this.generateMotivationInsights(context)
      ]);

      insights.push(...categoryInsights.flat());
      return insights;
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return [];
    }
  }

  /**
   * Generate rule-based insights using predefined logic
   */
  private async generateRuleBasedInsights(context: AIAnalysisContext): Promise<ProgressInsight[]> {
    const insights: ProgressInsight[] = [];

    try {
      // Achievement insights
      if (context.progressMetrics.metrics.engagement.streakDays >= 7) {
        insights.push({
          id: this.generateInsightId(),
          userId: context.userProfile.id,
          type: 'achievement',
          title: '🔥 Week-long Streak!',
          description: `Congratulations! You've maintained a ${context.progressMetrics.metrics.engagement.streakDays}-day learning streak. This shows incredible dedication to your health journey.`,
          aiGenerated: false,
          confidence: 1.0,
          priority: 'high',
          category: 'motivation',
          timestamp: new Date(),
          metadata: {
            dataPoints: { streakDays: context.progressMetrics.metrics.engagement.streakDays },
            recommendations: [
              'Keep up the momentum by setting a daily reminder',
              'Share your achievement with friends for extra motivation',
              'Reward yourself for this milestone'
            ],
            actionItems: [
              {
                id: this.generateActionId(),
                title: 'Set Daily Learning Reminder',
                description: 'Configure a daily notification to maintain your streak',
                type: 'immediate',
                difficulty: 'easy',
                estimatedTime: 2,
                completed: false
              }
            ],
            relatedTips: []
          }
        });
      }

      // Warning insights
      if (context.progressMetrics.metrics.engagement.completionRate < 30) {
        insights.push({
          id: this.generateInsightId(),
          userId: context.userProfile.id,
          type: 'warning',
          title: '⚠️ Low Completion Rate',
          description: `Your tip completion rate is ${context.progressMetrics.metrics.engagement.completionRate.toFixed(1)}%. This might indicate that the content isn't matching your preferences or schedule.`,
          aiGenerated: false,
          confidence: 0.8,
          priority: 'high',
          category: 'engagement',
          timestamp: new Date(),
          metadata: {
            dataPoints: { completionRate: context.progressMetrics.metrics.engagement.completionRate },
            recommendations: [
              'Try shorter, easier tips to build momentum',
              'Adjust your learning schedule to better fit your routine',
              'Focus on topics that interest you most'
            ],
            actionItems: [
              {
                id: this.generateActionId(),
                title: 'Review Content Preferences',
                description: 'Update your preferences to get more relevant content',
                type: 'immediate',
                difficulty: 'easy',
                estimatedTime: 5,
                completed: false
              }
            ],
            relatedTips: []
          }
        });
      }

      return insights;
    } catch (error) {
      console.error('Failed to generate rule-based insights:', error);
      return insights;
    }
  }

  /**
   * Build AI analysis context
   */
  private async buildAnalysisContext(
    userId: string,
    userProfile: UserProfile,
    metrics: ProgressMetrics
  ): Promise<AIAnalysisContext> {
    try {
      // Get recent activity data
      const recentActivity = await this.getRecentActivity(userId);
      
      // Get historical data for comparison
      const historicalData = await this.getHistoricalData(userId);
      
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get user goals and challenges
      const goals = await this.getUserGoals(userId);
      const challenges = await this.getUserChallenges(userId);

      return {
        userProfile,
        progressMetrics: metrics,
        recentActivity,
        historicalData,
        preferences,
        goals,
        challenges
      };
    } catch (error) {
      console.error('Failed to build analysis context:', error);
      throw error;
    }
  }

  /**
   * Build AI prompt for insight generation
   */
  private buildAIPrompt(context: AIAnalysisContext): string {
    return `
As a health and wellness AI coach, analyze the following user data and provide personalized insights and recommendations:

USER PROFILE:
- Age: ${context.userProfile.age || 'Not specified'}
- Health Goals: ${context.goals.join(', ') || 'General wellness'}
- Current Challenges: ${context.challenges.join(', ') || 'None specified'}

PROGRESS METRICS (${context.progressMetrics.timeframe}):
- Tips Viewed: ${context.progressMetrics.metrics.engagement.tipsViewed}
- Tips Completed: ${context.progressMetrics.metrics.engagement.tipsCompleted}
- Completion Rate: ${context.progressMetrics.metrics.engagement.completionRate.toFixed(1)}%
- Streak Days: ${context.progressMetrics.metrics.engagement.streakDays}
- Categories Explored: ${context.progressMetrics.metrics.learning.categoriesExplored}
- Consistency Score: ${context.progressMetrics.metrics.behavior.consistencyScore}
- Trend Direction: ${context.progressMetrics.trends.direction}

RECENT ACTIVITY:
${context.recentActivity.slice(0, 5).map(activity => `- ${activity.type}: ${activity.description}`).join('\n')}

Please provide:
1. 2-3 key insights about their progress
2. Specific, actionable recommendations
3. Motivational observations
4. Areas for improvement
5. Celebration-worthy achievements

Format your response as a JSON array of insights with the following structure:
{
  "type": "achievement|trend|recommendation|milestone|warning|celebration",
  "title": "Brief, engaging title",
  "description": "Detailed, personalized description",
  "priority": "low|medium|high|critical",
  "category": "engagement|learning|behavior|health|social|motivation",
  "recommendations": ["specific recommendation 1", "specific recommendation 2"],
  "confidence": 0.8
}
`;
  }

  /**
   * Parse AI response into structured insights
   */
  private parseAIResponse(aiText: string, context: AIAnalysisContext): ProgressInsight[] {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.fallbackParseAIResponse(aiText, context);
      }

      const parsedInsights = JSON.parse(jsonMatch[0]);
      return parsedInsights.map((insight: any) => ({
        id: this.generateInsightId(),
        userId: context.userProfile.id,
        type: insight.type || 'recommendation',
        title: insight.title || 'AI Insight',
        description: insight.description || '',
        aiGenerated: true,
        confidence: insight.confidence || 0.7,
        priority: insight.priority || 'medium',
        category: insight.category || 'general',
        timestamp: new Date(),
        metadata: {
          dataPoints: {},
          recommendations: insight.recommendations || [],
          actionItems: [],
          relatedTips: []
        }
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.fallbackParseAIResponse(aiText, context);
    }
  }

  /**
   * Fallback parsing for AI response
   */
  private fallbackParseAIResponse(aiText: string, context: AIAnalysisContext): ProgressInsight[] {
    // Simple text-based parsing as fallback
    const insights: ProgressInsight[] = [];
    const lines = aiText.split('\n').filter(line => line.trim());
    let currentInsight: Partial<ProgressInsight> | null = null;

    for (const line of lines) {
      if (line.includes('Achievement') || line.includes('Milestone')) {
        if (currentInsight) {
          insights.push(this.completeInsight(currentInsight, context));
        }
        currentInsight = {
          type: 'achievement',
          title: line.trim(),
          description: '',
          recommendations: []
        };
      } else if (line.includes('Recommendation') || line.includes('Suggest')) {
        if (currentInsight) {
          insights.push(this.completeInsight(currentInsight, context));
        }
        currentInsight = {
          type: 'recommendation',
          title: line.trim(),
          description: '',
          recommendations: []
        };
      } else if (currentInsight && line.trim()) {
        if (currentInsight.description) {
          currentInsight.description += ' ' + line.trim();
        } else {
          currentInsight.description = line.trim();
        }
      }
    }

    if (currentInsight) {
      insights.push(this.completeInsight(currentInsight, context));
    }

    return insights;
  }

  /**
   * Complete partial insight with required fields
   */
  private completeInsight(partial: Partial<ProgressInsight>, context: AIAnalysisContext): ProgressInsight {
    return {
      id: this.generateInsightId(),
      userId: context.userProfile.id,
      type: partial.type || 'recommendation',
      title: partial.title || 'AI Insight',
      description: partial.description || '',
      aiGenerated: true,
      confidence: 0.6,
      priority: 'medium',
      category: 'general',
      timestamp: new Date(),
      metadata: {
        dataPoints: {},
        recommendations: partial.recommendations || [],
        actionItems: [],
        relatedTips: []
      }
    };
  }

  /**
   * Prioritize insights based on various factors
   */
  private prioritizeInsights(insights: ProgressInsight[]): ProgressInsight[] {
    return insights.sort((a, b) => {
      // Priority order: critical > high > medium > low
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;

      // Then by timestamp (newer first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  // Helper methods for metric calculations
  private calculateStreakDays(userId: string, startDate: Date, endDate: Date): number {
    // Simplified calculation - would use actual user activity data
    return Math.floor(Math.random() * 14) + 1;
  }

  private calculateCategoriesExplored(contentPerformance: any[]): number {
    const categories = new Set(contentPerformance.map(item => item.category));
    return categories.size;
  }

  private async calculateKnowledgeRetention(userId: string, startDate: Date, endDate: Date): Promise<number> {
    // Simplified calculation - would use quiz/assessment data
    return Math.random() * 40 + 60; // 60-100%
  }

  private async calculateSkillProgression(userId: string, startDate: Date, endDate: Date): Promise<number> {
    // Simplified calculation - would use skill assessment data
    return Math.random() * 30 + 70; // 70-100%
  }

  private async getConceptsMastered(userId: string, startDate: Date, endDate: Date): Promise<string[]> {
    // Simplified - would return actual mastered concepts
    return ['Nutrition Basics', 'Exercise Planning', 'Sleep Hygiene'];
  }

  private async calculateHabitsFormed(userId: string, startDate: Date, endDate: Date): Promise<number> {
    // Simplified calculation
    return Math.floor(Math.random() * 5) + 1;
  }

  private async calculateConsistencyScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    // Simplified calculation
    return Math.random() * 40 + 60; // 60-100%
  }

  private async identifyImprovementAreas(userId: string, startDate: Date, endDate: Date): Promise<string[]> {
    return ['Time Management', 'Goal Setting', 'Consistency'];
  }

  private async identifyPositiveChanges(userId: string, startDate: Date, endDate: Date): Promise<string[]> {
    return ['Better Sleep Schedule', 'Increased Water Intake', 'Regular Exercise'];
  }

  private async calculateCommunityEngagement(userId: string, startDate: Date, endDate: Date): Promise<number> {
    return Math.random() * 50 + 50; // 50-100%
  }

  private async calculateHelpfulnessRating(userId: string, startDate: Date, endDate: Date): Promise<number> {
    return Math.random() * 2 + 3; // 3-5 stars
  }

  private calculateTrendDirection(engagementMetrics: any, userBehavior: any): 'improving' | 'stable' | 'declining' {
    // Simplified trend calculation
    const score = engagementMetrics.tipCompletions + userBehavior.averageSessionDuration / 1000;
    if (score > 100) return 'improving';
    if (score > 50) return 'stable';
    return 'declining';
  }

  private calculateTrendVelocity(userId: string, timeframe: string): number {
    // Simplified velocity calculation
    return Math.random() * 0.4 + 0.1; // 0.1-0.5
  }

  private async generatePredictions(userId: string, timeframe: string): Promise<Record<string, number>> {
    return {
      nextWeekEngagement: Math.random() * 20 + 80,
      monthlyGoalCompletion: Math.random() * 30 + 70,
      skillMasteryTimeline: Math.random() * 14 + 7
    };
  }

  private async getRecentActivity(userId: string): Promise<any[]> {
    // Simplified - would get actual recent activity
    return [
      { type: 'tip_completion', description: 'Completed nutrition tip about hydration' },
      { type: 'streak_milestone', description: 'Achieved 5-day learning streak' },
      { type: 'category_exploration', description: 'Started exploring fitness category' }
    ];
  }

  private async getHistoricalData(userId: string): Promise<any[]> {
    // Simplified - would get actual historical data
    return [];
  }

  private async getUserPreferences(userId: string): Promise<Record<string, any>> {
    // Simplified - would get actual user preferences
    return {
      preferredCategories: ['nutrition', 'fitness'],
      difficultyLevel: 'medium',
      sessionLength: 'short'
    };
  }

  private async getUserGoals(userId: string): Promise<string[]> {
    // Simplified - would get actual user goals
    return ['Lose weight', 'Improve sleep', 'Build healthy habits'];
  }

  private async getUserChallenges(userId: string): Promise<string[]> {
    // Simplified - would get actual user challenges
    return ['Time constraints', 'Motivation', 'Consistency'];
  }

  // Specific insight generators
  private async generateEngagementInsights(context: AIAnalysisContext): Promise<ProgressInsight[]> {
    const insights: ProgressInsight[] = [];

    // High engagement insight
    if (context.progressMetrics.metrics.engagement.completionRate > 80) {
      insights.push({
        id: this.generateInsightId(),
        userId: context.userProfile.id,
        type: 'celebration',
        title: '🌟 Exceptional Engagement',
        description: `Your ${context.progressMetrics.metrics.engagement.completionRate.toFixed(1)}% completion rate is outstanding! You're truly committed to your health journey.`,
        aiGenerated: true,
        confidence: 0.9,
        priority: 'high',
        category: 'engagement',
        timestamp: new Date(),
        metadata: {
          dataPoints: { completionRate: context.progressMetrics.metrics.engagement.completionRate },
          recommendations: [
            'Consider becoming a mentor to help others',
            'Explore advanced topics in your favorite categories',
            'Set more challenging personal goals'
          ],
          actionItems: [],
          relatedTips: []
        }
      });
    }

    return insights;
  }

  private async generateLearningInsights(context: AIAnalysisContext): Promise<ProgressInsight[]> {
    const insights: ProgressInsight[] = [];

    // Learning diversity insight
    if (context.progressMetrics.metrics.learning.categoriesExplored > 3) {
      insights.push({
        id: this.generateInsightId(),
        userId: context.userProfile.id,
        type: 'trend',
        title: '📚 Diverse Learning Approach',
        description: `You've explored ${context.progressMetrics.metrics.learning.categoriesExplored} different health categories, showing a well-rounded approach to wellness education.`,
        aiGenerated: true,
        confidence: 0.8,
        priority: 'medium',
        category: 'learning',
        timestamp: new Date(),
        metadata: {
          dataPoints: { categoriesExplored: context.progressMetrics.metrics.learning.categoriesExplored },
          recommendations: [
            'Look for connections between different health topics',
            'Consider creating a personal health knowledge map',
            'Focus on applying learnings from multiple categories'
          ],
          actionItems: [],
          relatedTips: []
        }
      });
    }

    return insights;
  }

  private async generateBehaviorInsights(context: AIAnalysisContext): Promise<ProgressInsight[]> {
    const insights: ProgressInsight[] = [];

    // Consistency insight
    if (context.progressMetrics.metrics.behavior.consistencyScore > 75) {
      insights.push({
        id: this.generateInsightId(),
        userId: context.userProfile.id,
        type: 'achievement',
        title: '🎯 Consistency Champion',
        description: `Your ${context.progressMetrics.metrics.behavior.consistencyScore.toFixed(1)}% consistency score shows excellent habit formation. This is key to long-term success!`,
        aiGenerated: true,
        confidence: 0.85,
        priority: 'high',
        category: 'behavior',
        timestamp: new Date(),
        metadata: {
          dataPoints: { consistencyScore: context.progressMetrics.metrics.behavior.consistencyScore },
          recommendations: [
            'Maintain your current routine while gradually adding new habits',
            'Document what strategies work best for you',
            'Consider helping others develop consistency'
          ],
          actionItems: [],
          relatedTips: []
        }
      });
    }

    return insights;
  }

  private async generateMotivationInsights(context: AIAnalysisContext): Promise<ProgressInsight[]> {
    const insights: ProgressInsight[] = [];

    // Motivation boost needed
    if (context.progressMetrics.trends.direction === 'declining') {
      insights.push({
        id: this.generateInsightId(),
        userId: context.userProfile.id,
        type: 'recommendation',
        title: '💪 Motivation Boost Needed',
        description: 'Your recent activity shows a declining trend. This is normal in any journey - let\'s get you back on track with some fresh motivation!',
        aiGenerated: true,
        confidence: 0.7,
        priority: 'high',
        category: 'motivation',
        timestamp: new Date(),
        metadata: {
          dataPoints: { trendDirection: context.progressMetrics.trends.direction },
          recommendations: [
            'Revisit your original health goals and why they matter to you',
            'Try a new category or approach to reignite interest',
            'Connect with the community for support and inspiration',
            'Celebrate small wins to rebuild momentum'
          ],
          actionItems: [
            {
              id: this.generateActionId(),
              title: 'Reflect on Your Why',
              description: 'Spend 5 minutes writing about why your health goals are important to you',
              type: 'immediate',
              difficulty: 'easy',
              estimatedTime: 5,
              completed: false
            }
          ],
          relatedTips: []
        }
      });
    }

    return insights;
  }

  /**
   * Save insights to storage
   */
  public async saveInsightsToStorage(userId: string, insights: ProgressInsight[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`insights_${userId}`, JSON.stringify(insights));
    } catch (error) {
      console.error('Failed to save insights to storage:', error);
    }
  }

  /**
   * Load insights from storage
   */
  public async loadInsightsFromStorage(userId: string): Promise<ProgressInsight[]> {
    try {
      const stored = await AsyncStorage.getItem(`insights_${userId}`);
      if (stored) {
        const insights = JSON.parse(stored);
        return insights.map((insight: any) => ({
          ...insight,
          timestamp: new Date(insight.timestamp),
          expiresAt: insight.expiresAt ? new Date(insight.expiresAt) : undefined
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to load insights from storage:', error);
      return [];
    }
  }

  /**
   * Record user feedback on insight
   */
  public async recordInsightFeedback(
    insightId: string,
    userId: string,
    feedback: {
      helpful: boolean;
      rating: number;
      comment?: string;
    }
  ): Promise<void> {
    try {
      const insights = await this.loadInsightsFromStorage(userId);
      const insightIndex = insights.findIndex(insight => insight.id === insightId);
      
      if (insightIndex !== -1) {
        insights[insightIndex].userFeedback = {
          ...feedback,
          timestamp: new Date()
        };
        
        await this.saveInsightsToStorage(userId, insights);
        
        // Log feedback
        await this.auditLogService.logDataAccess({
          userId,
          action: 'INSIGHT_FEEDBACK_RECORDED',
          resourceType: 'PROGRESS_INSIGHT',
          resourceId: insightId,
          ipAddress: 'mobile_app',
          userAgent: 'BioReceipt',
          success: true,
          details: {
            helpful: feedback.helpful,
            rating: feedback.rating,
            hasComment: !!feedback.comment
          }
        });
      }
    } catch (error) {
      console.error('Failed to record insight feedback:', error);
      throw error;
    }
  }

  /**
   * Get insights for user
   */
  public async getInsights(userId: string): Promise<ProgressInsight[]> {
    try {
      // Check cache first
      if (this.insightsCache.has(userId)) {
        return this.insightsCache.get(userId)!;
      }
      
      // Load from storage
      return await this.loadInsightsFromStorage(userId);
    } catch (error) {
      console.error('Failed to get insights:', error);
      return [];
    }
  }

  // Utility methods
  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}