/**
 * Error Analytics Service
 * Analyzes error patterns, trends, and provides insights
 */

import {
  EnhancedError,
  ErrorCategory,
  ErrorSeverity,
  ErrorRecoveryStrategy
} from '../../types/errors';
import { storage } from '../../utils/storage';
import { loggingService } from '../logging/loggingService';

interface ErrorMetrics {
  totalErrors: number;
  errorRate: number; // errors per session
  criticalErrorRate: number;
  recoverySuccessRate: number;
  averageResolutionTime: number;
  topErrorCategories: CategoryMetric[];
  topErrorCodes: CodeMetric[];
  errorTrends: TrendData[];
  userImpactScore: number;
}

interface CategoryMetric {
  category: ErrorCategory;
  count: number;
  percentage: number;
  averageSeverity: number;
  recoveryRate: number;
}

interface CodeMetric {
  code: string;
  count: number;
  percentage: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  lastOccurrence: Date;
}

interface TrendData {
  date: Date;
  errorCount: number;
  criticalCount: number;
  recoveredCount: number;
  categories: Record<ErrorCategory, number>;
}

interface ErrorPattern {
  id: string;
  pattern: string;
  description: string;
  frequency: number;
  severity: ErrorSeverity;
  affectedUsers: number;
  firstSeen: Date;
  lastSeen: Date;
  suggestedActions: string[];
}

interface UserErrorProfile {
  userId: string;
  totalErrors: number;
  errorFrequency: number; // errors per day
  mostCommonCategory: ErrorCategory;
  mostCommonSeverity: ErrorSeverity;
  recoverySuccessRate: number;
  lastErrorDate: Date;
  errorHistory: ErrorHistoryEntry[];
}

interface ErrorHistoryEntry {
  date: Date;
  errorCode: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  resolved: boolean;
  resolutionTime?: number;
}

interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  minPatternFrequency: number;
  trendAnalysisDays: number;
  userProfileEnabled: boolean;
  realTimeAlertsEnabled: boolean;
}

