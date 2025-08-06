/**
 * Analytics Alerts Service
 * Monitors analytics metrics and sends alerts when thresholds are breached
 */

import { analyticsService, AppUsageMetrics } from './analyticsService';
import { feedbackService, FeedbackStats } from '../feedback/feedbackService';
import { storage } from '../../utils/storage';

export interface AlertThreshold {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'percentage_change';
  threshold: number;
  timeWindow: 'hour' | 'day' | 'week' | 'month';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
}

export interface AlertEvent {
  id: string;
  thresholdId: string;
  thresholdName: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AlertNotification {
  id: string;
  alertEventId: string;
  channel: 'email' | 'sms' | 'push' | 'webhook';
  recipient: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}

class AnalyticsAlertsService {
  private static instance: AnalyticsAlertsService;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;

  private constructor() {}

  static getInstance(): AnalyticsAlertsService {
    if (!AnalyticsAlertsService.instance) {
      AnalyticsAlertsService.instance = new AnalyticsAlertsService();
    }
    return AnalyticsAlertsService.instance;
  }

  /**
   * Initialize default alert thresholds
   */
  async initializeDefaultThresholds(): Promise<void> {
    try {
      const existingThresholds = await this.getThresholds();
      
      if (existingThresholds.length === 0) {
        const defaultThresholds: Omit<AlertThreshold, 'id' | 'createdAt'>[] = [
          {
            name: 'Daily Active Users Drop',
            description: 'Alert when DAU drops by more than 20%',
            metric: 'daily_active_users',
            condition: 'percentage_change',
            threshold: -20,
            timeWindow: 'day',
            severity: 'high',
            isActive: true
          },
          {
            name: 'High Error Rate',
            description: 'Alert when error events exceed 50 per hour',
            metric: 'error_events_per_hour',
            condition: 'greater_than',
            threshold: 50,
            timeWindow: 'hour',
            severity: 'critical',
            isActive: true
          },
          {
            name: 'Low Engagement Rate',
            description: 'Alert when tip completion rate drops below 30%',
            metric: 'tip_completion_rate',
            condition: 'less_than',
            threshold: 0.3,
            timeWindow: 'day',
            severity: 'medium',
            isActive: true
          },
          {
            name: 'High Bounce Rate',
            description: 'Alert when bounce rate exceeds 70%',
            metric: 'bounce_rate',
            condition: 'greater_than',
            threshold: 0.7,
            timeWindow: 'day',
            severity: 'medium',
            isActive: true
          },
          {
            name: 'Critical Feedback Spike',
            description: 'Alert when critical feedback submissions spike',
            metric: 'critical_feedback_count',
            condition: 'greater_than',
            threshold: 10,
            timeWindow: 'day',
            severity: 'high',
            isActive: true
          },
          {
            name: 'App Crash Rate',
            description: 'Alert when app crashes exceed 5% of sessions',
            metric: 'crash_rate',
            condition: 'greater_than',
            threshold: 0.05,
            timeWindow: 'hour',
            severity: 'critical',
            isActive: true
          }
        ];

        for (const threshold of defaultThresholds) {
          await this.createThreshold(threshold);
        }

        console.log('✅ Default alert thresholds initialized');
      }
    } catch (error) {
      console.error('Error initializing default thresholds:', error);
    }
  }

