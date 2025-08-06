/**
 * Analytics Service
 * Privacy-compliant analytics and usage tracking
 */

import { AnalyticsEvent } from '../../types/analytics';
import { storeData, getData } from '../../utils/storage';
import { SyncService } from '../sync/syncService';

export type EventType = 
  | 'app_launch'
  | 'app_background'
  | 'screen_view'
  | 'tip_view'
  | 'tip_like'
  | 'tip_bookmark'
  | 'tip_complete'
  | 'tip_share'
  | 'search_performed'
  | 'category_filter'
  | 'notification_received'
  | 'notification_opened'
  | 'feedback_submitted'
  | 'profile_updated'
  | 'settings_changed'
  | 'error_occurred'
  | 'performance_metric'
  | 'ai_personalization_served'
  | 'ai_personalization_learning'
  | 'ai_personalization_preferences_updated'
  | 'health_tip_created'
  | 'health_tip_updated'
  | 'health_tip_deleted'
  | 'tip_interaction';

export interface EventData {
  // Common properties
  screen?: string;
  action?: string;
  category?: string;
  value?: number;
  
  // Tip-specific properties
  tipId?: string;
  tipCategory?: string;
  tipTitle?: string;
  
  // User interaction properties
  interactionType?: string;
  duration?: number;
  
  // Search properties
  searchQuery?: string;
  searchResults?: number;
  
  // Error properties
  errorType?: string;
  errorMessage?: string;
  
  // Performance properties
  loadTime?: number;
  memoryUsage?: number;
  
  // Custom properties
  [key: string]: any;
}

export interface AnalyticsConfig {
  enabled: boolean;
  consentGiven: boolean;
  trackingLevel: 'minimal' | 'standard' | 'detailed';
  retentionDays: number;
  batchSize: number;
  flushInterval: number; // in milliseconds
}

export interface UserEngagementMetrics {
  userId: string;
  sessionCount: number;
  totalSessionDuration: number;
  averageSessionDuration: number;
  tipsViewed: number;
  tipsLiked: number;
  tipsBookmarked: number;
  tipsCompleted: number;
  searchesPerformed: number;
  feedbackSubmitted: number;
  lastActiveDate: Date;
  streakDays: number;
  favoriteCategories: string[];
}

export interface AppUsageMetrics {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  sessionMetrics: {
    averageDuration: number;
    totalSessions: number;
    bounceRate: number;
  };
  contentMetrics: {
    mostViewedTips: Array<{ tipId: string; views: number; title: string }>;
    mostLikedTips: Array<{ tipId: string; likes: number; title: string }>;
    categoryPopularity: Record<string, number>;
  };
  userBehavior: {
    averageTipsPerSession: number;
    completionRate: number;
    retentionRate: {
      day1: number;
      day7: number;
      day30: number;
    };
  };
}

