/**
 * BioPulse Integration Service
 * Orchestrates the complete AI-powered analysis pipeline
 */

import { bioPulseAnalysisEngine, BioPulseAnalysis } from '../analysis/bioPulseAnalysisEngine';
import { bioPulseAIService, AIInsightResponse } from '../ai/bioPulseAIService';
import { bioPulseSafetyAlertService, SafetyAlert } from '../alerts/bioPulseSafetyAlertService';
import { intakeLoggingService } from '../substance/intakeLoggingService';
import { SubstanceIntake } from '../../models/SubstanceIntake';
import { loggingService } from '../logging/loggingService';

// Integration Response Interface
export interface BioPulseIntegratedResponse {
  responseId: string;
  userId: string;
  timestamp: Date;
  
  // Core Analysis
  analysis: BioPulseAnalysis;
  aiInsights: AIInsightResponse;
  safetyAlerts: SafetyAlert[];
  
  // Processing Metadata
  processingTime: number;
  componentsProcessed: string[];
  errors: IntegrationError[];
  
  // Status
  status: 'success' | 'partial' | 'failed';
  confidence: number;
}

export interface IntegrationError {
  component: string;
  error: string;
  severity: 'low' | 'medium' | 'high';
  recoverable: boolean;
}

// Real-time Monitoring Interface
export interface BioPulseMonitoringConfig {
  userId: string;
  enabled: boolean;
  
  // Monitoring Intervals
  analysisInterval: number; // minutes
  alertCheckInterval: number; // minutes
  
  // Triggers
  intakeTriggered: boolean; // Run analysis on new intake
  timeTriggered: boolean; // Run analysis on schedule
  thresholdTriggered: boolean; // Run analysis when thresholds exceeded
  
  // Thresholds
  impactThreshold: number; // Trigger analysis if impact score exceeds
  riskThreshold: number; // Trigger analysis if risk count exceeds
  
  // Notification Settings
  notifications: {
    realTimeAlerts: boolean;
    summaryReports: boolean;
    trendAnalysis: boolean;
  };
}