  /**
   * Start monitoring metrics against thresholds
   */
  async startMonitoring(intervalMinutes: number = 15): Promise<void> {
    if (this.isMonitoring) {
      console.log('Monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    console.log(`🔍 Starting analytics monitoring (every ${intervalMinutes} minutes)`);

    // Run initial check
    await this.checkAllThresholds();

    // Set up recurring checks
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllThresholds();
      } catch (error) {
        console.error('Error during threshold monitoring:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('🛑 Analytics monitoring stopped');
  }

  /**
   * Check all active thresholds
   */
  async checkAllThresholds(): Promise<AlertEvent[]> {
    try {
      const thresholds = await this.getActiveThresholds();
      const triggeredAlerts: AlertEvent[] = [];

      console.log(`🔍 Checking ${thresholds.length} active thresholds...`);

      for (const threshold of thresholds) {
        try {
          const currentValue = await this.getCurrentMetricValue(threshold.metric, threshold.timeWindow);
          const isTriggered = await this.evaluateThreshold(threshold, currentValue);

          if (isTriggered) {
            const alertEvent = await this.createAlertEvent(threshold, currentValue);
            triggeredAlerts.push(alertEvent);
            
            // Send notifications
            await this.sendAlertNotifications(alertEvent);
            
            console.log(`🚨 Alert triggered: ${threshold.name} (${currentValue})`);
          }
        } catch (error) {
          console.error(`Error checking threshold ${threshold.name}:`, error);
        }
      }

      if (triggeredAlerts.length > 0) {
        console.log(`🚨 ${triggeredAlerts.length} alerts triggered`);
      } else {
        console.log('✅ All thresholds within normal ranges');
      }

      return triggeredAlerts;
    } catch (error) {
      console.error('Error checking thresholds:', error);
      return [];
    }
  }

  /**
   * Create a new alert threshold
   */
  async createThreshold(thresholdData: Omit<AlertThreshold, 'id' | 'createdAt'>): Promise<AlertThreshold> {
    try {
      const threshold: AlertThreshold = {
        ...thresholdData,
        id: this.generateId('threshold'),
        createdAt: new Date()
      };

      const thresholds = await this.getThresholds();
      thresholds.push(threshold);
      await storage.storeData('ALERT_THRESHOLDS', thresholds);

      return threshold;
    } catch (error) {
      console.error('Error creating threshold:', error);
      throw error;
    }
  }

  /**
   * Get all alert thresholds
   */
  async getThresholds(): Promise<AlertThreshold[]> {
    try {
      const thresholds = await storage.getData('ALERT_THRESHOLDS') || [];
      return thresholds.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        lastTriggered: t.lastTriggered ? new Date(t.lastTriggered) : undefined
      }));
    } catch (error) {
      console.error('Error getting thresholds:', error);
      return [];
    }
  }

  /**
   * Get active alert thresholds
   */
  async getActiveThresholds(): Promise<AlertThreshold[]> {
    const thresholds = await this.getThresholds();
    return thresholds.filter(t => t.isActive);
  }