/**
 * Analytics Service Class
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private syncService: SyncService;
  private config: AnalyticsConfig;
  private sessionId: string;
  private sessionStartTime: Date;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.syncService = SyncService.getInstance();
    this.config = {
      enabled: true,
      consentGiven: false,
      trackingLevel: 'standard',
      retentionDays: 90,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
    };
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    this.initializeFlushTimer();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize analytics with user consent
   */
  public async initialize(consentGiven: boolean, trackingLevel: 'minimal' | 'standard' | 'detailed' = 'standard'): Promise<void> {
    try {
      this.config.consentGiven = consentGiven;
      this.config.trackingLevel = trackingLevel;
      
      // Load saved config
      const savedConfig = await getData<Partial<AnalyticsConfig>>('ANALYTICS_CONFIG');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }
      
      // Save updated config
      await storeData('ANALYTICS_CONFIG', this.config);
      
      if (consentGiven) {
        // Track app launch
        await this.trackEvent('app_launch', {
          trackingLevel,
          timestamp: new Date().toISOString(),
        });
      }
      
      console.log('Analytics initialized with consent:', consentGiven);
    } catch (error) {
      console.error('Error initializing analytics:', error);
    }
  }

  /**
   * Track an analytics event
   */
  public async trackEvent(eventType: EventType, eventData: EventData = {}): Promise<void> {
    if (!this.config.enabled || !this.config.consentGiven) {
      return;
    }

    try {
      const event: AnalyticsEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: eventData.userId,
        eventType,
        eventData: this.sanitizeEventData(eventData),
        timestamp: new Date(),
        sessionId: this.sessionId,
        deviceInfo: await this.getDeviceInfo(),
      };

      // Add to queue
      this.eventQueue.push(event);

      // Store locally
      await this.storeEvent(event);

      // Flush if queue is full
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flushEvents();
      }

      console.log(`Analytics event tracked: ${eventType}`, eventData);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Track screen view
   */
  public async trackScreenView(screenName: string, userId?: string, additionalData: EventData = {}): Promise<void> {
    await this.trackEvent('screen_view', {
      screen: screenName,
      userId,
      ...additionalData,
    });
  }

  /**
   * Track tip interaction
   */
  public async trackTipInteraction(
    interactionType: 'view' | 'like' | 'bookmark' | 'complete' | 'share',
    tipId: string,
    tipData: { title?: string; category?: string },
    userId?: string
  ): Promise<void> {
    const eventType = `tip_${interactionType}` as EventType;
    
    await this.trackEvent(eventType, {
      tipId,
      tipTitle: tipData.title,
      tipCategory: tipData.category,
      userId,
      interactionType,
    });
  }

  /**
   * Track user engagement session
   */
  public async trackSessionEnd(userId?: string): Promise<void> {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    
    await this.trackEvent('app_background', {
      userId,
      sessionDuration,
      sessionId: this.sessionId,
    });

    // Start new session for next app launch
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
  }

  /**
   * Track search activity
   */
  public async trackSearch(query: string, resultsCount: number, userId?: string): Promise<void> {
    await this.trackEvent('search_performed', {
      searchQuery: this.config.trackingLevel === 'minimal' ? '[REDACTED]' : query,
      searchResults: resultsCount,
      userId,
    });
  }

  /**
   * Track performance metrics
   */
  public async trackPerformance(metric: string, value: number, additionalData: EventData = {}): Promise<void> {
    await this.trackEvent('performance_metric', {
      action: metric,
      value,
      ...additionalData,
    });
  }

  /**
   * Get user engagement metrics
   */
  public async getUserEngagementMetrics(userId: string): Promise<UserEngagementMetrics | null> {
    try {
      const events = await this.getUserEvents(userId);
      
      if (events.length === 0) {
        return null;
      }

      const sessions = this.groupEventsBySessions(events);
      const tipInteractions = events.filter(e => e.eventType.startsWith('tip_'));
      
      const metrics: UserEngagementMetrics = {
        userId,
        sessionCount: sessions.length,
        totalSessionDuration: this.calculateTotalSessionDuration(sessions),
        averageSessionDuration: this.calculateAverageSessionDuration(sessions),
        tipsViewed: tipInteractions.filter(e => e.eventType === 'tip_view').length,
        tipsLiked: tipInteractions.filter(e => e.eventType === 'tip_like').length,
        tipsBookmarked: tipInteractions.filter(e => e.eventType === 'tip_bookmark').length,
        tipsCompleted: tipInteractions.filter(e => e.eventType === 'tip_complete').length,
        searchesPerformed: events.filter(e => e.eventType === 'search_performed').length,
        feedbackSubmitted: events.filter(e => e.eventType === 'feedback_submitted').length,
        lastActiveDate: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
        streakDays: this.calculateStreakDays(events),
        favoriteCategories: this.calculateFavoriteCategories(tipInteractions),
      };

      return metrics;
    } catch (error) {
      console.error('Error getting user engagement metrics:', error);
      return null;
    }
  }

  /**
   * Get app usage metrics
   */
  public async getAppUsageMetrics(): Promise<AppUsageMetrics | null> {
    try {
      const allEvents = await this.getAllEvents();
      const users = Array.from(new Set(allEvents.filter(e => e.userId).map(e => e.userId)));
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dailyActiveUsers = new Set(
        allEvents
          .filter(e => e.timestamp >= oneDayAgo && e.userId)
          .map(e => e.userId)
      ).size;

      const weeklyActiveUsers = new Set(
        allEvents
          .filter(e => e.timestamp >= oneWeekAgo && e.userId)
          .map(e => e.userId)
      ).size;

      const monthlyActiveUsers = new Set(
        allEvents
          .filter(e => e.timestamp >= oneMonthAgo && e.userId)
          .map(e => e.userId)
      ).size;

      const sessions = this.groupEventsBySessions(allEvents);
      const tipEvents = allEvents.filter(e => e.eventType.startsWith('tip_'));

      const metrics: AppUsageMetrics = {
        totalUsers: users.length,
        activeUsers: {
          daily: dailyActiveUsers,
          weekly: weeklyActiveUsers,
          monthly: monthlyActiveUsers,
        },
        sessionMetrics: {
          averageDuration: this.calculateAverageSessionDuration(sessions),
          totalSessions: sessions.length,
          bounceRate: this.calculateBounceRate(sessions),
        },
        contentMetrics: {
          mostViewedTips: this.getMostViewedTips(tipEvents),
          mostLikedTips: this.getMostLikedTips(tipEvents),
          categoryPopularity: this.getCategoryPopularity(tipEvents),
        },
        userBehavior: {
          averageTipsPerSession: this.calculateAverageTipsPerSession(sessions, tipEvents),
          completionRate: this.calculateCompletionRate(tipEvents),
          retentionRate: {
            day1: this.calculateRetentionRate(allEvents, 1),
            day7: this.calculateRetentionRate(allEvents, 7),
            day30: this.calculateRetentionRate(allEvents, 30),
          },
        },
      };

      return metrics;
    } catch (error) {
      console.error('Error getting app usage metrics:', error);
      return null;
    }
  }

  /**
   * Update analytics configuration
   */
  public async updateConfig(updates: Partial<AnalyticsConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...updates };
      await storeData('ANALYTICS_CONFIG', this.config);
      
      if (updates.flushInterval) {
        this.initializeFlushTimer();
      }
      
      console.log('Analytics config updated:', updates);
    } catch (error) {
      console.error('Error updating analytics config:', error);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Clear all analytics data
   */
  public async clearAllData(): Promise<void> {
    try {
      await storeData('ANALYTICS_EVENTS', []);
      this.eventQueue = [];
      console.log('Analytics data cleared');
    } catch (error) {
      console.error('Error clearing analytics data:', error);
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  public async exportUserData(userId: string): Promise<AnalyticsEvent[]> {
    try {
      return await this.getUserEvents(userId);
    } catch (error) {
      console.error('Error exporting user data:', error);
      return [];
    }
  }

  /**
   * Delete user data (GDPR compliance)
   */
  public async deleteUserData(userId: string): Promise<void> {
    try {
      const allEvents = await this.getAllEvents();
      const filteredEvents = allEvents.filter(event => event.userId !== userId);
      await storeData('ANALYTICS_EVENTS', filteredEvents);
      
      // Remove from queue
      this.eventQueue = this.eventQueue.filter(event => event.userId !== userId);
      
      console.log(`Analytics data deleted for user: ${userId}`);
    } catch (error) {
      console.error('Error deleting user data:', error);
    }
  }

  // Private helper methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDeviceInfo() {
    // In a real app, you'd use react-native-device-info
    return {
      platform: 'unknown',
      version: '1.0.0',
      model: 'unknown',
    };
  }

  private sanitizeEventData(eventData: EventData): EventData {
    const sanitized = { ...eventData };
    
    // Remove sensitive data based on tracking level
    if (this.config.trackingLevel === 'minimal') {
      delete sanitized.searchQuery;
      delete sanitized.errorMessage;
    }
    
    return sanitized;
  }

  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    const allEvents = await this.getAllEvents();
    allEvents.push(event);
    
    // Clean up old events based on retention policy
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    const filteredEvents = allEvents.filter(e => e.timestamp >= cutoffDate);
    
    await storeData('ANALYTICS_EVENTS', filteredEvents);
  }

  private async getAllEvents(): Promise<AnalyticsEvent[]> {
    try {
      const events = await getData<AnalyticsEvent[]>('ANALYTICS_EVENTS');
      return events || [];
    } catch (error) {
      console.error('Error getting all events:', error);
      return [];
    }
  }

  private async getUserEvents(userId: string): Promise<AnalyticsEvent[]> {
    const allEvents = await this.getAllEvents();
    return allEvents.filter(event => event.userId === userId);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      // In a real app, you'd send events to your analytics backend
      await this.syncService.handleOfflineAction('analytics_batch', {
        events: [...this.eventQueue],
        timestamp: new Date(),
      });

      this.eventQueue = [];
      console.log('Analytics events flushed');
    } catch (error) {
      console.error('Error flushing events:', error);
    }
  }

  private initializeFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  private groupEventsBySessions(events: AnalyticsEvent[]): AnalyticsEvent[][] {
    const sessions: Record<string, AnalyticsEvent[]> = {};
    
    events.forEach(event => {
      if (!sessions[event.sessionId]) {
        sessions[event.sessionId] = [];
      }
      sessions[event.sessionId].push(event);
    });
    
    return Object.values(sessions);
  }

  private calculateTotalSessionDuration(sessions: AnalyticsEvent[][]): number {
    return sessions.reduce((total, session) => {
      if (session.length < 2) return total;
      
      const start = Math.min(...session.map(e => e.timestamp.getTime()));
      const end = Math.max(...session.map(e => e.timestamp.getTime()));
      
      return total + (end - start);
    }, 0);
  }

  private calculateAverageSessionDuration(sessions: AnalyticsEvent[][]): number {
    if (sessions.length === 0) return 0;
    
    const totalDuration = this.calculateTotalSessionDuration(sessions);
    return totalDuration / sessions.length;
  }

  private calculateStreakDays(events: AnalyticsEvent[]): number {
    const dates = Array.from(new Set(events.map(e => e.timestamp.toDateString()))).sort();
    let streak = 0;
    let currentStreak = 0;
    
    for (let i = dates.length - 1; i >= 0; i--) {
      const currentDate = new Date(dates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - currentStreak);
      
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return currentStreak;
  }

  private calculateFavoriteCategories(tipEvents: AnalyticsEvent[]): string[] {
    const categoryCount: Record<string, number> = {};
    
    tipEvents.forEach(event => {
      const category = event.eventData.tipCategory;
      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  private calculateBounceRate(sessions: AnalyticsEvent[][]): number {
    if (sessions.length === 0) return 0;
    
    const bouncedSessions = sessions.filter(session => session.length <= 1).length;
    return (bouncedSessions / sessions.length) * 100;
  }

  private getMostViewedTips(tipEvents: AnalyticsEvent[]): Array<{ tipId: string; views: number; title: string }> {
    const tipViews: Record<string, { views: number; title: string }> = {};
    
    tipEvents
      .filter(e => e.eventType === 'tip_view')
      .forEach(event => {
        const tipId = event.eventData.tipId;
        const title = event.eventData.tipTitle || 'Unknown';
        
        if (tipId) {
          if (!tipViews[tipId]) {
            tipViews[tipId] = { views: 0, title };
          }
          tipViews[tipId].views++;
        }
      });
    
    return Object.entries(tipViews)
      .map(([tipId, data]) => ({ tipId, ...data }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private getMostLikedTips(tipEvents: AnalyticsEvent[]): Array<{ tipId: string; likes: number; title: string }> {
    const tipLikes: Record<string, { likes: number; title: string }> = {};
    
    tipEvents
      .filter(e => e.eventType === 'tip_like')
      .forEach(event => {
        const tipId = event.eventData.tipId;
        const title = event.eventData.tipTitle || 'Unknown';
        
        if (tipId) {
          if (!tipLikes[tipId]) {
            tipLikes[tipId] = { likes: 0, title };
          }
          tipLikes[tipId].likes++;
        }
      });
    
    return Object.entries(tipLikes)
      .map(([tipId, data]) => ({ tipId, ...data }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10);
  }

  private getCategoryPopularity(tipEvents: AnalyticsEvent[]): Record<string, number> {
    const categoryCount: Record<string, number> = {};
    
    tipEvents.forEach(event => {
      const category = event.eventData.tipCategory;
      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });
    
    return categoryCount;
  }

  private calculateAverageTipsPerSession(sessions: AnalyticsEvent[][], tipEvents: AnalyticsEvent[]): number {
    if (sessions.length === 0) return 0;
    
    const tipEventsBySession: Record<string, number> = {};
    
    tipEvents.forEach(event => {
      tipEventsBySession[event.sessionId] = (tipEventsBySession[event.sessionId] || 0) + 1;
    });
    
    const totalTips = Object.values(tipEventsBySession).reduce((sum, count) => sum + count, 0);
    return totalTips / sessions.length;
  }

  private calculateCompletionRate(tipEvents: AnalyticsEvent[]): number {
    const viewEvents = tipEvents.filter(e => e.eventType === 'tip_view').length;
    const completeEvents = tipEvents.filter(e => e.eventType === 'tip_complete').length;
    
    return viewEvents > 0 ? (completeEvents / viewEvents) * 100 : 0;
  }

  private calculateRetentionRate(events: AnalyticsEvent[], days: number): number {
    const users = Array.from(new Set(events.filter(e => e.userId).map(e => e.userId)));
    if (users.length === 0) return 0;
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentUsers = new Set(
      events
        .filter(e => e.timestamp >= cutoffDate && e.userId)
        .map(e => e.userId)
    );
    
    return (recentUsers.size / users.length) * 100;
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();