class BioPulseIntegrationService {
  private static instance: BioPulseIntegrationService;
  private monitoringConfigs: Map<string, BioPulseMonitoringConfig> = new Map();
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();
  private processingQueue: Map<string, Promise<BioPulseIntegratedResponse>> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): BioPulseIntegrationService {
    if (!BioPulseIntegrationService.instance) {
      BioPulseIntegrationService.instance = new BioPulseIntegrationService();
    }
    return BioPulseIntegrationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize all dependent services
      await Promise.all([
        bioPulseAnalysisEngine.initialize(),
        bioPulseAIService.initialize(),
        bioPulseSafetyAlertService.initialize()
      ]);

      this.isInitialized = true;
      await loggingService.info('BioPulse Integration Service initialized');
    } catch (error) {
      console.error('Failed to initialize integration service:', error);
      throw error;
    }
  }

  /**
   * Complete integrated analysis pipeline
   */
  async runCompleteAnalysis(userId: string): Promise<BioPulseIntegratedResponse> {
    const startTime = Date.now();
    const responseId = this.generateResponseId();
    
    // Check if analysis is already in progress
    const existingProcess = this.processingQueue.get(userId);
    if (existingProcess) {
      await loggingService.info('Analysis already in progress, waiting for completion', { userId });
      return existingProcess;
    }

    const analysisPromise = this.executeAnalysisPipeline(userId, responseId, startTime);
    this.processingQueue.set(userId, analysisPromise);

    try {
      const result = await analysisPromise;
      return result;
    } finally {
      this.processingQueue.delete(userId);
    }
  }

  /**
   * Execute the complete analysis pipeline
   */
  private async executeAnalysisPipeline(
    userId: string,
    responseId: string,
    startTime: number
  ): Promise<BioPulseIntegratedResponse> {
    const errors: IntegrationError[] = [];
    const componentsProcessed: string[] = [];
    let analysis: BioPulseAnalysis | null = null;
    let aiInsights: AIInsightResponse | null = null;
    let safetyAlerts: SafetyAlert[] = [];

    try {
      await loggingService.info('Starting integrated analysis pipeline', { userId, responseId });

      // Step 1: Core Analysis
      try {
        analysis = await bioPulseAnalysisEngine.analyzeCurrentState(userId);
        componentsProcessed.push('analysis');
        
        await loggingService.info('Core analysis completed', {
          userId,
          analysisId: analysis.analysisId,
          impactScore: analysis.impactScore.overall,
          riskCount: analysis.interactionRisks.length
        });
      } catch (error) {
        errors.push({
          component: 'analysis',
          error: error.message,
          severity: 'high',
          recoverable: false
        });
        throw error; // Core analysis failure is not recoverable
      }

      // Step 2: Get Recent Intakes for AI Context
      let recentIntakes: SubstanceIntake[] = [];
      try {
        recentIntakes = await intakeLoggingService.getRecentIntakes(userId, 24);
        componentsProcessed.push('intake_context');
      } catch (error) {
        errors.push({
          component: 'intake_context',
          error: error.message,
          severity: 'medium',
          recoverable: true
        });
        // Continue without recent intakes context
      }

      // Step 3: AI Insights Generation
      try {
        aiInsights = await bioPulseAIService.generateInsights(analysis, recentIntakes);
        componentsProcessed.push('ai_insights');
        
        await loggingService.info('AI insights generated', {
          userId,
          responseId: aiInsights.responseId,
          recommendationCount: aiInsights.recommendations.length,
          warningCount: aiInsights.warnings.length
        });
      } catch (error) {
        errors.push({
          component: 'ai_insights',
          error: error.message,
          severity: 'medium',
          recoverable: true
        });
        
        // Create fallback AI response
        aiInsights = this.createFallbackAIResponse(userId, analysis);
      }

      // Step 4: Safety Alert Processing
      try {
        safetyAlerts = await bioPulseSafetyAlertService.processAnalysisForAlerts(analysis, aiInsights);
        componentsProcessed.push('safety_alerts');
        
        await loggingService.info('Safety alerts processed', {
          userId,
          alertCount: safetyAlerts.length,
          criticalAlerts: safetyAlerts.filter(a => a.severity === 'critical').length
        });
      } catch (error) {
        errors.push({
          component: 'safety_alerts',
          error: error.message,
          severity: 'medium',
          recoverable: true
        });
        // Continue without safety alerts
      }

      // Step 5: Post-processing and Optimization
      try {
        await this.performPostProcessing(userId, analysis, aiInsights, safetyAlerts);
        componentsProcessed.push('post_processing');
      } catch (error) {
        errors.push({
          component: 'post_processing',
          error: error.message,
          severity: 'low',
          recoverable: true
        });
        // Post-processing errors are not critical
      }

      const processingTime = Date.now() - startTime;
      const status = this.determineStatus(errors);
      const confidence = this.calculateOverallConfidence(analysis, aiInsights, errors);

      const response: BioPulseIntegratedResponse = {
        responseId,
        userId,
        timestamp: new Date(),
        analysis,
        aiInsights: aiInsights!,
        safetyAlerts,
        processingTime,
        componentsProcessed,
        errors,
        status,
        confidence
      };

      await loggingService.info('Integrated analysis completed', {
        userId,
        responseId,
        status,
        processingTime,
        componentsProcessed: componentsProcessed.length,
        errorCount: errors.length,
        confidence
      });

      // Trigger real-time monitoring if configured
      await this.checkMonitoringTriggers(userId, response);

      return response;

    } catch (error) {
      await loggingService.error('Integrated analysis failed', {
        userId,
        responseId,
        error: error.message,
        processingTime: Date.now() - startTime,
        componentsProcessed
      });

      // Return partial response if we have some data
      if (analysis) {
        return {
          responseId,
          userId,
          timestamp: new Date(),
          analysis,
          aiInsights: aiInsights || this.createFallbackAIResponse(userId, analysis),
          safetyAlerts,
          processingTime: Date.now() - startTime,
          componentsProcessed,
          errors: [...errors, {
            component: 'pipeline',
            error: error.message,
            severity: 'high',
            recoverable: false
          }],
          status: 'failed',
          confidence: 0.3
        };
      }

      throw error;
    }
  }

  /**
   * Start real-time monitoring for a user
   */
  async startMonitoring(userId: string, config?: Partial<BioPulseMonitoringConfig>): Promise<void> {
    const fullConfig = this.createMonitoringConfig(userId, config);
    this.monitoringConfigs.set(userId, fullConfig);

    // Stop existing monitoring if any
    await this.stopMonitoring(userId);

    if (fullConfig.enabled && fullConfig.timeTriggered) {
      const interval = setInterval(async () => {
        try {
          await this.runScheduledAnalysis(userId);
        } catch (error) {
          await loggingService.error('Scheduled analysis failed', {
            userId,
            error: error.message
          });
        }
      }, fullConfig.analysisInterval * 60 * 1000);

      this.activeMonitoring.set(userId, interval);
      
      await loggingService.info('Real-time monitoring started', {
        userId,
        analysisInterval: fullConfig.analysisInterval,
        alertCheckInterval: fullConfig.alertCheckInterval
      });
    }
  }

  /**
   * Stop real-time monitoring for a user
   */
  async stopMonitoring(userId: string): Promise<void> {
    const interval = this.activeMonitoring.get(userId);
    if (interval) {
      clearInterval(interval);
      this.activeMonitoring.delete(userId);
      
      await loggingService.info('Real-time monitoring stopped', { userId });
    }
  }

  /**
   * Handle new intake trigger
   */
  async onNewIntake(userId: string, intake: SubstanceIntake): Promise<void> {
    const config = this.monitoringConfigs.get(userId);
    
    if (config && config.enabled && config.intakeTriggered) {
      try {
        await loggingService.info('Intake-triggered analysis starting', {
          userId,
          substanceId: intake.substanceId,
          quantity: intake.quantity
        });

        const response = await this.runCompleteAnalysis(userId);
        
        // Send immediate notifications for critical alerts
        const criticalAlerts = response.safetyAlerts.filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0 && config.notifications.realTimeAlerts) {
          await this.sendImmediateNotifications(userId, criticalAlerts);
        }
        
      } catch (error) {
        await loggingService.error('Intake-triggered analysis failed', {
          userId,
          error: error.message
        });
      }
    }
  }

  /**
   * Get monitoring status for user
   */
  getMonitoringStatus(userId: string): { active: boolean; config?: BioPulseMonitoringConfig } {
    const config = this.monitoringConfigs.get(userId);
    const active = this.activeMonitoring.has(userId);
    
    return { active, config };
  }

  /**
   * Update monitoring configuration
   */
  async updateMonitoringConfig(
    userId: string, 
    updates: Partial<BioPulseMonitoringConfig>
  ): Promise<void> {
    const currentConfig = this.monitoringConfigs.get(userId) || this.createMonitoringConfig(userId);
    const updatedConfig = { ...currentConfig, ...updates };
    
    this.monitoringConfigs.set(userId, updatedConfig);
    
    // Restart monitoring with new config
    if (updatedConfig.enabled) {
      await this.startMonitoring(userId, updatedConfig);
    } else {
      await this.stopMonitoring(userId);
    }
    
    await loggingService.info('Monitoring configuration updated', { userId });
  }

  /**
   * Private helper methods
   */
  private async runScheduledAnalysis(userId: string): Promise<void> {
    const config = this.monitoringConfigs.get(userId);
    if (!config || !config.enabled) return;

    try {
      const response = await this.runCompleteAnalysis(userId);
      
      // Check if we should send notifications
      if (config.notifications.summaryReports) {
        await this.sendSummaryReport(userId, response);
      }
      
      // Check threshold triggers
      if (config.thresholdTriggered) {
        await this.checkThresholdTriggers(userId, response, config);
      }
      
    } catch (error) {
      await loggingService.error('Scheduled analysis failed', {
        userId,
        error: error.message
      });
    }
  }

  private async performPostProcessing(
    userId: string,
    analysis: BioPulseAnalysis,
    aiInsights: AIInsightResponse | null,
    safetyAlerts: SafetyAlert[]
  ): Promise<void> {
    // Cache results for faster subsequent access
    // Update user patterns and trends
    // Trigger any necessary background processes
    
    await loggingService.info('Post-processing completed', {
      userId,
      analysisId: analysis.analysisId
    });
  }

  private createFallbackAIResponse(userId: string, analysis: BioPulseAnalysis): AIInsightResponse {
    return {
      responseId: this.generateResponseId(),
      userId,
      timestamp: new Date(),
      summary: `Analysis completed with impact score of ${analysis.impactScore.overall}/100. ${analysis.interactionRisks.length} interaction risks identified.`,
      detailedAnalysis: 'Detailed AI analysis temporarily unavailable. Please refer to the core analysis data.',
      recommendations: [],
      warnings: [],
      confidence: 0.5,
      processingTime: 0,
      modelVersion: 'fallback-1.0'
    };
  }

  private determineStatus(errors: IntegrationError[]): 'success' | 'partial' | 'failed' {
    const highSeverityErrors = errors.filter(e => e.severity === 'high');
    const unrecoverableErrors = errors.filter(e => !e.recoverable);
    
    if (unrecoverableErrors.length > 0) return 'failed';
    if (highSeverityErrors.length > 0 || errors.length > 2) return 'partial';
    return 'success';
  }

  private calculateOverallConfidence(
    analysis: BioPulseAnalysis,
    aiInsights: AIInsightResponse | null,
    errors: IntegrationError[]
  ): number {
    let confidence = analysis.confidence;
    
    if (aiInsights) {
      confidence = (confidence + aiInsights.confidence) / 2;
    } else {
      confidence *= 0.7; // Reduce confidence if AI insights failed
    }
    
    // Reduce confidence based on errors
    const errorPenalty = errors.reduce((penalty, error) => {
      switch (error.severity) {
        case 'high': return penalty + 0.2;
        case 'medium': return penalty + 0.1;
        case 'low': return penalty + 0.05;
        default: return penalty;
      }
    }, 0);
    
    return Math.max(0.1, confidence - errorPenalty);
  }

  private createMonitoringConfig(
    userId: string, 
    partial?: Partial<BioPulseMonitoringConfig>
  ): BioPulseMonitoringConfig {
    return {
      userId,
      enabled: true,
      analysisInterval: 60, // 1 hour
      alertCheckInterval: 15, // 15 minutes
      intakeTriggered: true,
      timeTriggered: true,
      thresholdTriggered: true,
      impactThreshold: 70,
      riskThreshold: 2,
      notifications: {
        realTimeAlerts: true,
        summaryReports: false,
        trendAnalysis: false
      },
      ...partial
    };
  }

  private async checkMonitoringTriggers(
    userId: string, 
    response: BioPulseIntegratedResponse
  ): Promise<void> {
    const config = this.monitoringConfigs.get(userId);
    if (!config || !config.enabled) return;

    // Check if we should start monitoring based on results
    if (response.analysis.impactScore.overall >= config.impactThreshold ||
        response.safetyAlerts.length >= config.riskThreshold) {
      
      if (!this.activeMonitoring.has(userId)) {
        await this.startMonitoring(userId, config);
      }
    }
  }

  private async checkThresholdTriggers(
    userId: string,
    response: BioPulseIntegratedResponse,
    config: BioPulseMonitoringConfig
  ): Promise<void> {
    if (response.analysis.impactScore.overall >= config.impactThreshold) {
      await loggingService.info('Impact threshold exceeded', {
        userId,
        threshold: config.impactThreshold,
        actual: response.analysis.impactScore.overall
      });
      
      if (config.notifications.realTimeAlerts) {
        // Send threshold alert
      }
    }
  }

  private async sendImmediateNotifications(userId: string, alerts: SafetyAlert[]): Promise<void> {
    // Implementation would send push notifications, emails, etc.
    await loggingService.info('Immediate notifications sent', {
      userId,
      alertCount: alerts.length
    });
  }

  private async sendSummaryReport(userId: string, response: BioPulseIntegratedResponse): Promise<void> {
    // Implementation would generate and send summary report
    await loggingService.info('Summary report sent', {
      userId,
      responseId: response.responseId
    });
  }

  private generateResponseId(): string {
    return `integrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const bioPulseIntegrationService = BioPulseIntegrationService.getInstance();