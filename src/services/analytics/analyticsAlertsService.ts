/**
 * Analytics Alerts Service
 * Monitoring and alerting system for analytics metrics
 */
import { AnalyticsService, EngagementMetrics, ContentPerformance } from './analyticsService';
import { AuditLogService } from '../compliance/auditLogService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Alert Types
export type AlertType = 
  | 'low_engagement'
  | 'high_error_rate'
  | 'performance_degradation'
  | 'content_performance_drop'
  | 'user_retention_drop'
  | 'unusual_activity'
  | 'data_anomaly';

// Alert Severity Levels
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Alert Interface
export interface AnalyticsAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: Date;
  metrics: Record<string, number>;
  threshold: number;
  currentValue: number;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  actions: AlertAction[];
}

// Alert Action Interface
export interface AlertAction {
  id: string;
  label: string;
  type: 'investigate' | 'resolve' | 'escalate' | 'ignore';
  url?: string;
  metadata?: Record<string, any>;
}

// Alert Configuration
export interface AlertConfig {
  type: AlertType;
  enabled: boolean;
  threshold: number;
  severity: AlertSeverity;
  checkInterval: number; // minutes
  cooldownPeriod: number; // minutes
  description: string;
}

// Alert Notification Interface
export interface AlertNotification {
  alertId: string;
  channel: 'email' | 'push' | 'webhook' | 'dashboard';
  recipient: string;
  sent: boolean;
  sentAt?: Date;
  error?: string;
}

