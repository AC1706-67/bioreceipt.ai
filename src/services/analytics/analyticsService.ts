/**
 * Analytics Service
 * Privacy-compliant analytics and usage tracking system
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorageService } from '../security/secureStorage';
import { AuditLogService } from '../compliance/auditLogService';

// Analytics Event Types
export type AnalyticsEventType = 
  | 'tip_view'
  | 'tip_like'
  | 'tip_bookmark'
  | 'tip_complete'
  | 'tip_share'
  | 'streak_milestone'
  | 'app_open'
  | 'app_close'
  | 'screen_view'
  | 'user_action'
  | 'error_occurred'
  | 'performance_metric';

// Analytics Event Interface
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: Date;
  userId?: string; // Optional for privacy
  sessionId: string;
  properties: Record<string, any>;
  metadata?: {
    appVersion: string;
    platform: 'ios' | 'android';
    deviceId?: string; // Hashed for privacy
    networkType?: string;
    batteryLevel?: number;
  };
}

// Engagement Metrics Interface
export interface EngagementMetrics {
  tipViews: number;
  tipLikes: number;
  tipBookmarks: number;
  tipCompletions: number;
  tipShares: number;
  averageSessionDuration: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  streakMilestones: Record<number, number>; // milestone -> count
}

// Content Performance Interface
export interface ContentPerformance {
  tipId: string;
  title: string;
  category: string;
  views: number;
  likes: number;
  bookmarks: number;
  completions: number;
  shares: number;
  engagementRate: number;
  averageReadTime: number;
  retentionRate: number;
}

// User Behavior Analytics Interface
export interface UserBehaviorAnalytics {
  averageSessionsPerDay: number;
  averageSessionDuration: number;
  mostActiveTimeOfDay: string;
  preferredCategories: string[];
  engagementTrends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
}

// Privacy Settings Interface
export interface AnalyticsPrivacySettings {
  enableAnalytics: boolean;
  enablePersonalizedAnalytics: boolean;
  enablePerformanceTracking: boolean;
  enableErrorReporting: boolean;
  dataRetentionDays: number;
}

// Analytics Configuration
export interface AnalyticsConfig {
  batchSize: number;
  flushInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  enableOfflineQueue: boolean;
  enableRealTimeTracking: boolean;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private secureStorage: SecureStorageService;
  private auditLogService: AuditLogService;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStartTime: Date;
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private privacySettings: AnalyticsPrivacySettings;
  private config: AnalyticsConfig;

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    
    // Default privacy settings (privacy-first approach)
    this.privacySettings = {
      enableAnalytics: false, // Opt-in by default
      enablePersonalizedAnalytics: false,
      enablePerformanceTracking: true,
      enableErrorReporting: true,
      dataRetentionDays: 90
    };

    // Default configuration
    this.config = {
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      enableOfflineQueue: true,
      enableRealTimeTracking: false
    };
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize analytics service with user consent
   */
  public async initialize(privacySettings?: Partial<AnalyticsPrivacySettings>): Promise<void> {
    try {
      // Load existing privacy settings
      const storedSettings = await this.loadPrivacySettings();
      this.privacySettings = { ...this.privacySettings, ...storedSettings, ...privacySettings };

      // Save updated settings
      await this.savePrivacySettings(this.privacySettings);

      // Start session tracking if analytics enabled
      if (this.privacySettings.enableAnalytics) {
        await this.trackEvent('app_open', {
          sessionStart: true,
          timestamp: this.sessionStartTime.toISOString()
        });

        // Start periodic flush
        this.startPeriodicFlush();
      }

      // Load queued events from storage
      await this.loadQueuedEvents();

      this.isInitialized = true;
      console.log('Analytics service initialized with privacy settings:', this.privacySettings);
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
      // Continue operation even if analytics fails
      this.isInitialized = true;
    }
  }

  /**
   * Track an analytics event
   */
  public async trackEvent(
    type: AnalyticsEventType,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      // Check if analytics is enabled
      if (!this.privacySettings.enableAnalytics) {
        return;
      }

      // Check if personalized analytics is enabled for user-specific events
      if (userId && !this.privacySettings.enablePersonalizedAnalytics) {
        userId = undefined; // Remove user ID for privacy
      }

      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type,
        timestamp: new Date(),
        userId,
        sessionId: this.sessionId,
        properties: this.sanitizeProperties(properties),
        metadata: await this.getEventMetadata()
      };

      // Add to queue
      this.eventQueue.push(event);

      // Immediate flush for critical events
      if (this.isCriticalEvent(type) || this.config.enableRealTimeTracking) {
        await this.flushEvents();
      }

      // Auto-flush if queue is full
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flushEvents();
      }

      // Log for audit purposes
      await this.auditLogService.logDataAccess({
        userId: userId || 'anonymous',
        action: 'ANALYTICS_EVENT_TRACKED',
        resourceType: 'ANALYTICS_EVENT',
        resourceId: event.id,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          eventType: type,
          hasPersonalData: !!userId
        }
      });

    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Don't throw error to avoid disrupting app functionality
    }
  }

  /**
   * Track tip engagement
   */
  public async trackTipEngagement(
    tipId: string,
    action: 'view' | 'like' | 'bookmark' | 'complete' | 'share',
    userId?: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> {
    const eventType = `tip_${action}` as AnalyticsEventType;
    
    await this.trackEvent(eventType, {
      tipId,
      action,
      category: additionalProperties.category,
      difficulty: additionalProperties.difficulty,
      readTime: additionalProperties.readTime,
      ...additionalProperties
    }, userId);
  }

  /**
   * Track screen view
   */
  public async trackScreenView(
    screenName: string,
    userId?: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent('screen_view', {
      screenName,
      ...additionalProperties
    }, userId);
  }

  /**
   * Track user action
   */
  public async trackUserAction(
    action: string,
    userId?: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent('user_action', {
      action,
      ...additionalProperties
    }, userId);
  }

  /**
   * Track performance metric
   */
  public async trackPerformanceMetric(
    metricName: string,
    value: number,
    unit: string = 'ms',
    additionalProperties: Record<string, any> = {}
  ): Promise<void> {
    if (!this.privacySettings.enablePerformanceTracking) {
      return;
    }

    await this.trackEvent('performance_metric', {
      metricName,
      value,
      unit,
      ...additionalProperties
    });
  }

  /**
   * Track error occurrence
   */
  public async trackError(
    error: Error,
    context: string,
    userId?: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> {
    if (!this.privacySettings.enableErrorReporting) {
      return;
    }

    await this.trackEvent('error_occurred', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 1000), // Limit stack trace length
      context,
      ...additionalProperties
    }, userId);
  }

  /**
   * Get engagement metrics
   */
  public async getEngagementMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<EngagementMetrics> {
    try {
      const events = await this.getStoredEvents(startDate, endDate);
      
      const metrics: EngagementMetrics = {
        tipViews: this.countEventsByType(events, 'tip_view'),
        tipLikes: this.countEventsByType(events, 'tip_like'),
        tipBookmarks: this.countEventsByType(events, 'tip_bookmark'),
        tipCompletions: this.countEventsByType(events, 'tip_complete'),
        tipShares: this.countEventsByType(events, 'tip_share'),
        averageSessionDuration: this.calculateAverageSessionDuration(events),
        dailyActiveUsers: this.calculateActiveUsers(events, 'day'),
        weeklyActiveUsers: this.calculateActiveUsers(events, 'week'),
        monthlyActiveUsers: this.calculateActiveUsers(events, 'month'),
        streakMilestones: this.calculateStreakMilestones(events)
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get engagement metrics:', error);
      return this.getEmptyEngagementMetrics();
    }
  }

  /**
   * Get content performance analytics
   */
  public async getContentPerformance(
    startDate?: Date,
    endDate?: Date
  ): Promise<ContentPerformance[]> {
    try {
      const events = await this.getStoredEvents(startDate, endDate);
      const tipEvents = events.filter(event => 
        event.type.startsWith('tip_') && event.properties.tipId
      );

      const performanceMap = new Map<string, ContentPerformance>();

      tipEvents.forEach(event => {
        const tipId = event.properties.tipId;
        if (!performanceMap.has(tipId)) {
          performanceMap.set(tipId, {
            tipId,
            title: event.properties.title || 'Unknown',
            category: event.properties.category || 'Unknown',
            views: 0,
            likes: 0,
            bookmarks: 0,
            completions: 0,
            shares: 0,
            engagementRate: 0,
            averageReadTime: 0,
            retentionRate: 0
          });
        }

        const performance = performanceMap.get(tipId)!;
        
        switch (event.type) {
          case 'tip_view':
            performance.views++;
            break;
          case 'tip_like':
            performance.likes++;
            break;
          case 'tip_bookmark':
            performance.bookmarks++;
            break;
          case 'tip_complete':
            performance.completions++;
            break;
          case 'tip_share':
            performance.shares++;
            break;
        }
      });

      // Calculate derived metrics
      performanceMap.forEach(performance => {
        const totalEngagements = performance.likes + performance.bookmarks + 
                                performance.completions + performance.shares;
        performance.engagementRate = performance.views > 0 ? 
          (totalEngagements / performance.views) * 100 : 0;
      });

      return Array.from(performanceMap.values());
    } catch (error) {
      console.error('Failed to get content performance:', error);
      return [];
    }
  }

  /**
   * Get user behavior analytics
   */
  public async getUserBehaviorAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<UserBehaviorAnalytics> {
    try {
      const events = await this.getStoredEvents(startDate, endDate);
      
      return {
        averageSessionsPerDay: this.calculateAverageSessionsPerDay(events),
        averageSessionDuration: this.calculateAverageSessionDuration(events),
        mostActiveTimeOfDay: this.calculateMostActiveTimeOfDay(events),
        preferredCategories: this.calculatePreferredCategories(events),
        engagementTrends: this.calculateEngagementTrends(events),
        retentionRates: this.calculateRetentionRates(events)
      };
    } catch (error) {
      console.error('Failed to get user behavior analytics:', error);
      return this.getEmptyUserBehaviorAnalytics();
    }
  }

  /**
   * Update privacy settings
   */
  public async updatePrivacySettings(
    settings: Partial<AnalyticsPrivacySettings>
  ): Promise<void> {
    try {
      this.privacySettings = { ...this.privacySettings, ...settings };
      await this.savePrivacySettings(this.privacySettings);

      // If analytics was disabled, clear queued events
      if (!this.privacySettings.enableAnalytics) {
        this.eventQueue = [];
        await this.clearStoredEvents();
      }

      // Restart or stop periodic flush based on settings
      if (this.privacySettings.enableAnalytics) {
        this.startPeriodicFlush();
      } else {
        this.stopPeriodicFlush();
      }

      console.log('Analytics privacy settings updated:', this.privacySettings);
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      throw error;
    }
  }

  /**
   * Get current privacy settings
   */
  public getPrivacySettings(): AnalyticsPrivacySettings {
    return { ...this.privacySettings };
  }

  /**
   * Flush events to storage
   */
  public async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    try {
      const eventsToFlush = [...this.eventQueue];
      this.eventQueue = [];

      // Store events locally
      await this.storeEvents(eventsToFlush);

      // Clean up old events based on retention policy
      await this.cleanupOldEvents();

      console.log(`Flushed ${eventsToFlush.length} analytics events`);
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  /**
   * Clear all analytics data
   */
  public async clearAllData(): Promise<void> {
    try {
      this.eventQueue = [];
      await this.clearStoredEvents();
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'ANALYTICS_DATA_CLEARED',
        resourceType: 'ANALYTICS_DATA',
        resourceId: 'all',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true
      });
      console.log('All analytics data cleared');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async getEventMetadata(): Promise<AnalyticsEvent['metadata']> {
    // This would typically get real device info
    return {
      appVersion: '1.0.0',
      platform: 'ios', // or 'android'
      deviceId: await this.getHashedDeviceId(),
      networkType: 'wifi', // Would get from network info
      batteryLevel: 0.8 // Would get from device info
    };
  }

  private async getHashedDeviceId(): Promise<string> {
    // Generate a privacy-safe hashed device identifier
    const deviceId = await this.secureStorage.getItem('device_id') || 
                    `device_${Date.now()}_${Math.random().toString(36)}`;
    await this.secureStorage.setItem('device_id', deviceId);
    return deviceId;
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.keys(properties).forEach(key => {
      const value = properties[key];
      
      // Remove sensitive data patterns
      if (this.isSensitiveKey(key)) {
        return;
      }
      
      // Sanitize values
      if (typeof value === 'string') {
        sanitized[key] = value.substring(0, 1000); // Limit string length
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 100); // Limit array length
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = JSON.stringify(value).substring(0, 1000);
      }
    });
    
    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      'password', 'token', 'secret', 'key', 'auth',
      'email', 'phone', 'address', 'ssn', 'credit'
    ];
    
    return sensitivePatterns.some(pattern => 
      key.toLowerCase().includes(pattern)
    );
  }

  private isCriticalEvent(type: AnalyticsEventType): boolean {
    return ['error_occurred', 'app_open', 'app_close'].includes(type);
  }

  private startPeriodicFlush(): void {
    this.stopPeriodicFlush();
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch(error => {
        console.error('Periodic flush failed:', error);
      });
    }, this.config.flushInterval);
  }

  private stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private async loadPrivacySettings(): Promise<AnalyticsPrivacySettings> {
    try {
      const stored = await AsyncStorage.getItem('analytics_privacy_settings');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      return {};
    }
  }

  private async savePrivacySettings(settings: AnalyticsPrivacySettings): Promise<void> {
    try {
      await AsyncStorage.setItem('analytics_privacy_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      throw error;
    }
  }

  private async loadQueuedEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_event_queue');
      if (stored) {
        const events = JSON.parse(stored);
        this.eventQueue = events.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load queued events:', error);
    }
  }

  private async storeEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      const existingEvents = await this.getStoredEvents();
      const allEvents = [...existingEvents, ...events];
      
      await AsyncStorage.setItem('analytics_stored_events', JSON.stringify(allEvents));
    } catch (error) {
      console.error('Failed to store events:', error);
      throw error;
    }
  }

  private async getStoredEvents(startDate?: Date, endDate?: Date): Promise<AnalyticsEvent[]> {
    try {
      const stored = await AsyncStorage.getItem('analytics_stored_events');
      if (!stored) return [];
      
      let events: AnalyticsEvent[] = JSON.parse(stored).map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp)
      }));
      
      // Filter by date range if provided
      if (startDate || endDate) {
        events = events.filter(event => {
          const eventDate = event.timestamp;
          if (startDate && eventDate < startDate) return false;
          if (endDate && eventDate > endDate) return false;
          return true;
        });
      }
      
      return events;
    } catch (error) {
      console.error('Failed to get stored events:', error);
      return [];
    }
  }

  private async clearStoredEvents(): Promise<void> {
    try {
      await AsyncStorage.removeItem('analytics_stored_events');
      await AsyncStorage.removeItem('analytics_event_queue');
    } catch (error) {
      console.error('Failed to clear stored events:', error);
      throw error;
    }
  }

  private async cleanupOldEvents(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.privacySettings.dataRetentionDays);
      
      const events = await this.getStoredEvents();
      const filteredEvents = events.filter(event => event.timestamp >= cutoffDate);
      
      if (filteredEvents.length !== events.length) {
        await AsyncStorage.setItem('analytics_stored_events', JSON.stringify(filteredEvents));
        console.log(`Cleaned up ${events.length - filteredEvents.length} old analytics events`);
      }
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
    }
  }

  // Analytics calculation methods

  private countEventsByType(events: AnalyticsEvent[], type: AnalyticsEventType): number {
    return events.filter(event => event.type === type).length;
  }

  private calculateAverageSessionDuration(events: AnalyticsEvent[]): number {
    const sessionDurations = new Map<string, { start: Date; end: Date }>();
    
    events.forEach(event => {
      if (!sessionDurations.has(event.sessionId)) {
        sessionDurations.set(event.sessionId, {
          start: event.timestamp,
          end: event.timestamp
        });
      } else {
        const session = sessionDurations.get(event.sessionId)!;
        if (event.timestamp < session.start) session.start = event.timestamp;
        if (event.timestamp > session.end) session.end = event.timestamp;
      }
    });
    
    const durations = Array.from(sessionDurations.values())
      .map(session => session.end.getTime() - session.start.getTime());
    
    return durations.length > 0 ? 
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
  }

  private calculateActiveUsers(events: AnalyticsEvent[], period: 'day' | 'week' | 'month'): number {
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (period) {
      case 'day':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    const activeUsers = new Set(
      events
        .filter(event => event.timestamp >= cutoffDate && event.userId)
        .map(event => event.userId)
    );
    
    return activeUsers.size;
  }

  private calculateStreakMilestones(events: AnalyticsEvent[]): Record<number, number> {
    const milestones: Record<number, number> = {};
    
    events
      .filter(event => event.type === 'streak_milestone')
      .forEach(event => {
        const milestone = event.properties.milestone;
        if (typeof milestone === 'number') {
          milestones[milestone] = (milestones[milestone] || 0) + 1;
        }
      });
    
    return milestones;
  }

  private calculateAverageSessionsPerDay(events: AnalyticsEvent[]): number {
    const sessionsByDay = new Map<string, Set<string>>();
    
    events.forEach(event => {
      const day = event.timestamp.toDateString();
      if (!sessionsByDay.has(day)) {
        sessionsByDay.set(day, new Set());
      }
      sessionsByDay.get(day)!.add(event.sessionId);
    });
    
    const totalSessions = Array.from(sessionsByDay.values())
      .reduce((sum, sessions) => sum + sessions.size, 0);
    
    return sessionsByDay.size > 0 ? totalSessions / sessionsByDay.size : 0;
  }

  private calculateMostActiveTimeOfDay(events: AnalyticsEvent[]): string {
    const hourCounts = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    const mostActiveHour = hourCounts.indexOf(maxCount);
    
    return `${mostActiveHour}:00`;
  }

  private calculatePreferredCategories(events: AnalyticsEvent[]): string[] {
    const categoryCounts = new Map<string, number>();
    
    events
      .filter(event => event.properties.category)
      .forEach(event => {
        const category = event.properties.category;
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    
    return Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }

  private calculateEngagementTrends(events: AnalyticsEvent[]): UserBehaviorAnalytics['engagementTrends'] {
    // Simplified implementation - would need more sophisticated trend analysis
    return {
      daily: new Array(7).fill(0),
      weekly: new Array(4).fill(0),
      monthly: new Array(12).fill(0)
    };
  }

  private calculateRetentionRates(events: AnalyticsEvent[]): UserBehaviorAnalytics['retentionRates'] {
    // Simplified implementation - would need cohort analysis
    return {
      day1: 0.8,
      day7: 0.6,
      day30: 0.4
    };
  }

  private getEmptyEngagementMetrics(): EngagementMetrics {
    return {
      tipViews: 0,
      tipLikes: 0,
      tipBookmarks: 0,
      tipCompletions: 0,
      tipShares: 0,
      averageSessionDuration: 0,
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      streakMilestones: {}
    };
  }

  private getEmptyUserBehaviorAnalytics(): UserBehaviorAnalytics {
    return {
      averageSessionsPerDay: 0,
      averageSessionDuration: 0,
      mostActiveTimeOfDay: '12:00',
      preferredCategories: [],
      engagementTrends: {
        daily: new Array(7).fill(0),
        weekly: new Array(4).fill(0),
        monthly: new Array(12).fill(0)
      },
      retentionRates: {
        day1: 0,
        day7: 0,
        day30: 0
      }
    };
  }

  /**
   * Cleanup on app termination
   */
  public async cleanup(): Promise<void> {
    try {
      // Track app close
      if (this.privacySettings.enableAnalytics) {
        await this.trackEvent('app_close', {
          sessionDuration: Date.now() - this.sessionStartTime.getTime()
        });
      }

      // Flush remaining events
      await this.flushEvents();

      // Stop periodic flush
      this.stopPeriodicFlush();

      console.log('Analytics service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup analytics service:', error);
    }
  }
}