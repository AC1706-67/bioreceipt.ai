/**
 * Engagement Tracking Service
 * Tracks user engagement to improve personalization over time
 */

import { UserHealthTipInteraction } from '../../models/HealthTip';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';
import { analyticsService } from '../analytics/analyticsService';
import { aiPersonalizationService } from './aiPersonalizationService';

interface EngagementMetrics {
  userId: string;
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  averageSessionDuration: number;
  engagementScore: number;
  trendingScore: number;
  lastActiveDate: Date;
  streakDays: number;
  weeklyEngagement: number[];
  monthlyEngagement: number[];
}

interface EngagementSession {
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  interactions: UserHealthTipInteraction[];
  duration: number;
  quality: number; // 0-1 score based on interaction quality
}

interface EngagementInsight {
  type: 'peak_time' | 'preferred_category' | 'engagement_pattern' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  data?: any;
}

class EngagementTrackingService {
  private static instance: EngagementTrackingService;
  private activeSessions: Map<string, EngagementSession>;
  private engagementQueue: Map<string, UserHealthTipInteraction[]>;

  private constructor() {
    this.activeSessions = new Map();
    this.engagementQueue = new Map();
    this.startPeriodicProcessing();
  }

  static getInstance(): EngagementTrackingService {
    if (!EngagementTrackingService.instance) {
      EngagementTrackingService.instance = new EngagementTrackingService();
    }
    return EngagementTrackingService.instance;
  }

  /**
   * Start tracking user session
   */
  async startSession(userId: string): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const session: EngagementSession = {
        userId,
        sessionId,
        startTime: new Date(),
        interactions: [],
        duration: 0,
        quality: 0
      };

      this.activeSessions.set(sessionId, session);

      // Track session start
      analyticsService.trackEvent('engagement_session_start', {
        userId,
        sessionId,
        timestamp: session.startTime
      });