class ErrorAnalyticsService {
  private static instance: ErrorAnalyticsService;
  private config: AnalyticsConfig;
  private errorHistory: EnhancedError[] = [];
  private patterns: ErrorPattern[] = [];
  private userProfiles: Map<string, UserErrorProfile> = new Map();
  private metricsCache: { metrics: ErrorMetrics; timestamp: Date } | null = null;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeService();
  }

  static getInstance(): ErrorAnalyticsService {
    if (!ErrorAnalyticsService.instance) {
      ErrorAnalyticsService.instance = new ErrorAnalyticsService();
    }
    return ErrorAnalyticsService.instance;
  }

  /**
   * Initialize the analytics service
   */
  private async initializeService(): Promise<void> {
    try {
      // Load configuration
      const storedConfig = await storage.getData('ERROR_ANALYTICS_CONFIG');
      if (storedConfig) {
        this.config = { ...this.config, ...storedConfig };
      }

      // Load error history
      await this.loadErrorHistory();

      // Load patterns
      await this.loadPatterns();

      // Load user profiles
      await this.loadUserProfiles();

      // Start background analysis
      this.startBackgroundAnalysis();

      await loggingService.info('Error analytics service initialized', {
        historyCount: this.errorHistory.length,
        patternsCount: this.patterns.length,
        userProfilesCount: this.userProfiles.size
      });
    } catch (error) {
      console.error('Failed to initialize error analytics service:', error);
    }
  }

  /**
   * Record an error for analytics
   */
  async recordError(error: EnhancedError): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Add to history
      this.errorHistory.unshift(error);

      // Maintain history size
      const maxHistorySize = this.config.retentionDays * 100; // Rough estimate
      if (this.errorHistory.length > maxHistorySize) {
        this.errorHistory = this.errorHistory.slice(0, maxHistorySize);
      }

      // Update user profile
      if (this.config.userProfileEnabled && error.context.userId) {
        await this.updateUserProfile(error);
      }

      // Check for patterns
      await this.analyzeForPatterns(error);

      // Invalidate metrics cache
      this.metricsCache = null;

      // Check for real-time alerts
      if (this.config.realTimeAlertsEnabled) {
        await this.checkRealTimeAlerts(error);
      }

      // Persist data periodically
      if (this.errorHistory.length % 10 === 0) {
        await this.persistData();
      }
    } catch (analyticsError) {
      console.error('Failed to record error for analytics:', analyticsError);
    }
  }

  /**
   * Get comprehensive error metrics
   */
  async getErrorMetrics(forceRefresh = false): Promise<ErrorMetrics> {
    if (!forceRefresh && this.metricsCache && this.isCacheValid()) {
      return this.metricsCache.metrics;
    }

    try {
      const metrics = await this.calculateMetrics();
      this.metricsCache = {
        metrics,
        timestamp: new Date()
      };
      return metrics;
    } catch (error) {
      console.error('Failed to calculate error metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive metrics
   */
  private async calculateMetrics(): Promise<ErrorMetrics> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (this.config.trendAnalysisDays * 24 * 60 * 60 * 1000));
    const recentErrors = this.errorHistory.filter(error => error.timestamp >= cutoffDate);

    // Basic counts
    const totalErrors = recentErrors.length;
    const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    const resolvedErrors = recentErrors.filter(e => e.resolved).length;

    // Calculate rates
    const sessionCount = await this.getSessionCount();
    const errorRate = sessionCount > 0 ? totalErrors / sessionCount : 0;
    const criticalErrorRate = sessionCount > 0 ? criticalErrors / sessionCount : 0;
    const recoverySuccessRate = totalErrors > 0 ? resolvedErrors / totalErrors : 0;

    // Calculate average resolution time
    const resolvedErrorsWithTime = recentErrors.filter(e => 
      e.resolved && e.resolvedAt && e.timestamp
    );
    const averageResolutionTime = resolvedErrorsWithTime.length > 0
      ? resolvedErrorsWithTime.reduce((sum, error) => {
          const resolutionTime = error.resolvedAt!.getTime() - error.timestamp.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedErrorsWithTime.length
      : 0;

    // Category metrics
    const categoryStats = this.calculateCategoryMetrics(recentErrors);
    const topErrorCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        percentage: (stats.count / totalErrors) * 100,
        averageSeverity: stats.totalSeverity / stats.count,
        recoveryRate: stats.recoveredCount / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Code metrics
    const codeStats = this.calculateCodeMetrics(recentErrors);
    const topErrorCodes = Array.from(codeStats.entries())
      .map(([code, stats]) => ({
        code,
        count: stats.count,
        percentage: (stats.count / totalErrors) * 100,
        category: stats.category,
        severity: stats.severity,
        lastOccurrence: stats.lastOccurrence
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Trend data
    const errorTrends = this.calculateTrendData(recentErrors);

    // User impact score (0-100)
    const userImpactScore = this.calculateUserImpactScore(recentErrors);

    return {
      totalErrors,
      errorRate,
      criticalErrorRate,
      recoverySuccessRate,
      averageResolutionTime,
      topErrorCategories,
      topErrorCodes,
      errorTrends,
      userImpactScore
    };
  }

  /**
   * Calculate category metrics
   */
  private calculateCategoryMetrics(errors: EnhancedError[]): Map<ErrorCategory, any> {
    const stats = new Map();

    errors.forEach(error => {
      const existing = stats.get(error.category) || {
        count: 0,
        totalSeverity: 0,
        recoveredCount: 0
      };

      existing.count++;
      existing.totalSeverity += this.getSeverityWeight(error.severity);
      if (error.resolved) {
        existing.recoveredCount++;
      }

      stats.set(error.category, existing);
    });

    return stats;
  }

  /**
   * Calculate code metrics
   */
  private calculateCodeMetrics(errors: EnhancedError[]): Map<string, any> {
    const stats = new Map();

    errors.forEach(error => {
      const existing = stats.get(error.errorCode) || {
        count: 0,
        category: error.category,
        severity: error.severity,
        lastOccurrence: error.timestamp
      };

      existing.count++;
      if (error.timestamp > existing.lastOccurrence) {
        existing.lastOccurrence = error.timestamp;
      }

      stats.set(error.errorCode, existing);
    });

    return stats;
  }

  /**
   * Calculate trend data
   */
  private calculateTrendData(errors: EnhancedError[]): TrendData[] {
    const trendMap = new Map<string, TrendData>();

    errors.forEach(error => {
      const dateKey = error.timestamp.toISOString().split('T')[0];
      const existing = trendMap.get(dateKey) || {
        date: new Date(dateKey),
        errorCount: 0,
        criticalCount: 0,
        recoveredCount: 0,
        categories: {} as Record<ErrorCategory, number>
      };

      existing.errorCount++;
      if (error.severity === ErrorSeverity.CRITICAL) {
        existing.criticalCount++;
      }
      if (error.resolved) {
        existing.recoveredCount++;
      }

      existing.categories[error.category] = (existing.categories[error.category] || 0) + 1;
      trendMap.set(dateKey, existing);
    });

    return Array.from(trendMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate user impact score
   */
  private calculateUserImpactScore(errors: EnhancedError[]): number {
    if (errors.length === 0) return 0;

    let score = 0;
    const weights = {
      [ErrorSeverity.CRITICAL]: 40,
      [ErrorSeverity.HIGH]: 25,
      [ErrorSeverity.MEDIUM]: 15,
      [ErrorSeverity.LOW]: 5
    };

    errors.forEach(error => {
      score += weights[error.severity] || 0;
      
      // Reduce score for resolved errors
      if (error.resolved) {
        score -= (weights[error.severity] || 0) * 0.5;
      }
    });

    // Normalize to 0-100 scale
    const maxPossibleScore = errors.length * weights[ErrorSeverity.CRITICAL];
    return Math.min(100, (score / maxPossibleScore) * 100);
  }

  /**
   * Get error patterns
   */
  async getErrorPatterns(): Promise<ErrorPattern[]> {
    return [...this.patterns].sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze for new patterns
   */
  private async analyzeForPatterns(error: EnhancedError): Promise<void> {
    try {
      // Look for similar errors in recent history
      const recentErrors = this.errorHistory.slice(0, 100);
      const similarErrors = recentErrors.filter(e => 
        e.errorCode === error.errorCode ||
        (e.category === error.category && e.severity === error.severity)
      );

      if (similarErrors.length >= this.config.minPatternFrequency) {
        const patternId = `${error.category}_${error.errorCode}`;
        let pattern = this.patterns.find(p => p.id === patternId);

        if (!pattern) {
          pattern = {
            id: patternId,
            pattern: `${error.category} errors with code ${error.errorCode}`,
            description: this.generatePatternDescription(error, similarErrors),
            frequency: similarErrors.length,
            severity: error.severity,
            affectedUsers: new Set(similarErrors.map(e => e.context.userId).filter(Boolean)).size,
            firstSeen: similarErrors[similarErrors.length - 1].timestamp,
            lastSeen: error.timestamp,
            suggestedActions: this.generateSuggestedActions(error, similarErrors)
          };
          this.patterns.push(pattern);
        } else {
          pattern.frequency = similarErrors.length;
          pattern.lastSeen = error.timestamp;
          pattern.affectedUsers = new Set(similarErrors.map(e => e.context.userId).filter(Boolean)).size;
        }
      }
    } catch (error) {
      console.error('Failed to analyze for patterns:', error);
    }
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(error: EnhancedError, similarErrors: EnhancedError[]): string {
    const commonScreens = this.getMostCommon(similarErrors.map(e => e.context.currentScreen).filter(Boolean));
    const commonFeatures = this.getMostCommon(similarErrors.map(e => e.context.feature).filter(Boolean));
    
    let description = `Recurring ${error.category} errors`;
    
    if (commonScreens.length > 0) {
      description += ` occurring primarily on ${commonScreens[0]} screen`;
    }
    
    if (commonFeatures.length > 0) {
      description += ` in ${commonFeatures[0]} feature`;
    }
    
    return description;
  }

  /**
   * Generate suggested actions for pattern
   */
  private generateSuggestedActions(error: EnhancedError, similarErrors: EnhancedError[]): string[] {
    const actions: string[] = [];
    
    // Category-specific suggestions
    switch (error.category) {
      case ErrorCategory.NETWORK:
        actions.push('Implement better offline handling');
        actions.push('Add retry logic with exponential backoff');
        actions.push('Cache critical data locally');
        break;
        
      case ErrorCategory.API:
        actions.push('Review API error handling');
        actions.push('Implement circuit breaker pattern');
        actions.push('Add API response validation');
        break;
        
      case ErrorCategory.UI_COMPONENT:
        actions.push('Add error boundaries to affected components');
        actions.push('Review component lifecycle methods');
        actions.push('Add prop validation');
        break;
        
      case ErrorCategory.DATA_VALIDATION:
        actions.push('Strengthen input validation');
        actions.push('Add user-friendly error messages');
        actions.push('Implement client-side validation');
        break;
    }
    
    // Severity-specific suggestions
    if (error.severity === ErrorSeverity.CRITICAL) {
      actions.push('Prioritize immediate fix');
      actions.push('Consider hotfix deployment');
    }
    
    // Recovery-specific suggestions
    const recoveryRate = similarErrors.filter(e => e.resolved).length / similarErrors.length;
    if (recoveryRate < 0.5) {
      actions.push('Improve error recovery mechanisms');
      actions.push('Add more recovery options for users');
    }
    
    return actions;
  }

  /**
   * Update user profile
   */
  private async updateUserProfile(error: EnhancedError): Promise<void> {
    if (!error.context.userId) return;

    const userId = error.context.userId;
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        totalErrors: 0,
        errorFrequency: 0,
        mostCommonCategory: error.category,
        mostCommonSeverity: error.severity,
        recoverySuccessRate: 0,
        lastErrorDate: error.timestamp,
        errorHistory: []
      };
    }

    // Update profile
    profile.totalErrors++;
    profile.lastErrorDate = error.timestamp;
    
    // Add to history
    profile.errorHistory.unshift({
      date: error.timestamp,
      errorCode: error.errorCode,
      category: error.category,
      severity: error.severity,
      resolved: error.resolved || false,
      resolutionTime: error.resolved && error.resolvedAt 
        ? error.resolvedAt.getTime() - error.timestamp.getTime()
        : undefined
    });

    // Keep only recent history
    profile.errorHistory = profile.errorHistory.slice(0, 50);

    // Recalculate stats
    profile.errorFrequency = this.calculateErrorFrequency(profile.errorHistory);
    profile.mostCommonCategory = this.getMostCommonCategory(profile.errorHistory);
    profile.mostCommonSeverity = this.getMostCommonSeverity(profile.errorHistory);
    profile.recoverySuccessRate = this.calculateRecoveryRate(profile.errorHistory);

    this.userProfiles.set(userId, profile);
  }

  /**
   * Check for real-time alerts
   */
  private async checkRealTimeAlerts(error: EnhancedError): Promise<void> {
    try {
      // Critical error alert
      if (error.severity === ErrorSeverity.CRITICAL) {
        await this.sendAlert('critical_error', {
          errorId: error.errorId,
          errorCode: error.errorCode,
          message: error.message,
          userId: error.context.userId,
          timestamp: error.timestamp
        });
      }

      // High frequency alert
      const recentSimilarErrors = this.errorHistory
        .filter(e => 
          e.errorCode === error.errorCode && 
          e.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
        );

      if (recentSimilarErrors.length >= 10) {
        await this.sendAlert('high_frequency_error', {
          errorCode: error.errorCode,
          frequency: recentSimilarErrors.length,
          timeWindow: '1 hour'
        });
      }

      // User impact alert
      if (error.context.userId) {
        const userProfile = this.userProfiles.get(error.context.userId);
        if (userProfile && userProfile.errorFrequency > 5) { // More than 5 errors per day
          await this.sendAlert('high_error_user', {
            userId: error.context.userId,
            errorFrequency: userProfile.errorFrequency,
            totalErrors: userProfile.totalErrors
          });
        }
      }
    } catch (alertError) {
      console.error('Failed to check real-time alerts:', alertError);
    }
  }

  /**
   * Send alert
   */
  private async sendAlert(type: string, data: any): Promise<void> {
    await loggingService.warn(`Error analytics alert: ${type}`, data);
    
    // In a real implementation, this would send to monitoring systems
    console.warn(`🚨 Error Analytics Alert [${type}]:`, data);
  }

  /**
   * Get user error profile
   */
  async getUserProfile(userId: string): Promise<UserErrorProfile | null> {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get error insights
   */
  async getErrorInsights(): Promise<{
    criticalIssues: string[];
    recommendations: string[];
    trends: string[];
  }> {
    const metrics = await this.getErrorMetrics();
    const insights = {
      criticalIssues: [],
      recommendations: [],
      trends: []
    };

    // Critical issues
    if (metrics.criticalErrorRate > 0.01) { // More than 1% critical error rate
      insights.criticalIssues.push(`High critical error rate: ${(metrics.criticalErrorRate * 100).toFixed(2)}%`);
    }

    if (metrics.recoverySuccessRate < 0.7) { // Less than 70% recovery rate
      insights.criticalIssues.push(`Low error recovery rate: ${(metrics.recoverySuccessRate * 100).toFixed(1)}%`);
    }

    if (metrics.userImpactScore > 60) {
      insights.criticalIssues.push(`High user impact score: ${metrics.userImpactScore.toFixed(1)}/100`);
    }

    // Recommendations
    const topCategory = metrics.topErrorCategories[0];
    if (topCategory && topCategory.percentage > 30) {
      insights.recommendations.push(`Focus on ${topCategory.category} errors (${topCategory.percentage.toFixed(1)}% of all errors)`);
    }

    if (metrics.averageResolutionTime > 60000) { // More than 1 minute
      insights.recommendations.push('Improve error recovery mechanisms to reduce resolution time');
    }

    // Trends
    if (metrics.errorTrends.length >= 2) {
      const recent = metrics.errorTrends[metrics.errorTrends.length - 1];
      const previous = metrics.errorTrends[metrics.errorTrends.length - 2];
      
      if (recent.errorCount > previous.errorCount * 1.2) {
        insights.trends.push('Error rate is increasing');
      } else if (recent.errorCount < previous.errorCount * 0.8) {
        insights.trends.push('Error rate is decreasing');
      }
    }

    return insights;
  }

  /**
   * Helper methods
   */
  private getSeverityWeight(severity: ErrorSeverity): number {
    const weights = {
      [ErrorSeverity.CRITICAL]: 4,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.LOW]: 1
    };
    return weights[severity] || 1;
  }

  private getMostCommon<T>(items: T[]): T[] {
    const counts = new Map<T, number>();
    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
  }

  private calculateErrorFrequency(history: ErrorHistoryEntry[]): number {
    if (history.length === 0) return 0;
    
    const daysDiff = (new Date().getTime() - history[history.length - 1].date.getTime()) / (24 * 60 * 60 * 1000);
    return daysDiff > 0 ? history.length / daysDiff : history.length;
  }

  private getMostCommonCategory(history: ErrorHistoryEntry[]): ErrorCategory {
    const categories = history.map(h => h.category);
    return this.getMostCommon(categories)[0] || ErrorCategory.UNKNOWN;
  }

  private getMostCommonSeverity(history: ErrorHistoryEntry[]): ErrorSeverity {
    const severities = history.map(h => h.severity);
    return this.getMostCommon(severities)[0] || ErrorSeverity.MEDIUM;
  }

  private calculateRecoveryRate(history: ErrorHistoryEntry[]): number {
    if (history.length === 0) return 0;
    const resolvedCount = history.filter(h => h.resolved).length;
    return resolvedCount / history.length;
  }

  private async getSessionCount(): Promise<number> {
    try {
      const sessionData = await storage.getData('SESSION_ANALYTICS');
      return sessionData?.totalSessions || 1;
    } catch {
      return 1;
    }
  }

  private isCacheValid(): boolean {
    if (!this.metricsCache) return false;
    const now = new Date();
    return (now.getTime() - this.metricsCache.timestamp.getTime()) < this.cacheValidityMs;
  }

  private async loadErrorHistory(): Promise<void> {
    try {
      const stored = await storage.getData('ERROR_ANALYTICS_HISTORY');
      if (stored && Array.isArray(stored)) {
        this.errorHistory = stored;
      }
    } catch (error) {
      console.error('Failed to load error history:', error);
    }
  }

  private async loadPatterns(): Promise<void> {
    try {
      const stored = await storage.getData('ERROR_PATTERNS');
      if (stored && Array.isArray(stored)) {
        this.patterns = stored;
      }
    } catch (error) {
      console.error('Failed to load error patterns:', error);
    }
  }

  private async loadUserProfiles(): Promise<void> {
    try {
      const stored = await storage.getData('ERROR_USER_PROFILES');
      if (stored) {
        this.userProfiles = new Map(Object.entries(stored));
      }
    } catch (error) {
      console.error('Failed to load user profiles:', error);
    }
  }

  private async persistData(): Promise<void> {
    try {
      await Promise.all([
        storage.storeData('ERROR_ANALYTICS_HISTORY', this.errorHistory.slice(0, 1000)),
        storage.storeData('ERROR_PATTERNS', this.patterns),
        storage.storeData('ERROR_USER_PROFILES', Object.fromEntries(this.userProfiles))
      ]);
    } catch (error) {
      console.error('Failed to persist analytics data:', error);
    }
  }

  private startBackgroundAnalysis(): void {
    // Run analysis every 10 minutes
    setInterval(async () => {
      try {
        await this.persistData();
        
        // Clean old data
        const cutoffDate = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000));
        this.errorHistory = this.errorHistory.filter(error => error.timestamp >= cutoffDate);
        
        // Update patterns
        await this.updatePatterns();
      } catch (error) {
        console.error('Background analysis failed:', error);
      }
    }, 10 * 60 * 1000);
  }

  private async updatePatterns(): Promise<void> {
    // Remove old patterns that haven't occurred recently
    const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days
    this.patterns = this.patterns.filter(pattern => pattern.lastSeen >= cutoffDate);
  }

  private getDefaultConfig(): AnalyticsConfig {
    return {
      enabled: true,
      retentionDays: 30,
      minPatternFrequency: 3,
      trendAnalysisDays: 7,
      userProfileEnabled: true,
      realTimeAlertsEnabled: true
    };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<AnalyticsConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await storage.storeData('ERROR_ANALYTICS_CONFIG', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Clear all analytics data
   */
  async clearAllData(): Promise<void> {
    this.errorHistory = [];
    this.patterns = [];
    this.userProfiles.clear();
    this.metricsCache = null;
    
    await Promise.all([
      storage.removeData('ERROR_ANALYTICS_HISTORY'),
      storage.removeData('ERROR_PATTERNS'),
      storage.removeData('ERROR_USER_PROFILES')
    ]);
  }
}

export const errorAnalyticsService = ErrorAnalyticsService.getInstance();