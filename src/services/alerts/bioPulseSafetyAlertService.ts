/**
 * BioPulse Safety Alert System
 * Real-time monitoring and alerting for substance safety
 */

import { BioPulseAnalysis, InteractionRisk, RiskFactor } from '../analysis/bioPulseAnalysisEngine';
import { AIInsightResponse, AIWarning } from '../ai/bioPulseAIService';
import { SubstanceIntake } from '../../models/SubstanceIntake';
import { loggingService } from '../logging/loggingService';

// Alert Interfaces
export interface SafetyAlert {
  alertId: string;
  userId: string;
  timestamp: Date;
  
  // Alert Classification
  severity: 'info' | 'caution' | 'warning' | 'critical' | 'emergency';
  category: 'interaction' | 'dosage' | 'timing' | 'pattern' | 'physiological';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  
  // Alert Content
  title: string;
  message: string;
  detailedDescription: string;
  
  // Action Items
  immediateActions: AlertAction[];
  monitoringInstructions: string[];
  followUpActions: AlertAction[];
  
  // Context
  triggerData: AlertTriggerData;
  relatedSubstances: string[];
  timeWindow: number; // hours
  
  // Metadata
  confidence: number;
  source: 'analysis' | 'ai' | 'pattern' | 'manual';
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface AlertAction {
  actionId: string;
  type: 'immediate' | 'monitoring' | 'followup' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  instructions: string[];
  timeframe: string;
  completed: boolean;
  completedAt?: Date;
}

export interface AlertTriggerData {
  triggerId: string;
  triggerType: 'threshold' | 'interaction' | 'pattern' | 'ai_insight';
  triggerValue: any;
  thresholdExceeded?: number;
  comparisonValue?: number;
  contextData: Record<string, any>;
}

// Alert Configuration
export interface AlertConfiguration {
  userId: string;
  
  // Severity Thresholds
  impactScoreThresholds: {
    warning: number;
    critical: number;
  };
  
  // Interaction Settings
  interactionAlerts: {
    enabled: boolean;
    criticalOnly: boolean;
    includeModerate: boolean;
  };
  
  // Pattern Detection
  patternAlerts: {
    enabled: boolean;
    frequencyThreshold: number; // intakes per day
    escalationThreshold: number; // % increase
  };
  
  // Notification Preferences
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  
  // Quiet Hours
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    emergencyOverride: boolean;
  };
}

// Alert Rules Engine
interface AlertRule {
  ruleId: string;
  name: string;
  category: string;
  condition: (analysis: BioPulseAnalysis, config: AlertConfiguration) => boolean;
  severity: SafetyAlert['severity'];
  urgency: SafetyAlert['urgency'];
  generateAlert: (analysis: BioPulseAnalysis, config: AlertConfiguration) => Partial<SafetyAlert>;
}