export class AnalyticsAlertsService {
  private static instance: AnalyticsAlertsService;
  private analyticsService: AnalyticsService;
  private auditLogService: AuditLogService;
  private alertConfigs: Map<AlertType, AlertConfig> = new Map();
  private activeAlerts: Map<string, AnalyticsAlert> = new Map();
  private alertHistory: AnalyticsAlert[] = [];
  private checkTimer?: NodeJS.Timeout;
  private isMonitoring = false;

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    this.initializeDefaultConfigs();
  }

  public static getInstance(): AnalyticsAlertsService {
    if (!AnalyticsAlertsService.instance) {
      AnalyticsAlertsService.instance = new AnalyticsAlertsService();
    }
    return AnalyticsAlertsService.instance;
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultConfigs(): void {
    const defaultConfigs: AlertConfig[] = [
      {
        type: 'low_engagement',
        enabled: true,
        threshold: 0.1, // 10% engagement rate
        severity: 'medium',
        checkInterval: 60, // 1 hour
        cooldownPeriod: 240, // 4 hours
        description: 'Overall user engagement has dropped below threshold'
      },
      {
        type: 'high_error_rate',
        enabled: true,
        threshold: 0.05, // 5% error rate
        severity: 'high',
        checkInterval: 15, // 15 minutes
        cooldownPeriod: 60, // 1 hour
        description: 'Application error rate has exceeded acceptable threshold'
      },
      {
        type: 'performance_degradation',
        enabled: true,
        threshold: 2000, // 2 seconds
        severity: 'medium',
        checkInterval: 30, // 30 minutes
        cooldownPeriod: 120, // 2 hours
        description: 'Application performance has degraded significantly'
      },
      {
        type: 'content_performance_drop',
        enabled: true,
        threshold: 0.2, // 20% drop in performance
        severity: 'low',
        checkInterval: 120, // 2 hours
        cooldownPeriod: 480, // 8 hours
        description: 'Content performance has dropped significantly'
      },
      {
        type: 'user_retention_drop',
        enabled: true,
        threshold: 0.15, // 15% drop in retention
        severity: 'high',
        checkInterval: 240, // 4 hours
        cooldownPeriod: 720, // 12 hours
        description: 'User retention rates have dropped below threshold'
      },
      {
        type: 'unusual_activity',
        enabled: true,
        threshold: 3, // 3 standard deviations
        severity: 'medium',
        checkInterval: 30, // 30 minutes
        cooldownPeriod: 120, // 2 hours
        description: 'Unusual activity patterns detected'
      },
      {
        type: 'data_anomaly',
        enabled: true,
        threshold: 2.5, // 2.5 standard deviations
        severity: 'low',
        checkInterval: 60, // 1 hour
        cooldownPeriod: 240, // 4 hours
        description: 'Data anomalies detected in analytics metrics'
      }
    ];

    defaultConfigs.forEach(config => {
      this.alertConfigs.set(config.type, config);
    });
  }

  /**
   * Start monitoring analytics metrics
   */
  public async startMonitoring(): Promise<void> {
    try {
      if (this.isMonitoring) {
        return;
      }

      // Load existing alerts and configurations
      await this.loadAlertsFromStorage();
      await this.loadConfigsFromStorage();

      this.isMonitoring = true;
      this.scheduleNextCheck();

      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'ANALYTICS_MONITORING_STARTED',
        resourceType: 'ANALYTICS_ALERTS',
        resourceId: 'monitoring_service',
        ipAddress: 'system',
        userAgent: 'AnalyticsAlertsService',
        success: true
      });

      console.log('Analytics alerts monitoring started');
    } catch (error) {
      console.error('Failed to start analytics monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring analytics metrics
   */
  public async stopMonitoring(): Promise<void> {
    try {
      this.isMonitoring = false;
      
      if (this.checkTimer) {
        clearTimeout(this.checkTimer);
        this.checkTimer = undefined;
      }

      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'ANALYTICS_MONITORING_STOPPED',
        resourceType: 'ANALYTICS_ALERTS',
        resourceId: 'monitoring_service',
        ipAddress: 'system',
        userAgent: 'AnalyticsAlertsService',
        success: true
      });

      console.log('Analytics alerts monitoring stopped');
    } catch (error) {
      console.error('Failed to stop analytics monitoring:', error);
      throw error;
    }
  }

  /**
   * Check all metrics and generate alerts
   */
  public async checkMetrics(): Promise<AnalyticsAlert[]> {
    const newAlerts: AnalyticsAlert[] = [];

    try {
      // Get current analytics data
      const engagementMetrics = await this.analyticsService.getEngagementMetrics();
      const contentPerformance = await this.analyticsService.getContentPerformance();
      const userBehavior = await this.analyticsService.getUserBehaviorAnalytics();

      // Check each alert type
      for (const [alertType, config] of this.alertConfigs.entries()) {
        if (!config.enabled) continue;

        // Skip if in cooldown period
        if (this.isInCooldown(alertType)) continue;

        let alert: AnalyticsAlert | null = null;

        switch (alertType) {
          case 'low_engagement':
            alert = await this.checkEngagementAlert(engagementMetrics, config);
            break;
          case 'high_error_rate':
            alert = await this.checkErrorRateAlert(config);
            break;
          case 'performance_degradation':
            alert = await this.checkPerformanceAlert(config);
            break;
          case 'content_performance_drop':
            alert = await this.checkContentPerformanceAlert(contentPerformance, config);
            break;
          case 'user_retention_drop':
            alert = await this.checkRetentionAlert(userBehavior, config);
            break;
          case 'unusual_activity':
            alert = await this.checkUnusualActivityAlert(engagementMetrics, config);
            break;
          case 'data_anomaly':
            alert = await this.checkDataAnomalyAlert(engagementMetrics, config);
            break;
        }

        if (alert) {
          newAlerts.push(alert);
          this.activeAlerts.set(alert.id, alert);
          this.alertHistory.push(alert);
        }
      }

      // Save alerts to storage
      if (newAlerts.length > 0) {
        await this.saveAlertsToStorage();
        await this.notifyAlerts(newAlerts);
      }

      return newAlerts;
    } catch (error) {
      console.error('Failed to check analytics metrics:', error);
      return [];
    }
  }

  /**
   * Get all active alerts
   */
  public getActiveAlerts(): AnalyticsAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.isResolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit?: number): AnalyticsAlert[] {
    const sorted = this.alertHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        return false;
      }

      alert.isResolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;

      await this.saveAlertsToStorage();

      await this.auditLogService.logDataAccess({
        userId: resolvedBy,
        action: 'ANALYTICS_ALERT_RESOLVED',
        resourceType: 'ANALYTICS_ALERT',
        resourceId: alertId,
        ipAddress: 'admin_panel',
        userAgent: 'AdminPanel',
        success: true,
        details: {
          alertType: alert.type,
          severity: alert.severity
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  }

  /**
   * Update alert configuration
   */
  public async updateAlertConfig(
    alertType: AlertType,
    config: Partial<AlertConfig>
  ): Promise<void> {
    try {
      const existingConfig = this.alertConfigs.get(alertType);
      if (!existingConfig) {
        throw new Error(`Alert configuration not found for type: ${alertType}`);
      }

      const updatedConfig = { ...existingConfig, ...config };
      this.alertConfigs.set(alertType, updatedConfig);

      await this.saveConfigsToStorage();

      console.log(`Alert configuration updated for ${alertType}:`, updatedConfig);
    } catch (error) {
      console.error('Failed to update alert configuration:', error);
      throw error;
    }
  }

  /**
   * Get alert configuration
   */
  public getAlertConfig(alertType: AlertType): AlertConfig | undefined {
    return this.alertConfigs.get(alertType);
  }

  /**
   * Get all alert configurations
   */
  public getAllAlertConfigs(): AlertConfig[] {
    return Array.from(this.alertConfigs.values());
  }

  // Private helper methods

  private scheduleNextCheck(): void {
    if (!this.isMonitoring) return;

    // Find the shortest check interval
    const minInterval = Math.min(
      ...Array.from(this.alertConfigs.values())
        .filter(config => config.enabled)
        .map(config => config.checkInterval)
    );

    this.checkTimer = setTimeout(async () => {
      await this.checkMetrics();
      this.scheduleNextCheck();
    }, minInterval * 60 * 1000); // Convert minutes to milliseconds
  }

  private isInCooldown(alertType: AlertType): boolean {
    const config = this.alertConfigs.get(alertType);
    if (!config) return false;

    const lastAlert = this.alertHistory
      .filter(alert => alert.type === alertType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (!lastAlert) return false;

    const cooldownEnd = new Date(lastAlert.timestamp.getTime() + config.cooldownPeriod * 60 * 1000);
    return new Date() < cooldownEnd;
  }

  private async checkEngagementAlert(
    metrics: EngagementMetrics,
    config: AlertConfig
  ): Promise<AnalyticsAlert | null> {
    const totalEngagements = metrics.tipLikes + metrics.tipBookmarks + 
                            metrics.tipCompletions + metrics.tipShares;
    const engagementRate = metrics.tipViews > 0 ? totalEngagements / metrics.tipViews : 0;

    if (engagementRate < config.threshold) {
      return {
        id: this.generateAlertId(),
        type: 'low_engagement',
        severity: config.severity,
        title: 'Low User Engagement Detected',
        description: `User engagement rate (${(engagementRate * 100).toFixed(1)}%) has dropped below the threshold of ${(config.threshold * 100).toFixed(1)}%`,
        timestamp: new Date(),
        metrics: {
          engagementRate,
          tipViews: metrics.tipViews,
          totalEngagements
        },
        threshold: config.threshold,
        currentValue: engagementRate,
        isResolved: false,
        actions: [
          {
            id: 'investigate_engagement',
            label: 'Investigate Engagement Drop',
            type: 'investigate'
          },
          {
            id: 'review_content',
            label: 'Review Content Quality',
            type: 'investigate'
          }
        ]
      };
    }

    return null;
  }

  private async checkErrorRateAlert(config: AlertConfig): Promise<AnalyticsAlert | null> {
    // This would typically get error metrics from the analytics service
    // For now, we'll simulate error rate checking
    const errorRate = 0.02; // 2% - would be calculated from actual error events

    if (errorRate > config.threshold) {
      return {
        id: this.generateAlertId(),
        type: 'high_error_rate',
        severity: config.severity,
        title: 'High Error Rate Detected',
        description: `Application error rate (${(errorRate * 100).toFixed(1)}%) has exceeded the threshold of ${(config.threshold * 100).toFixed(1)}%`,
        timestamp: new Date(),
        metrics: { errorRate },
        threshold: config.threshold,
        currentValue: errorRate,
        isResolved: false,
        actions: [
          {
            id: 'investigate_errors',
            label: 'Investigate Error Logs',
            type: 'investigate'
          },
          {
            id: 'escalate_to_dev',
            label: 'Escalate to Development Team',
            type: 'escalate'
          }
        ]
      };
    }

    return null;
  }

  private async checkPerformanceAlert(config: AlertConfig): Promise<AnalyticsAlert | null> {
    // This would typically get performance metrics from the analytics service
    const avgResponseTime = 1500; // 1.5 seconds - would be calculated from actual performance events

    if (avgResponseTime > config.threshold) {
      return {
        id: this.generateAlertId(),
        type: 'performance_degradation',
        severity: config.severity,
        title: 'Performance Degradation Detected',
        description: `Average response time (${avgResponseTime}ms) has exceeded the threshold of ${config.threshold}ms`,
        timestamp: new Date(),
        metrics: { avgResponseTime },
        threshold: config.threshold,
        currentValue: avgResponseTime,
        isResolved: false,
        actions: [
          {
            id: 'investigate_performance',
            label: 'Investigate Performance Issues',
            type: 'investigate'
          },
          {
            id: 'optimize_queries',
            label: 'Review Database Queries',
            type: 'investigate'
          }
        ]
      };
    }

    return null;
  }

  private async checkContentPerformanceAlert(
    contentPerformance: ContentPerformance[],
    config: AlertConfig
  ): Promise<AnalyticsAlert | null> {
    if (contentPerformance.length === 0) return null;

    const avgEngagementRate = contentPerformance.reduce((sum, content) => 
      sum + content.engagementRate, 0) / contentPerformance.length;

    // Compare with historical average (simplified - would use actual historical data)
    const historicalAverage = 0.25; // 25% - would be calculated from historical data
    const performanceDrop = (historicalAverage - avgEngagementRate) / historicalAverage;

    if (performanceDrop > config.threshold) {
      return {
        id: this.generateAlertId(),
        type: 'content_performance_drop',
        severity: config.severity,
        title: 'Content Performance Drop Detected',
        description: `Content engagement has dropped by ${(performanceDrop * 100).toFixed(1)}% compared to historical average`,
        timestamp: new Date(),
        metrics: {
          currentEngagementRate: avgEngagementRate,
          historicalAverage,
          performanceDrop
        },
        threshold: config.threshold,
        currentValue: performanceDrop,
        isResolved: false,
        actions: [
          {
            id: 'review_content_quality',
            label: 'Review Content Quality',
            type: 'investigate'
          },
          {
            id: 'analyze_user_feedback',
            label: 'Analyze User Feedback',
            type: 'investigate'
          }
        ]
      };
    }

    return null;
  }

  private async checkRetentionAlert(
    userBehavior: any,
    config: AlertConfig
  ): Promise<AnalyticsAlert | null> {
    if (!userBehavior) return null;

    const currentRetention = userBehavior.retentionRates.day7;
    const expectedRetention = 0.6; // 60% - would be based on historical data or industry benchmarks
    const retentionDrop = (expectedRetention - currentRetention) / expectedRetention;

    if (retentionDrop > config.threshold) {
      return {
        id: this.generateAlertId(),
        type: 'user_retention_drop',
        severity: config.severity,
        title: 'User Retention Drop Detected',
        description: `7-day user retention (${(currentRetention * 100).toFixed(1)}%) has dropped significantly`,
        timestamp: new Date(),
        metrics: {
          currentRetention,
          expectedRetention,
          retentionDrop
        },
        threshold: config.threshold,
        currentValue: retentionDrop,
        isResolved: false,
        actions: [
          {
            id: 'analyze_user_journey',
            label: 'Analyze User Journey',
            type: 'investigate'
          },
          {
            id: 'improve_onboarding',
            label: 'Review Onboarding Process',
            type: 'investigate'
          }
        ]
      };
    }

    return null;
  }

  private async checkUnusualActivityAlert(
    metrics: EngagementMetrics,
    config: AlertConfig
  ): Promise<AnalyticsAlert | null> {
    // Simplified anomaly detection - would use more sophisticated algorithms
    const currentActivity = metrics.dailyActiveUsers;
    const historicalAverage = 100; // Would be calculated from historical data
    const standardDeviation = 20; // Would be calculated from historical data
    
    const zScore = Math.abs(currentActivity - historicalAverage) / standardDeviation;

    if (zScore > config.threshold) {
      return {
        id: this.generateAlertId(),
        type: 'unusual_activity',
        severity: config.severity,
        title: 'Unusual Activity Pattern Detected',
        description: `Daily active users (${currentActivity}) shows unusual deviation from normal patterns`,
        timestamp: new Date(),
        metrics: {
          currentActivity,
          historicalAverage,
          zScore
        },
        threshold: config.threshold,
        currentValue: zScore,
        isResolved: false,
        actions: [
          {
            id: 'investigate_activity',
            label: 'Investigate Activity Patterns',
            type: 'investigate'
          },
          {
            id: 'check_external_factors',
            label: 'Check External Factors',
            type: 'investigate'
          }
        ]
      };
    }

    return null;
  }

  private async checkDataAnomalyAlert(
    metrics: EngagementMetrics,
    config: AlertConfig
  ): Promise<AnalyticsAlert | null> {
    // Check for data inconsistencies or anomalies
    const totalEngagements = metrics.tipLikes + metrics.tipBookmarks + 
                            metrics.tipCompletions + metrics.tipShares;
    
    // Anomaly: More engagements than views (impossible)
    if (totalEngagements > metrics.tipViews && metrics.tipViews > 0) {
      return {
        id: this.generateAlertId(),
        type: 'data_anomaly',
        severity: 'high',
        title: 'Data Anomaly Detected',
        description: `Data inconsistency detected: ${totalEngagements} total engagements vs ${metrics.tipViews} views`,
        timestamp: new Date(),
        metrics: {
          totalEngagements,
          tipViews: metrics.tipViews
        },
        threshold: config.threshold,
        currentValue: totalEngagements / metrics.tipViews,
        isResolved: false,
        actions: [
          {
            id: 'investigate_data_integrity',
            label: 'Investigate Data Integrity',
            type: 'investigate'
          },
          {
            id: 'check_tracking_logic',
            label: 'Review Tracking Logic',
            type: 'investigate'
          }
        ]
      };
    }

    return null;
  }

  private async notifyAlerts(alerts: AnalyticsAlert[]): Promise<void> {
    // This would implement actual notification logic (email, push, webhook, etc.)
    for (const alert of alerts) {
      console.log(`🚨 ANALYTICS ALERT: ${alert.title}`);
      console.log(`   Severity: ${alert.severity.toUpperCase()}`);
      console.log(`   Description: ${alert.description}`);
      console.log(`   Threshold: ${alert.threshold}, Current: ${alert.currentValue}`);
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async loadAlertsFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_alerts');
      if (stored) {
        const alerts: AnalyticsAlert[] = JSON.parse(stored).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
        }));
        
        this.alertHistory = alerts;
        this.activeAlerts.clear();
        
        alerts.filter(alert => !alert.isResolved).forEach(alert => {
          this.activeAlerts.set(alert.id, alert);
        });
      }
    } catch (error) {
      console.error('Failed to load alerts from storage:', error);
    }
  }

  private async saveAlertsToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem('analytics_alerts', JSON.stringify(this.alertHistory));
    } catch (error) {
      console.error('Failed to save alerts to storage:', error);
    }
  }

  private async loadConfigsFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_alert_configs');
      if (stored) {
        const configs: AlertConfig[] = JSON.parse(stored);
        configs.forEach(config => {
          this.alertConfigs.set(config.type, config);
        });
      }
    } catch (error) {
      console.error('Failed to load alert configs from storage:', error);
    }
  }

  private async saveConfigsToStorage(): Promise<void> {
    try {
      const configs = Array.from(this.alertConfigs.values());
      await AsyncStorage.setItem('analytics_alert_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save alert configs to storage:', error);
    }
  }
}