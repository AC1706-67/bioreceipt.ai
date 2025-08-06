/**
 * Error Integration Service
 * Central service that integrates all error handling components
 */

import { enhancedErrorHandler } from './enhancedErrorHandler';
import { errorAnalyticsService } from './errorAnalyticsService';
import { errorReportingService } from './errorReportingService';
import { errorLoggingService } from './errorLoggingService';
import {
  EnhancedError,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext
} from '../../types/errors';
import { loggingService } from '../logging/loggingService';

interface IntegrationConfig {
  enableAnalytics: boolean;
  enableReporting: boolean;
  enableLogging: boolean;
  enableRealTimeAlerts: boolean;
  autoRecovery: boolean;
  debugMode: boolean;
}

interface ErrorHandlingResult {
  error: EnhancedError;
  handled: boolean;
  recovered: boolean;
  reported: boolean;
  logged: boolean;
  analyzed: boolean;
}

interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  errorRate: number;
  criticalErrorRate: number;
  recoveryRate: number;
  systemLoad: number;
  lastCheck: Date;
  issues: string[];
  recommendations: string[];
}

class ErrorIntegrationService {
  private static instance: ErrorIntegrationService;
  private config: IntegrationConfig;
  private isInitialized = false;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): ErrorIntegrationService {
    if (!ErrorIntegrationService.instance) {
      ErrorIntegrationService.instance = new ErrorIntegrationService();
    }
    return ErrorIntegrationService.instance;
  }

  /**
   * Initialize the integration service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await loggingService.info('Initializing error integration service');

      // Set up error listeners
      this.setupErrorListeners();

      // Start health monitoring
      this.startHealthMonitoring();

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      this.isInitialized = true;

      await loggingService.info('Error integration service initialized successfully', {
        config: this.config
      });
    } catch (error) {
      console.error('Failed to initialize error integration service:', error);
      throw error;
    }
  }

  /**
   * Handle error through the complete pipeline
   */
  async handleError(
    error: Error,
    context?: Partial<ErrorContext>,
    options?: {
      skipAnalytics?: boolean;
      skipReporting?: boolean;
      skipLogging?: boolean;
      skipRecovery?: boolean;
    }
  ): Promise<ErrorHandlingResult> {
    const result: ErrorHandlingResult = {
      error: null as any,
      handled: false,
      recovered: false,
      reported: false,
      logged: false,
      analyzed: false
    };

    try {
      // Step 1: Enhanced error processing
      const enhancedError = await enhancedErrorHandler.handleError(error, context, {
        skipRecovery: options?.skipRecovery,
        skipAnalytics: options?.skipAnalytics,
        skipLogging: options?.skipLogging
      });

      result.error = enhancedError;
      result.handled = true;

      // Step 2: Logging
      if (this.config.enableLogging && !options?.skipLogging) {
        try {
          await errorLoggingService.logError(enhancedError, {
            handledBy: 'ErrorIntegrationService',
            timestamp: new Date().toISOString()
          });
          result.logged = true;
        } catch (loggingError) {
          console.error('Failed to log error:', loggingError);
        }
      }

      // Step 3: Analytics
      if (this.config.enableAnalytics && !options?.skipAnalytics) {
        try {
          await errorAnalyticsService.recordError(enhancedError);
          result.analyzed = true;
        } catch (analyticsError) {
          console.error('Failed to record error analytics:', analyticsError);
        }
      }

      // Step 4: Reporting
      if (this.config.enableReporting && !options?.skipReporting) {
        try {
          await errorReportingService.reportError(enhancedError);
          result.reported = true;
        } catch (reportingError) {
          console.error('Failed to report error:', reportingError);
        }
      }

      // Step 5: Check if error was recovered
      result.recovered = enhancedError.resolved || false;

      return result;
    } catch (integrationError) {
      console.error('Error in integration service:', integrationError);
      
      // Fallback: at least try to log the original error
      try {
        await loggingService.error('Error integration service failed', {
          originalError: error.message,
          integrationError: integrationError.message
        });
      } catch (fallbackError) {
        console.error('Complete error handling failure:', fallbackError);
      }

      throw integrationError;
    }
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    try {
      const [metrics, insights, stats] = await Promise.all([
        errorAnalyticsService.getErrorMetrics(),
        errorAnalyticsService.getErrorInsights(),
        enhancedErrorHandler.getErrorStatistics()
      ]);

      const status: SystemHealthStatus = {
        overall: 'healthy',
        errorRate: metrics.errorRate,
        criticalErrorRate: metrics.criticalErrorRate,
        recoveryRate: metrics.recoverySuccessRate,
        systemLoad: this.calculateSystemLoad(stats),
        lastCheck: new Date(),
        issues: [...insights.criticalIssues],
        recommendations: [...insights.recommendations]
      };

      // Determine overall health
      if (status.criticalErrorRate > 0.05 || status.errorRate > 0.2) {
        status.overall = 'critical';
      } else if (status.criticalErrorRate > 0.01 || status.errorRate > 0.1 || status.recoveryRate < 0.7) {
        status.overall = 'warning';
      }

      return status;
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        overall: 'critical',
        errorRate: 0,
        criticalErrorRate: 0,
        recoveryRate: 0,
        systemLoad: 0,
        lastCheck: new Date(),
        issues: ['Failed to retrieve system health metrics'],
        recommendations: ['Check error handling services']
      };
    }
  }

  /**
   * Perform system diagnostics
   */
  async runDiagnostics(): Promise<{
    services: Record<string, { status: 'ok' | 'error'; message: string }>;
    recommendations: string[];
    overallHealth: 'healthy' | 'warning' | 'critical';
  }> {
    const diagnostics = {
      services: {} as Record<string, { status: 'ok' | 'error'; message: string }>,
      recommendations: [] as string[],
      overallHealth: 'healthy' as 'healthy' | 'warning' | 'critical'
    };

    // Test enhanced error handler
    try {
      const testError = new Error('Diagnostic test error');
      await enhancedErrorHandler.handleError(testError, { feature: 'diagnostics' }, { 
        skipAnalytics: true, 
        skipLogging: true, 
        skipRecovery: true 
      });
      diagnostics.services.enhancedErrorHandler = { status: 'ok', message: 'Working correctly' };
    } catch (error) {
      diagnostics.services.enhancedErrorHandler = { status: 'error', message: error.message };
      diagnostics.overallHealth = 'critical';
    }

    // Test analytics service
    try {
      await errorAnalyticsService.getErrorMetrics();
      diagnostics.services.analyticsService = { status: 'ok', message: 'Working correctly' };
    } catch (error) {
      diagnostics.services.analyticsService = { status: 'error', message: error.message };
      if (diagnostics.overallHealth !== 'critical') {
        diagnostics.overallHealth = 'warning';
      }
    }

    // Test reporting service
    try {
      const stats = errorReportingService.getStatistics();
      diagnostics.services.reportingService = { 
        status: 'ok', 
        message: `${stats.pendingErrors} pending, ${stats.queuedReports} queued` 
      };
    } catch (error) {
      diagnostics.services.reportingService = { status: 'error', message: error.message };
      if (diagnostics.overallHealth !== 'critical') {
        diagnostics.overallHealth = 'warning';
      }
    }

    // Test logging service
    try {
      await errorLoggingService.logInfo('Diagnostic test log');
      const logStats = await errorLoggingService.getLogStats();
      diagnostics.services.loggingService = { 
        status: 'ok', 
        message: `${logStats.totalEntries} entries logged` 
      };
    } catch (error) {
      diagnostics.services.loggingService = { status: 'error', message: error.message };
      if (diagnostics.overallHealth !== 'critical') {
        diagnostics.overallHealth = 'warning';
      }
    }

    // Generate recommendations
    if (diagnostics.overallHealth === 'critical') {
      diagnostics.recommendations.push('Critical services are failing - immediate attention required');
    } else if (diagnostics.overallHealth === 'warning') {
      diagnostics.recommendations.push('Some services have issues - monitor closely');
    }

    Object.entries(diagnostics.services).forEach(([service, status]) => {
      if (status.status === 'error') {
        diagnostics.recommendations.push(`Fix ${service}: ${status.message}`);
      }
    });

    return diagnostics;
  }

  /**
   * Setup error listeners for cross-service communication
   */
  private setupErrorListeners(): void {
    // Listen for errors from the enhanced error handler
    enhancedErrorHandler.addErrorListener(async (error: EnhancedError) => {
      try {
        // Real-time health check on critical errors
        if (error.severity === ErrorSeverity.CRITICAL && this.config.enableRealTimeAlerts) {
          await this.handleCriticalError(error);
        }

        // Auto-recovery attempts
        if (this.config.autoRecovery && !error.resolved && error.retryCount! < 3) {
          await this.attemptAutoRecovery(error);
        }
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Handle critical errors with immediate response
   */
  private async handleCriticalError(error: EnhancedError): Promise<void> {
    try {
      await loggingService.error('Critical error detected', {
        errorId: error.errorId,
        errorCode: error.errorCode,
        message: error.message,
        context: error.context
      });

      // Immediate health check
      const health = await this.getSystemHealth();
      
      if (health.overall === 'critical') {
        // Trigger emergency protocols
        await this.triggerEmergencyProtocols(error, health);
      }
    } catch (error) {
      console.error('Failed to handle critical error:', error);
    }
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptAutoRecovery(error: EnhancedError): Promise<void> {
    try {
      // Implement recovery strategies based on error category
      switch (error.category) {
        case ErrorCategory.NETWORK:
          await this.recoverNetworkError(error);
          break;
        case ErrorCategory.STORAGE:
          await this.recoverStorageError(error);
          break;
        case ErrorCategory.UI_COMPONENT:
          await this.recoverUIError(error);
          break;
        default:
          await loggingService.info('No auto-recovery strategy for error category', {
            category: error.category,
            errorId: error.errorId
          });
      }
    } catch (recoveryError) {
      console.error('Auto-recovery failed:', recoveryError);
    }
  }

  /**
   * Recovery strategies for different error types
   */
  private async recoverNetworkError(error: EnhancedError): Promise<void> {
    // Implement network-specific recovery
    await loggingService.info('Attempting network error recovery', { errorId: error.errorId });
  }

  private async recoverStorageError(error: EnhancedError): Promise<void> {
    // Implement storage-specific recovery
    await loggingService.info('Attempting storage error recovery', { errorId: error.errorId });
  }

  private async recoverUIError(error: EnhancedError): Promise<void> {
    // Implement UI-specific recovery
    await loggingService.info('Attempting UI error recovery', { errorId: error.errorId });
  }

  /**
   * Trigger emergency protocols for system-wide issues
   */
  private async triggerEmergencyProtocols(error: EnhancedError, health: SystemHealthStatus): Promise<void> {
    await loggingService.error('Emergency protocols triggered', {
      triggerError: error.errorId,
      systemHealth: health,
      timestamp: new Date().toISOString()
    });

    // In a real implementation, this might:
    // - Send alerts to monitoring systems
    // - Trigger failover mechanisms
    // - Notify development team
    // - Enable safe mode
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', async (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        await this.handleError(error, {
          feature: 'global',
          action: 'unhandledRejection',
          metadata: { promise: promise.toString() }
        });
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', async (error) => {
        await this.handleError(error, {
          feature: 'global',
          action: 'uncaughtException'
        });
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Run health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        if (health.overall === 'critical') {
          await loggingService.error('System health critical', health);
        } else if (health.overall === 'warning') {
          await loggingService.warn('System health warning', health);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Calculate system load based on error statistics
   */
  private calculateSystemLoad(stats: any): number {
    // Simple load calculation based on error frequency and severity
    const totalErrors = stats.totalErrors || 0;
    const criticalErrors = stats.errorsBySeverity?.critical || 0;
    const highErrors = stats.errorsBySeverity?.high || 0;
    
    // Weighted load calculation (0-100)
    const load = Math.min(100, (criticalErrors * 10) + (highErrors * 5) + (totalErrors * 0.1));
    return Math.round(load);
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<IntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    await loggingService.info('Error integration config updated', { 
      newConfig,
      fullConfig: this.config 
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(): Promise<{
    totalErrorsHandled: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    averageHandlingTime: number;
    serviceHealth: Record<string, boolean>;
  }> {
    // This would track integration-specific metrics
    return {
      totalErrorsHandled: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageHandlingTime: 0,
      serviceHealth: {
        enhancedErrorHandler: true,
        analyticsService: true,
        reportingService: true,
        loggingService: true
      }
    };
  }

  /**
   * Shutdown the integration service
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Shutdown individual services
    errorReportingService.shutdown();
    errorLoggingService.shutdown();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): IntegrationConfig {
    return {
      enableAnalytics: true,
      enableReporting: !__DEV__,
      enableLogging: true,
      enableRealTimeAlerts: true,
      autoRecovery: true,
      debugMode: __DEV__
    };
  }
}

export const errorIntegrationService = ErrorIntegrationService.getInstance();