  /**
   * Get recent alert events
   */
  async getRecentAlerts(limit: number = 50): Promise<AlertEvent[]> {
    try {
      const alerts = await storage.getData('ALERT_EVENTS') || [];
      return alerts
        .map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
          acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt) : undefined
        }))
        .sort((a: AlertEvent, b: AlertEvent) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      const alerts = await storage.getData('ALERT_EVENTS') || [];
      const alertIndex = alerts.findIndex((a: any) => a.id === alertId);
      
      if (alertIndex !== -1) {
        alerts[alertIndex].acknowledged = true;
        alerts[alertIndex].acknowledgedBy = acknowledgedBy;
        alerts[alertIndex].acknowledgedAt = new Date();
        
        await storage.storeData('ALERT_EVENTS', alerts);
        console.log(`✅ Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Get current metric value
   */
  private async getCurrentMetricValue(metric: string, timeWindow: string): Promise<number> {
    try {
      switch (metric) {
        case 'daily_active_users': {
          const appMetrics = await analyticsService.getAppUsageMetrics();
          return appMetrics?.activeUsers.daily || 0;
        }
        
        case 'weekly_active_users': {
          const appMetrics = await analyticsService.getAppUsageMetrics();
          return appMetrics?.activeUsers.weekly || 0;
        }
        
        case 'bounce_rate': {
          const appMetrics = await analyticsService.getAppUsageMetrics();
          return appMetrics?.sessionMetrics.bounceRate || 0;
        }
        
        case 'tip_completion_rate': {
          const appMetrics = await analyticsService.getAppUsageMetrics();
          return appMetrics?.userBehavior.completionRate || 0;
        }
        
        case 'critical_feedback_count': {
          const feedbackStats = await feedbackService.getFeedbackStats();
          return feedbackStats?.byPriority.critical || 0;
        }
        
        case 'error_events_per_hour': {
          // This would require querying recent error events
          // For now, return a simulated value
          return Math.floor(Math.random() * 100);
        }
        
        case 'crash_rate': {
          // This would require crash tracking
          // For now, return a simulated value
          return Math.random() * 0.1;
        }
        
        default:
          console.warn(`Unknown metric: ${metric}`);
          return 0;
      }
    } catch (error) {
      console.error(`Error getting metric value for ${metric}:`, error);
      return 0;
    }
  }

  /**
   * Evaluate if threshold is triggered
   */
  private async evaluateThreshold(threshold: AlertThreshold, currentValue: number): Promise<boolean> {
    try {
      switch (threshold.condition) {
        case 'greater_than':
          return currentValue > threshold.threshold;
          
        case 'less_than':
          return currentValue < threshold.threshold;
          
        case 'equals':
          return currentValue === threshold.threshold;
          
        case 'percentage_change': {
          // For percentage change, we need historical data
          const historicalValue = await this.getHistoricalMetricValue(
            threshold.metric, 
            threshold.timeWindow
          );
          
          if (historicalValue === 0) return false;
          
          const percentageChange = ((currentValue - historicalValue) / historicalValue) * 100;
          return threshold.threshold > 0 
            ? percentageChange > threshold.threshold
            : percentageChange < threshold.threshold;
        }
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating threshold:', error);
      return false;
    }
  }

  /**
   * Get historical metric value for comparison
   */
  private async getHistoricalMetricValue(metric: string, timeWindow: string): Promise<number> {
    // This would typically query historical data
    // For now, return a simulated historical value
    const currentValue = await this.getCurrentMetricValue(metric, timeWindow);
    return currentValue * (0.8 + Math.random() * 0.4); // ±20% variation
  }

  /**
   * Create alert event
   */
  private async createAlertEvent(threshold: AlertThreshold, currentValue: number): Promise<AlertEvent> {
    try {
      const alertEvent: AlertEvent = {
        id: this.generateId('alert'),
        thresholdId: threshold.id,
        thresholdName: threshold.name,
        metric: threshold.metric,
        currentValue,
        thresholdValue: threshold.threshold,
        severity: threshold.severity,
        message: this.generateAlertMessage(threshold, currentValue),
        timestamp: new Date(),
        acknowledged: false
      };

      // Store alert event
      const alerts = await storage.getData('ALERT_EVENTS') || [];
      alerts.push(alertEvent);
      await storage.storeData('ALERT_EVENTS', alerts);

      // Update threshold last triggered time
      const thresholds = await this.getThresholds();
      const thresholdIndex = thresholds.findIndex(t => t.id === threshold.id);
      if (thresholdIndex !== -1) {
        thresholds[thresholdIndex].lastTriggered = new Date();
        await storage.storeData('ALERT_THRESHOLDS', thresholds);
      }

      return alertEvent;
    } catch (error) {
      console.error('Error creating alert event:', error);
      throw error;
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(threshold: AlertThreshold, currentValue: number): string {
    const formattedValue = typeof currentValue === 'number' && currentValue < 1 
      ? `${(currentValue * 100).toFixed(1)}%`
      : currentValue.toString();
    
    const formattedThreshold = typeof threshold.threshold === 'number' && threshold.threshold < 1
      ? `${(threshold.threshold * 100).toFixed(1)}%`
      : threshold.threshold.toString();

    return `${threshold.name}: ${threshold.metric} is ${formattedValue} (threshold: ${formattedThreshold})`;
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alertEvent: AlertEvent): Promise<void> {
    try {
      // In a real implementation, this would send notifications via:
      // - Email (using a service like SendGrid)
      // - SMS (using a service like Twilio)
      // - Push notifications
      // - Webhook to external systems (Slack, PagerDuty, etc.)

      console.log(`📧 Sending alert notifications for: ${alertEvent.message}`);
      
      // Simulate notification sending
      const notifications: AlertNotification[] = [
        {
          id: this.generateId('notification'),
          alertEventId: alertEvent.id,
          channel: 'email',
          recipient: 'admin@healthyapp.com',
          status: 'sent',
          sentAt: new Date()
        }
      ];

      // Store notifications
      const allNotifications = await storage.getData('ALERT_NOTIFICATIONS') || [];
      allNotifications.push(...notifications);
      await storage.storeData('ALERT_NOTIFICATIONS', allNotifications);

      console.log(`✅ ${notifications.length} notifications sent for alert ${alertEvent.id}`);
    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  /**
   * Simulate threshold breach for testing
   */
  async simulateThresholdBreach(thresholdId: string): Promise<AlertEvent | null> {
    try {
      const thresholds = await this.getThresholds();
      const threshold = thresholds.find(t => t.id === thresholdId);
      
      if (!threshold) {
        throw new Error('Threshold not found');
      }

      // Generate a value that will trigger the threshold
      let simulatedValue: number;
      switch (threshold.condition) {
        case 'greater_than':
          simulatedValue = threshold.threshold + 10;
          break;
        case 'less_than':
          simulatedValue = threshold.threshold - 10;
          break;
        case 'percentage_change':
          simulatedValue = threshold.threshold < 0 ? -30 : 30; // Simulate 30% change
          break;
        default:
          simulatedValue = threshold.threshold;
      }

      const alertEvent = await this.createAlertEvent(threshold, simulatedValue);
      await this.sendAlertNotifications(alertEvent);

      console.log(`🧪 Simulated threshold breach: ${threshold.name}`);
      return alertEvent;
    } catch (error) {
      console.error('Error simulating threshold breach:', error);
      return null;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): { isMonitoring: boolean; interval?: number } {
    return {
      isMonitoring: this.isMonitoring,
      interval: this.monitoringInterval ? 15 : undefined // Default interval
    };
  }
}

export const analyticsAlertsService = AnalyticsAlertsService.getInstance();