class BioPulseSafetyAlertService {
  private static instance: BioPulseSafetyAlertService;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, SafetyAlert[]> = new Map(); // userId -> alerts
  private alertConfigurations: Map<string, AlertConfiguration> = new Map();
  private alertHistory: Map<string, SafetyAlert[]> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initializeAlertRules();
  }

  static getInstance(): BioPulseSafetyAlertService {
    if (!BioPulseSafetyAlertService.instance) {
      BioPulseSafetyAlertService.instance = new BioPulseSafetyAlertService();
    }
    return BioPulseSafetyAlertService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadAlertConfigurations();
      this.isInitialized = true;
      
      await loggingService.info('BioPulse Safety Alert Service initialized');
    } catch (error) {
      console.error('Failed to initialize safety alert service:', error);
      throw error;
    }
  }

  /**
   * Process analysis and generate safety alerts
   */
  async processAnalysisForAlerts(
    analysis: BioPulseAnalysis,
    aiInsights?: AIInsightResponse
  ): Promise<SafetyAlert[]> {
    try {
      const config = await this.getAlertConfiguration(analysis.userId);
      const newAlerts: SafetyAlert[] = [];

      // Process each alert rule
      for (const [ruleId, rule] of this.alertRules.entries()) {
        try {
          if (rule.condition(analysis, config)) {
            const alertData = rule.generateAlert(analysis, config);
            const alert = await this.createAlert(analysis.userId, rule, alertData, analysis);
            newAlerts.push(alert);
          }
        } catch (error) {
          await loggingService.error('Alert rule processing failed', {
            ruleId,
            userId: analysis.userId,
            error: error.message
          });
        }
      }

      // Process AI-generated warnings
      if (aiInsights && aiInsights.warnings.length > 0) {
        const aiAlerts = await this.processAIWarnings(analysis.userId, aiInsights.warnings, config);
        newAlerts.push(...aiAlerts);
      }

      // Store and activate alerts
      if (newAlerts.length > 0) {
        await this.activateAlerts(analysis.userId, newAlerts);
      }

      await loggingService.info('Safety alerts processed', {
        userId: analysis.userId,
        analysisId: analysis.analysisId,
        alertCount: newAlerts.length,
        severities: this.countAlertsBySeverity(newAlerts)
      });

      return newAlerts;
    } catch (error) {
      await loggingService.error('Alert processing failed', {
        userId: analysis.userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get active alerts for user
   */
  async getActiveAlerts(userId: string): Promise<SafetyAlert[]> {
    const alerts = this.activeAlerts.get(userId) || [];
    return alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Get alert history for user
   */
  async getAlertHistory(userId: string, limit: number = 50): Promise<SafetyAlert[]> {
    const history = this.alertHistory.get(userId) || [];
    return history.slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(userId: string, alertId: string): Promise<void> {
    const alerts = this.activeAlerts.get(userId) || [];
    const alert = alerts.find(a => a.alertId === alertId);
    
    if (alert) {
      alert.acknowledged = true;
      await loggingService.info('Alert acknowledged', { userId, alertId });
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(userId: string, alertId: string): Promise<void> {
    const alerts = this.activeAlerts.get(userId) || [];
    const alertIndex = alerts.findIndex(a => a.alertId === alertId);
    
    if (alertIndex !== -1) {
      const alert = alerts[alertIndex];
      alert.resolvedAt = new Date();
      
      // Move to history
      const history = this.alertHistory.get(userId) || [];
      history.unshift(alert);
      this.alertHistory.set(userId, history.slice(0, 100)); // Keep last 100
      
      // Remove from active
      alerts.splice(alertIndex, 1);
      
      await loggingService.info('Alert resolved', { userId, alertId });
    }
  }

  /**
   * Update alert configuration
   */
  async updateAlertConfiguration(userId: string, config: Partial<AlertConfiguration>): Promise<void> {
    const currentConfig = await this.getAlertConfiguration(userId);
    const updatedConfig = { ...currentConfig, ...config };
    
    this.alertConfigurations.set(userId, updatedConfig);
    
    await loggingService.info('Alert configuration updated', { userId });
  }

  /**
   * Private helper methods
   */
  private async createAlert(
    userId: string,
    rule: AlertRule,
    alertData: Partial<SafetyAlert>,
    analysis: BioPulseAnalysis
  ): Promise<SafetyAlert> {
    const alert: SafetyAlert = {
      alertId: this.generateAlertId(),
      userId,
      timestamp: new Date(),
      severity: rule.severity,
      category: rule.category as SafetyAlert['category'],
      urgency: rule.urgency,
      title: alertData.title || rule.name,
      message: alertData.message || 'Safety alert triggered',
      detailedDescription: alertData.detailedDescription || '',
      immediateActions: alertData.immediateActions || [],
      monitoringInstructions: alertData.monitoringInstructions || [],
      followUpActions: alertData.followUpActions || [],
      triggerData: alertData.triggerData || {
        triggerId: rule.ruleId,
        triggerType: 'threshold',
        triggerValue: analysis.impactScore.overall,
        contextData: {}
      },
      relatedSubstances: alertData.relatedSubstances || [],
      timeWindow: alertData.timeWindow || 24,
      confidence: alertData.confidence || 0.8,
      source: 'analysis',
      acknowledged: false,
      ...alertData
    };

    return alert;
  }

  private async processAIWarnings(
    userId: string,
    warnings: AIWarning[],
    config: AlertConfiguration
  ): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    for (const warning of warnings) {
      const alert: SafetyAlert = {
        alertId: this.generateAlertId(),
        userId,
        timestamp: new Date(),
        severity: warning.severity === 'critical' ? 'critical' : 'warning',
        category: 'interaction',
        urgency: warning.severity === 'critical' ? 'immediate' : 'high',
        title: warning.title,
        message: warning.message,
        detailedDescription: warning.details,
        immediateActions: warning.immediateActions.map(action => ({
          actionId: this.generateActionId(),
          type: 'immediate',
          priority: 'high',
          description: action,
          instructions: [action],
          timeframe: 'Immediate',
          completed: false
        })),
        monitoringInstructions: warning.monitoringAdvice,
        followUpActions: [],
        triggerData: {
          triggerId: warning.id,
          triggerType: 'ai_insight',
          triggerValue: warning.severity,
          contextData: { warningId: warning.id }
        },
        relatedSubstances: [],
        timeWindow: 24,
        confidence: 0.9,
        source: 'ai',
        acknowledged: false
      };

      alerts.push(alert);
    }

    return alerts;
  }

  private async activateAlerts(userId: string, alerts: SafetyAlert[]): Promise<void> {
    const currentAlerts = this.activeAlerts.get(userId) || [];
    currentAlerts.push(...alerts);
    this.activeAlerts.set(userId, currentAlerts);

    // Send notifications for high-priority alerts
    const urgentAlerts = alerts.filter(a => a.urgency === 'immediate' || a.severity === 'critical');
    if (urgentAlerts.length > 0) {
      await this.sendUrgentNotifications(userId, urgentAlerts);
    }
  }

  private async sendUrgentNotifications(userId: string, alerts: SafetyAlert[]): Promise<void> {
    const config = await this.getAlertConfiguration(userId);
    
    // Check quiet hours
    if (this.isQuietHours(config) && !alerts.some(a => a.severity === 'emergency')) {
      return;
    }

    // Send notifications based on user preferences
    for (const alert of alerts) {
      if (config.notifications.push) {
        await this.sendPushNotification(userId, alert);
      }
      
      if (config.notifications.email && alert.severity === 'critical') {
        await this.sendEmailNotification(userId, alert);
      }
    }
  }

  private async getAlertConfiguration(userId: string): Promise<AlertConfiguration> {
    let config = this.alertConfigurations.get(userId);
    
    if (!config) {
      config = this.getDefaultAlertConfiguration(userId);
      this.alertConfigurations.set(userId, config);
    }
    
    return config;
  }

  private getDefaultAlertConfiguration(userId: string): AlertConfiguration {
    return {
      userId,
      impactScoreThresholds: {
        warning: 70,
        critical: 85
      },
      interactionAlerts: {
        enabled: true,
        criticalOnly: false,
        includeModerate: true
      },
      patternAlerts: {
        enabled: true,
        frequencyThreshold: 5,
        escalationThreshold: 50
      },
      notifications: {
        push: true,
        email: false,
        sms: false,
        inApp: true
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        emergencyOverride: true
      }
    };
  }

  private initializeAlertRules(): void {
    const rules: AlertRule[] = [
      // Critical Impact Score Rule
      {
        ruleId: 'critical_impact_score',
        name: 'Critical Impact Level',
        category: 'physiological',
        condition: (analysis, config) => analysis.impactScore.overall >= config.impactScoreThresholds.critical,
        severity: 'critical',
        urgency: 'immediate',
        generateAlert: (analysis, config) => ({
          title: 'Critical Physiological Impact Detected',
          message: `Impact score of ${analysis.impactScore.overall}/100 requires immediate attention`,
          detailedDescription: `Your current physiological impact score has reached a critical level. This indicates significant stress on your system that requires immediate action.`,
          immediateActions: [
            {
              actionId: this.generateActionId(),
              type: 'immediate',
              priority: 'critical',
              description: 'Stop all substance intake immediately',
              instructions: ['Do not take any additional substances', 'Monitor symptoms closely'],
              timeframe: 'Immediate',
              completed: false
            },
            {
              actionId: this.generateActionId(),
              type: 'immediate',
              priority: 'critical',
              description: 'Seek medical attention if experiencing adverse effects',
              instructions: ['Call emergency services if severe symptoms', 'Contact healthcare provider'],
              timeframe: 'Immediate',
              completed: false
            }
          ],
          monitoringInstructions: [
            'Monitor vital signs every 15 minutes',
            'Track any unusual symptoms',
            'Stay hydrated and in a safe environment'
          ],
          timeWindow: 12,
          confidence: 0.95
        })
      },

      // High-Risk Interaction Rule
      {
        ruleId: 'critical_interaction_risk',
        name: 'Critical Substance Interaction',
        category: 'interaction',
        condition: (analysis, config) => analysis.interactionRisks.some(r => r.severity === 'critical'),
        severity: 'critical',
        urgency: 'immediate',
        generateAlert: (analysis, config) => {
          const criticalRisks = analysis.interactionRisks.filter(r => r.severity === 'critical');
          return {
            title: 'Critical Substance Interaction Detected',
            message: `${criticalRisks.length} critical interaction${criticalRisks.length > 1 ? 's' : ''} identified`,
            detailedDescription: criticalRisks.map(r => r.description).join('. '),
            relatedSubstances: criticalRisks.flatMap(r => r.substances),
            immediateActions: criticalRisks.flatMap(r => r.recommendations.map(rec => ({
              actionId: this.generateActionId(),
              type: 'immediate' as const,
              priority: 'critical' as const,
              description: rec,
              instructions: [rec],
              timeframe: 'Immediate',
              completed: false
            }))),
            timeWindow: Math.max(...criticalRisks.map(r => r.timeWindow)),
            confidence: 0.9
          };
        }
      },

      // Pattern Alert Rule
      {
        ruleId: 'concerning_usage_pattern',
        name: 'Concerning Usage Pattern',
        category: 'pattern',
        condition: (analysis, config) => {
          return analysis.personalizedInsights.some(i => 
            i.type === 'warning' && i.confidence > 0.7
          );
        },
        severity: 'warning',
        urgency: 'medium',
        generateAlert: (analysis, config) => {
          const concerningInsights = analysis.personalizedInsights.filter(i => 
            i.type === 'warning' && i.confidence > 0.7
          );
          return {
            title: 'Usage Pattern Requires Attention',
            message: `${concerningInsights.length} concerning pattern${concerningInsights.length > 1 ? 's' : ''} detected`,
            detailedDescription: concerningInsights.map(i => i.description).join('. '),
            followUpActions: concerningInsights.flatMap(i => 
              (i.actions || []).map(action => ({
                actionId: this.generateActionId(),
                type: 'followup' as const,
                priority: 'medium' as const,
                description: action,
                instructions: [action],
                timeframe: 'Next 24-48 hours',
                completed: false
              }))
            ),
            timeWindow: 48,
            confidence: Math.max(...concerningInsights.map(i => i.confidence))
          };
        }
      }
    ];

    rules.forEach(rule => {
      this.alertRules.set(rule.ruleId, rule);
    });
  }

  private async loadAlertConfigurations(): Promise<void> {
    // In production, this would load from persistent storage
    // For now, configurations are created on-demand
  }

  private isQuietHours(config: AlertConfiguration): boolean {
    if (!config.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= config.quietHours.startTime || currentTime <= config.quietHours.endTime;
  }

  private async sendPushNotification(userId: string, alert: SafetyAlert): Promise<void> {
    // Implementation would integrate with push notification service
    await loggingService.info('Push notification sent', { userId, alertId: alert.alertId });
  }

  private async sendEmailNotification(userId: string, alert: SafetyAlert): Promise<void> {
    // Implementation would integrate with email service
    await loggingService.info('Email notification sent', { userId, alertId: alert.alertId });
  }

  private countAlertsBySeverity(alerts: SafetyAlert[]): Record<string, number> {
    return alerts.reduce((counts, alert) => {
      counts[alert.severity] = (counts[alert.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const bioPulseSafetyAlertService = BioPulseSafetyAlertService.getInstance();