      return sessionId;
    } catch (error) {
      console.error('Error starting engagement session:', error);
      throw new Error('Failed to start engagement session');
    }
  }

  /**
   * End tracking user session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return;
      }

      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      session.quality = this.calculateSessionQuality(session);

      // Save session data
      await this.saveSession(session);

      // Update user engagement metrics
      await this.updateEngagementMetrics(session.userId, session);

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      // Track session end
      analyticsService.trackEvent('engagement_session_end', {
        userId: session.userId,
        sessionId,
        duration: session.duration,
        quality: session.quality,
        interactionCount: session.interactions.length
      });
    } catch (error) {
      console.error('Error ending engagement session:', error);
    }
  }

  /**
   * Track interaction within session
   */
  async trackInteraction(
    sessionId: string,
    interaction: UserHealthTipInteraction
  ): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.interactions.push(interaction);
      }

      // Add to engagement queue for batch processing
      const userQueue = this.engagementQueue.get(interaction.userId) || [];
      userQueue.push(interaction);
      this.engagementQueue.set(interaction.userId, userQueue);

      // Process immediately for high-value interactions
      if (['bookmark', 'complete', 'share'].includes(interaction.interactionType)) {
        await this.processEngagementQueue(interaction.userId);
      }

      // Learn from interaction
      await aiPersonalizationService.learnFromInteraction(interaction);
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }

  /**
   * Get user engagement metrics
   */
  async getEngagementMetrics(userId: string): Promise<EngagementMetrics> {
    try {
      const cacheKey = `engagement_metrics_${userId}`;
      const cached = await cacheService.getAdvanced<EngagementMetrics>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Load from storage
      const metricsData = await storage.getData('ENGAGEMENT_METRICS') || {};
      let metrics = metricsData[userId];

      if (!metrics) {
        metrics = await this.createInitialMetrics(userId);
      } else {
        // Ensure dates are properly parsed
        metrics.lastActiveDate = new Date(metrics.lastActiveDate);
      }

      // Cache for 30 minutes
      await cacheService.setAdvanced(cacheKey, metrics, {
        ttl: 30,
        level: 'memory',
        importance: 0.7
      });

      return metrics;
    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      throw new Error('Failed to get engagement metrics');
    }
  }

  /**
   * Get engagement insights for user
   */
  async getEngagementInsights(userId: string): Promise<EngagementInsight[]> {
    try {
      const cacheKey = `engagement_insights_${userId}`;
      const cached = await cacheService.getAdvanced<EngagementInsight[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const metrics = await this.getEngagementMetrics(userId);
      const sessions = await this.getUserSessions(userId, 30); // Last 30 days
      
      const insights: EngagementInsight[] = [];

      // Peak time analysis
      const peakTimeInsight = this.analyzePeakTimes(sessions);
      if (peakTimeInsight) {
        insights.push(peakTimeInsight);
      }

      // Category preference analysis
      const categoryInsight = await this.analyzeCategoryPreferences(userId);
      if (categoryInsight) {
        insights.push(categoryInsight);
      }

      // Engagement pattern analysis
      const patternInsight = this.analyzeEngagementPatterns(metrics, sessions);
      if (patternInsight) {
        insights.push(patternInsight);
      }

      // Personalization recommendations
      const recommendationInsights = await this.generateRecommendationInsights(userId, metrics);
      insights.push(...recommendationInsights);

      // Cache for 1 hour
      await cacheService.setAdvanced(cacheKey, insights, {
        ttl: 60,
        level: 'memory',
        importance: 0.8
      });

      return insights;
    } catch (error) {
      console.error('Error getting engagement insights:', error);
      throw new Error('Failed to get engagement insights');
    }
  }

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(
    userId: string,
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    labels: string[];
    engagementScores: number[];
    interactionCounts: number[];
    sessionDurations: number[];
    trend: 'increasing' | 'stable' | 'decreasing';
  }> {
    try {
      const sessions = await this.getUserSessions(userId, this.getPeriodDays(period));
      
      // Group sessions by time period
      const groupedData = this.groupSessionsByPeriod(sessions, period);
      
      const labels = Object.keys(groupedData).sort();
      const engagementScores = labels.map(label => {
        const periodSessions = groupedData[label];
        return periodSessions.reduce((sum, s) => sum + s.quality, 0) / periodSessions.length || 0;
      });
      
      const interactionCounts = labels.map(label => {
        const periodSessions = groupedData[label];
        return periodSessions.reduce((sum, s) => sum + s.interactions.length, 0);
      });
      
      const sessionDurations = labels.map(label => {
        const periodSessions = groupedData[label];
        return periodSessions.reduce((sum, s) => sum + s.duration, 0) / periodSessions.length || 0;
      });

      // Calculate trend
      const trend = this.calculateTrend(engagementScores);

      return {
        labels,
        engagementScores,
        interactionCounts,
        sessionDurations,
        trend
      };
    } catch (error) {
      console.error('Error getting engagement trends:', error);
      throw new Error('Failed to get engagement trends');
    }
  }  // P
// private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSessionQuality(session: EngagementSession): number {
    if (session.interactions.length === 0) {
      return 0;
    }

    let qualityScore = 0;
    const weights = {
      view: 0.1,
      like: 0.3,
      bookmark: 0.5,
      complete: 0.7,
      share: 0.6,
      rate: 0.4,
      skip: -0.1
    };

    // Calculate weighted interaction score
    session.interactions.forEach(interaction => {
      const weight = weights[interaction.interactionType as keyof typeof weights] || 0.1;
      qualityScore += weight;
      
      // Bonus for rating interactions
      if (interaction.interactionType === 'rate' && interaction.metadata?.rating) {
        qualityScore += (interaction.metadata.rating - 3) * 0.1; // -0.2 to +0.2
      }
    });

    // Normalize by interaction count and session duration
    const avgInteractionQuality = qualityScore / session.interactions.length;
    const durationMinutes = session.duration / (1000 * 60);
    const durationBonus = Math.min(durationMinutes / 10, 0.2); // Up to 0.2 bonus for 10+ minutes

    return Math.max(0, Math.min(1, avgInteractionQuality + durationBonus));
  }

  private async saveSession(session: EngagementSession): Promise<void> {
    try {
      const sessionsData = await storage.getData('ENGAGEMENT_SESSIONS') || {};
      const userSessions = sessionsData[session.userId] || [];
      
      userSessions.push(session);
      
      // Keep only last 100 sessions per user
      if (userSessions.length > 100) {
        userSessions.splice(0, userSessions.length - 100);
      }
      
      sessionsData[session.userId] = userSessions;
      await storage.storeData('ENGAGEMENT_SESSIONS', sessionsData);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  private async updateEngagementMetrics(userId: string, session: EngagementSession): Promise<void> {
    try {
      const metrics = await this.getEngagementMetrics(userId);
      
      // Update metrics
      metrics.totalInteractions += session.interactions.length;
      
      // Update interaction counts by type
      session.interactions.forEach(interaction => {
        metrics.interactionsByType[interaction.interactionType] = 
          (metrics.interactionsByType[interaction.interactionType] || 0) + 1;
      });

      // Update average session duration
      const totalSessions = await this.getUserSessionCount(userId);
      metrics.averageSessionDuration = 
        (metrics.averageSessionDuration * (totalSessions - 1) + session.duration) / totalSessions;

      // Update engagement score (weighted average)
      metrics.engagementScore = 
        (metrics.engagementScore * 0.9) + (session.quality * 0.1);

      // Update last active date
      metrics.lastActiveDate = new Date();

      // Update streak
      await this.updateEngagementStreak(metrics);

      // Update weekly/monthly engagement
      this.updatePeriodicEngagement(metrics, session);

      // Save updated metrics
      await this.saveEngagementMetrics(metrics);

      // Invalidate cache
      await cacheService.invalidatePattern(new RegExp(`engagement_metrics_${userId}`));
    } catch (error) {
      console.error('Error updating engagement metrics:', error);
    }
  }

  private async createInitialMetrics(userId: string): Promise<EngagementMetrics> {
    const metrics: EngagementMetrics = {
      userId,
      totalInteractions: 0,
      interactionsByType: {},
      averageSessionDuration: 0,
      engagementScore: 0,
      trendingScore: 0,
      lastActiveDate: new Date(),
      streakDays: 0,
      weeklyEngagement: new Array(7).fill(0),
      monthlyEngagement: new Array(30).fill(0)
    };

    await this.saveEngagementMetrics(metrics);
    return metrics;
  }

  private async saveEngagementMetrics(metrics: EngagementMetrics): Promise<void> {
    try {
      const metricsData = await storage.getData('ENGAGEMENT_METRICS') || {};
      metricsData[metrics.userId] = metrics;
      await storage.storeData('ENGAGEMENT_METRICS', metricsData);
    } catch (error) {
      console.error('Error saving engagement metrics:', error);
    }
  }

  private async getUserSessions(userId: string, days: number): Promise<EngagementSession[]> {
    try {
      const sessionsData = await storage.getData('ENGAGEMENT_SESSIONS') || {};
      const userSessions = sessionsData[userId] || [];
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return userSessions
        .filter((session: any) => new Date(session.startTime) >= cutoffDate)
        .map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
          interactions: session.interactions.map((i: any) => ({
            ...i,
            timestamp: new Date(i.timestamp)
          }))
        }));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  private async getUserSessionCount(userId: string): Promise<number> {
    try {
      const sessionsData = await storage.getData('ENGAGEMENT_SESSIONS') || {};
      const userSessions = sessionsData[userId] || [];
      return userSessions.length;
    } catch (error) {
      console.error('Error getting user session count:', error);
      return 1; // Default to 1 to avoid division by zero
    }
  }

  private async updateEngagementStreak(metrics: EngagementMetrics): Promise<void> {
    const today = new Date();
    const lastActive = new Date(metrics.lastActiveDate);
    
    // Reset time to compare dates only
    today.setHours(0, 0, 0, 0);
    lastActive.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day, no change to streak
      return;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      metrics.streakDays += 1;
    } else {
      // Streak broken, reset to 1
      metrics.streakDays = 1;
    }
  }

  private updatePeriodicEngagement(metrics: EngagementMetrics, session: EngagementSession): void {
    const dayOfWeek = session.startTime.getDay();
    const dayOfMonth = session.startTime.getDate() - 1; // 0-indexed
    
    // Update weekly engagement (day of week)
    metrics.weeklyEngagement[dayOfWeek] += session.quality;
    
    // Update monthly engagement (day of month, keep last 30 days)
    if (dayOfMonth < 30) {
      metrics.monthlyEngagement[dayOfMonth] += session.quality;
    }
  }  private
 analyzePeakTimes(sessions: EngagementSession[]): EngagementInsight | null {
    if (sessions.length < 5) return null;

    const hourCounts: Record<number, number> = {};
    const hourQuality: Record<number, number[]> = {};

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      
      if (!hourQuality[hour]) hourQuality[hour] = [];
      hourQuality[hour].push(session.quality);
    });

    // Find peak hour (combination of frequency and quality)
    let bestHour = 0;
    let bestScore = 0;

    Object.keys(hourCounts).forEach(hourStr => {
      const hour = parseInt(hourStr);
      const frequency = hourCounts[hour];
      const avgQuality = hourQuality[hour].reduce((sum, q) => sum + q, 0) / hourQuality[hour].length;
      const score = frequency * avgQuality;
      
      if (score > bestScore) {
        bestScore = score;
        bestHour = hour;
      }
    });

    if (bestScore > 0) {
      const timeStr = bestHour === 0 ? '12:00 AM' : 
                     bestHour < 12 ? `${bestHour}:00 AM` : 
                     bestHour === 12 ? '12:00 PM' : 
                     `${bestHour - 12}:00 PM`;

      return {
        type: 'peak_time',
        title: 'Your Peak Engagement Time',
        description: `You're most engaged around ${timeStr}. Consider scheduling important health activities during this time.`,
        confidence: Math.min(bestScore / 10, 1),
        actionable: true,
        data: { hour: bestHour, score: bestScore }
      };
    }

    return null;
  }

  private async analyzeCategoryPreferences(userId: string): Promise<EngagementInsight | null> {
    try {
      const interactions = await this.getUserInteractions(userId, 50);
      if (interactions.length < 10) return null;

      const categoryEngagement: Record<string, { count: number; quality: number }> = {};

      // Get tip categories for interactions
      for (const interaction of interactions) {
        // This would require getting tip details - simplified for now
        const category = 'general'; // Placeholder
        
        if (!categoryEngagement[category]) {
          categoryEngagement[category] = { count: 0, quality: 0 };
        }
        
        categoryEngagement[category].count++;
        
        // Add quality score based on interaction type
        const qualityScore = this.getInteractionQualityScore(interaction.interactionType);
        categoryEngagement[category].quality += qualityScore;
      }

      // Find top category
      let topCategory = '';
      let topScore = 0;

      Object.entries(categoryEngagement).forEach(([category, data]) => {
        const avgQuality = data.quality / data.count;
        const score = data.count * avgQuality;
        
        if (score > topScore) {
          topScore = score;
          topCategory = category;
        }
      });

      if (topCategory && topScore > 5) {
        return {
          type: 'preferred_category',
          title: 'Your Favorite Health Category',
          description: `You engage most with ${topCategory.replace('_', ' ')} content. We'll show you more of this type.`,
          confidence: Math.min(topScore / 20, 1),
          actionable: true,
          data: { category: topCategory, score: topScore }
        };
      }

      return null;
    } catch (error) {
      console.error('Error analyzing category preferences:', error);
      return null;
    }
  }

  private analyzeEngagementPatterns(
    metrics: EngagementMetrics,
    sessions: EngagementSession[]
  ): EngagementInsight | null {
    if (sessions.length < 7) return null;

    // Analyze session frequency pattern
    const recentSessions = sessions.slice(-14); // Last 14 sessions
    const avgSessionsPerDay = recentSessions.length / 14;
    
    let patternType = '';
    let description = '';
    
    if (avgSessionsPerDay >= 2) {
      patternType = 'high_frequency';
      description = 'You check the app multiple times daily. Great consistency!';
    } else if (avgSessionsPerDay >= 1) {
      patternType = 'daily_user';
      description = 'You use the app daily. Keep up the healthy habit!';
    } else if (avgSessionsPerDay >= 0.5) {
      patternType = 'regular_user';
      description = 'You use the app regularly. Consider increasing frequency for better results.';
    } else {
      patternType = 'occasional_user';
      description = 'You use the app occasionally. Try setting daily reminders to build a habit.';
    }

    return {
      type: 'engagement_pattern',
      title: 'Your Usage Pattern',
      description,
      confidence: 0.8,
      actionable: patternType === 'occasional_user' || patternType === 'regular_user',
      data: { 
        patternType, 
        avgSessionsPerDay: Math.round(avgSessionsPerDay * 10) / 10,
        streakDays: metrics.streakDays
      }
    };
  }

  private async generateRecommendationInsights(
    userId: string,
    metrics: EngagementMetrics
  ): Promise<EngagementInsight[]> {
    const insights: EngagementInsight[] = [];

    // Streak encouragement
    if (metrics.streakDays >= 7) {
      insights.push({
        type: 'recommendation',
        title: 'Streak Achievement!',
        description: `Amazing! You've maintained a ${metrics.streakDays}-day streak. Keep it going!`,
        confidence: 1.0,
        actionable: false,
        data: { streakDays: metrics.streakDays }
      });
    } else if (metrics.streakDays >= 3) {
      insights.push({
        type: 'recommendation',
        title: 'Building Momentum',
        description: `You're on a ${metrics.streakDays}-day streak. Just a few more days to make it a week!`,
        confidence: 0.9,
        actionable: true,
        data: { streakDays: metrics.streakDays }
      });
    }

    // Engagement improvement
    if (metrics.engagementScore < 0.5) {
      insights.push({
        type: 'recommendation',
        title: 'Boost Your Engagement',
        description: 'Try bookmarking tips you find helpful and completing the ones you read.',
        confidence: 0.7,
        actionable: true,
        data: { currentScore: metrics.engagementScore }
      });
    }

    return insights;
  }

  private async getUserInteractions(userId: string, limit: number): Promise<UserHealthTipInteraction[]> {
    try {
      const interactionsData = await storage.getData('USER_INTERACTIONS') || {};
      const userInteractions = interactionsData[userId] || [];
      
      return userInteractions
        .slice(-limit)
        .map((i: any) => ({
          ...i,
          timestamp: new Date(i.timestamp)
        }));
    } catch (error) {
      console.error('Error getting user interactions:', error);
      return [];
    }
  }

  private getInteractionQualityScore(interactionType: string): number {
    const scores: Record<string, number> = {
      view: 0.1,
      like: 0.3,
      bookmark: 0.5,
      complete: 0.7,
      share: 0.6,
      rate: 0.4,
      skip: -0.1
    };
    
    return scores[interactionType] || 0.1;
  }

  private getPeriodDays(period: 'week' | 'month' | 'quarter'): number {
    switch (period) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      default: return 30;
    }
  }

  private groupSessionsByPeriod(
    sessions: EngagementSession[],
    period: 'week' | 'month' | 'quarter'
  ): Record<string, EngagementSession[]> {
    const grouped: Record<string, EngagementSession[]> = {};

    sessions.forEach(session => {
      let key: string;
      
      switch (period) {
        case 'week':
          // Group by week (YYYY-WW format)
          const weekStart = new Date(session.startTime);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
          break;
        case 'month':
          // Group by month (YYYY-MM format)
          key = `${session.startTime.getFullYear()}-${String(session.startTime.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          // Group by quarter (YYYY-Q format)
          const quarter = Math.ceil((session.startTime.getMonth() + 1) / 3);
          key = `${session.startTime.getFullYear()}-Q${quarter}`;
          break;
        default:
          key = session.startTime.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(session);
    });

    return grouped;
  }

  private calculateTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    const threshold = firstAvg * 0.1; // 10% threshold

    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  private async processEngagementQueue(userId: string): Promise<void> {
    try {
      const queue = this.engagementQueue.get(userId);
      if (!queue || queue.length === 0) return;

      // Process interactions in batches
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < queue.length; i += batchSize) {
        batches.push(queue.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        // Process batch (simplified - would involve more complex analysis)
        await this.processBatch(userId, batch);
      }

      // Clear processed queue
      this.engagementQueue.delete(userId);
    } catch (error) {
      console.error('Error processing engagement queue:', error);
    }
  }

  private async processBatch(userId: string, interactions: UserHealthTipInteraction[]): Promise<void> {
    // Simplified batch processing
    // In a real implementation, this would involve more sophisticated analysis
    console.log(`Processing ${interactions.length} interactions for user ${userId}`);
  }

  private startPeriodicProcessing(): void {
    // Process engagement queues every 5 minutes
    setInterval(() => {
      this.processAllQueues();
    }, 5 * 60 * 1000);
  }

  private async processAllQueues(): Promise<void> {
    try {
      for (const [userId] of this.engagementQueue.entries()) {
        await this.processEngagementQueue(userId);
      }
    } catch (error) {
      console.error('Error processing all queues:', error);
    }
  }
}

export const engagementTrackingService = EngagementTrackingService.getInstance();