/**
 * Error Reporting Service
 * Collects, aggregates, and reports errors to external services
 */

import {
  EnhancedError,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext
} from '../../types/errors';
import { storage } from '../../utils/storage';
import { loggingService } from '../logging/loggingService';

interface ErrorReport {
  id: string;
  errors: EnhancedError[];
  summary: ErrorSummary;
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
  timestamp: Date;
  reportType: 'crash' | 'batch' | 'manual';
}

interface ErrorSummary {
  totalErrors: number;
  criticalErrors: number;
  highSeverityErrors: number;
  topCategories: Array<{ category: ErrorCategory; count: number }>;
  topErrorCodes: Array<{ code: string; count: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  memory?: number;
  storage?: number;
  networkType?: string;
  batteryLevel?: number;
}

interface AppInfo {
  version: string;
  buildNumber: string;
  environment: string;
  installDate?: Date;
  lastUpdateDate?: Date;
  userId?: string;
  sessionId?: string;
}

interface ReportingConfig {
  enabled: boolean;
  batchSize: number;
  batchInterval: number; // milliseconds
  maxStoredReports: number;
  includePII: boolean;
  endpoints: {
    crash: string;
    batch: string;
    manual: string;
  };
  retryAttempts: number;
  retryDelay: number;
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private config: ReportingConfig;
  private pendingErrors: EnhancedError[] = [];
  private reportQueue: ErrorReport[] = [];
  private batchTimer?: NodeJS.Timeout;
  private isReporting = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeService();
  }

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  /**
   * Initialize the reporting service
   */
  private async initializeService(): Promise<void> {
    try {
      // Load configuration from storage
      const storedConfig = await storage.getData('ERROR_REPORTING_CONFIG');
      if (storedConfig) {
        this.config = { ...this.config, ...storedConfig };
      }

      // Load pending reports from storage
      const storedReports = await storage.getData('PENDING_ERROR_REPORTS');
      if (storedReports && Array.isArray(storedReports)) {
        this.reportQueue = storedReports;
      }

      // Start batch reporting timer
      this.startBatchReporting();

      // Process any pending reports
      if (this.reportQueue.length > 0) {
        this.processReportQueue();
      }

      await loggingService.info('Error reporting service initialized', {
        configEnabled: this.config.enabled,
        pendingReports: this.reportQueue.length
      });
    } catch (error) {
      console.error('Failed to initialize error reporting service:', error);
    }
  }

  /**
   * Report a single error immediately (for critical errors)
   */
  async reportError(error: EnhancedError): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // For critical errors, report immediately
      if (error.severity === ErrorSeverity.CRITICAL) {
        const report = await this.createErrorReport([error], 'crash');
        await this.sendReport(report);
        return;
      }

      // For other errors, add to batch
      this.pendingErrors.push(error);

      // If batch is full, process immediately
      if (this.pendingErrors.length >= this.config.batchSize) {
        await this.processBatch();
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      await loggingService.error('Error reporting failed', {
        errorId: error.errorId,
        reportingError: reportingError.message
      });
    }
  }

  /**
   * Report multiple errors as a batch
   */
  async reportErrors(errors: EnhancedError[]): Promise<void> {
    if (!this.config.enabled || errors.length === 0) {
      return;
    }

    try {
      const report = await this.createErrorReport(errors, 'batch');
      await this.sendReport(report);
    } catch (error) {
      console.error('Failed to report errors batch:', error);
    }
  }

  /**
   * Manually trigger error report generation
   */
  async generateManualReport(): Promise<ErrorReport | null> {
    try {
      // Get recent errors from storage
      const recentErrors = await this.getRecentErrors(100);
      
      if (recentErrors.length === 0) {
        return null;
      }

      const report = await this.createErrorReport(recentErrors, 'manual');
      await this.sendReport(report);
      
      return report;
    } catch (error) {
      console.error('Failed to generate manual report:', error);
      return null;
    }
  }

  /**
   * Create error report from errors
   */
  private async createErrorReport(
    errors: EnhancedError[],
    reportType: 'crash' | 'batch' | 'manual'
  ): Promise<ErrorReport> {
    const reportId = this.generateReportId();
    const summary = this.createErrorSummary(errors);
    const deviceInfo = await this.getDeviceInfo();
    const appInfo = await this.getAppInfo();

    // Sanitize errors if PII should not be included
    const sanitizedErrors = this.config.includePII 
      ? errors 
      : errors.map(error => this.sanitizeError(error));

    return {
      id: reportId,
      errors: sanitizedErrors,
      summary,
      deviceInfo,
      appInfo,
      timestamp: new Date(),
      reportType
    };
  }

  /**
   * Create error summary from errors
   */
  private createErrorSummary(errors: EnhancedError[]): ErrorSummary {
    const categoryCount = new Map<ErrorCategory, number>();
    const codeCount = new Map<string, number>();
    let criticalErrors = 0;
    let highSeverityErrors = 0;
    let earliestTime = new Date();
    let latestTime = new Date(0);

    errors.forEach(error => {
      // Count categories
      const currentCategoryCount = categoryCount.get(error.category) || 0;
      categoryCount.set(error.category, currentCategoryCount + 1);

      // Count error codes
      const currentCodeCount = codeCount.get(error.errorCode) || 0;
      codeCount.set(error.errorCode, currentCodeCount + 1);

      // Count severity
      if (error.severity === ErrorSeverity.CRITICAL) {
        criticalErrors++;
      } else if (error.severity === ErrorSeverity.HIGH) {
        highSeverityErrors++;
      }

      // Track time range
      if (error.timestamp < earliestTime) {
        earliestTime = error.timestamp;
      }
      if (error.timestamp > latestTime) {
        latestTime = error.timestamp;
      }
    });

    // Get top categories
    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Get top error codes
    const topErrorCodes = Array.from(codeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return {
      totalErrors: errors.length,
      criticalErrors,
      highSeverityErrors,
      topCategories,
      topErrorCodes,
      timeRange: {
        start: earliestTime,
        end: latestTime
      }
    };
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      // This would integrate with device info libraries
      return {
        platform: 'unknown', // Platform.OS
        version: 'unknown', // Platform.Version
        model: 'unknown',
        memory: 0,
        storage: 0,
        networkType: 'unknown',
        batteryLevel: 0
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return {
        platform: 'unknown',
        version: 'unknown'
      };
    }
  }

  /**
   * Get app information
   */
  private async getAppInfo(): Promise<AppInfo> {
    try {
      const sessionData = await storage.getData('CURRENT_SESSION');
      
      return {
        version: '1.0.0', // This would come from app config
        buildNumber: '1',
        environment: __DEV__ ? 'development' : 'production',
        installDate: new Date(), // This would come from app install tracking
        lastUpdateDate: new Date(),
        userId: sessionData?.userId,
        sessionId: sessionData?.sessionId
      };
    } catch (error) {
      console.error('Failed to get app info:', error);
      return {
        version: '1.0.0',
        buildNumber: '1',
        environment: __DEV__ ? 'development' : 'production'
      };
    }
  }

  /**
   * Sanitize error to remove PII
   */
  private sanitizeError(error: EnhancedError): EnhancedError {
    const sanitized = { ...error };
    
    // Remove user ID and session ID
    if (sanitized.context) {
      sanitized.context = {
        ...sanitized.context,
        userId: undefined,
        sessionId: undefined
      };
    }

    // Sanitize metadata
    if (sanitized.context?.metadata) {
      sanitized.context.metadata = this.sanitizeMetadata(sanitized.context.metadata);
    }

    // Sanitize stack trace (remove file paths that might contain usernames)
    if (sanitized.stack) {
      sanitized.stack = sanitized.stack.replace(/\/Users\/[^\/]+/g, '/Users/[user]');
    }

    return sanitized;
  }

  /**
   * Sanitize metadata object
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Skip keys that might contain PII
      if (this.isPIIKey(key)) {
        continue;
      }
      
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Check if key might contain PII
   */
  private isPIIKey(key: string): boolean {
    const piiKeys = [
      'email', 'phone', 'name', 'address', 'ssn', 'credit',
      'password', 'token', 'secret', 'key', 'auth'
    ];
    
    const lowerKey = key.toLowerCase();
    return piiKeys.some(piiKey => lowerKey.includes(piiKey));
  }

  /**
   * Sanitize string value
   */
  private sanitizeString(value: string): string {
    // Remove email addresses
    let sanitized = value.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]');
    
    // Remove phone numbers
    sanitized = sanitized.replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[phone]');
    
    // Remove potential user IDs (long alphanumeric strings)
    sanitized = sanitized.replace(/\b[a-zA-Z0-9]{20,}\b/g, '[id]');
    
    return sanitized;
  }

  /**
   * Send report to external service
   */
  private async sendReport(report: ErrorReport): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const endpoint = this.getEndpointForReportType(report.reportType);
    if (!endpoint) {
      throw new Error(`No endpoint configured for report type: ${report.reportType}`);
    }

    let attempt = 0;
    while (attempt < this.config.retryAttempts) {
      try {
        // In a real implementation, this would send to an external service
        console.log(`Sending error report ${report.id} to ${endpoint}`);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await loggingService.info('Error report sent successfully', {
          reportId: report.id,
          reportType: report.reportType,
          errorCount: report.errors.length,
          endpoint
        });
        
        return; // Success
      } catch (error) {
        attempt++;
        console.error(`Failed to send error report (attempt ${attempt}):`, error);
        
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }

    // If all attempts failed, store for later retry
    this.reportQueue.push(report);
    await this.persistReportQueue();
    
    throw new Error(`Failed to send error report after ${this.config.retryAttempts} attempts`);
  }

  /**
   * Get endpoint for report type
   */
  private getEndpointForReportType(reportType: 'crash' | 'batch' | 'manual'): string | null {
    return this.config.endpoints[reportType] || null;
  }

  /**
   * Process batch of pending errors
   */
  private async processBatch(): Promise<void> {
    if (this.pendingErrors.length === 0 || this.isReporting) {
      return;
    }

    this.isReporting = true;
    
    try {
      const errors = this.pendingErrors.splice(0, this.config.batchSize);
      const report = await this.createErrorReport(errors, 'batch');
      await this.sendReport(report);
    } catch (error) {
      console.error('Failed to process error batch:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * Start batch reporting timer
   */
  private startBatchReporting(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.pendingErrors.length > 0) {
        this.processBatch();
      }
    }, this.config.batchInterval);
  }

  /**
   * Process report queue
   */
  private async processReportQueue(): Promise<void> {
    if (this.reportQueue.length === 0 || this.isReporting) {
      return;
    }

    this.isReporting = true;

    try {
      const reportsToProcess = [...this.reportQueue];
      this.reportQueue = [];

      for (const report of reportsToProcess) {
        try {
          await this.sendReport(report);
        } catch (error) {
          // If sending fails, it will be added back to the queue
          console.error(`Failed to send queued report ${report.id}:`, error);
        }
      }

      await this.persistReportQueue();
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * Persist report queue to storage
   */
  private async persistReportQueue(): Promise<void> {
    try {
      // Only keep the most recent reports
      const reportsToKeep = this.reportQueue.slice(-this.config.maxStoredReports);
      await storage.storeData('PENDING_ERROR_REPORTS', reportsToKeep);
    } catch (error) {
      console.error('Failed to persist report queue:', error);
    }
  }

  /**
   * Get recent errors from storage
   */
  private async getRecentErrors(limit: number): Promise<EnhancedError[]> {
    try {
      const storedErrors = await storage.getData('RECENT_ERRORS');
      if (storedErrors && Array.isArray(storedErrors)) {
        return storedErrors.slice(0, limit);
      }
    } catch (error) {
      console.error('Failed to get recent errors:', error);
    }
    return [];
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<ReportingConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await storage.storeData('ERROR_REPORTING_CONFIG', this.config);
      
      // Restart batch reporting with new interval
      if (newConfig.batchInterval) {
        this.startBatchReporting();
      }
      
      await loggingService.info('Error reporting config updated', { newConfig });
    } catch (error) {
      console.error('Failed to update error reporting config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ReportingConfig {
    return { ...this.config };
  }

  /**
   * Get reporting statistics
   */
  getStatistics(): {
    pendingErrors: number;
    queuedReports: number;
    isReporting: boolean;
    configEnabled: boolean;
  } {
    return {
      pendingErrors: this.pendingErrors.length,
      queuedReports: this.reportQueue.length,
      isReporting: this.isReporting,
      configEnabled: this.config.enabled
    };
  }

  /**
   * Clear all pending data
   */
  async clearPendingData(): Promise<void> {
    try {
      this.pendingErrors = [];
      this.reportQueue = [];
      await storage.removeData('PENDING_ERROR_REPORTS');
      await loggingService.info('Cleared all pending error reporting data');
    } catch (error) {
      console.error('Failed to clear pending data:', error);
    }
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    // Process any remaining errors
    if (this.pendingErrors.length > 0) {
      this.processBatch();
    }
  }

  /**
   * Helper methods
   */
  private getDefaultConfig(): ReportingConfig {
    return {
      enabled: !__DEV__, // Disable in development
      batchSize: 10,
      batchInterval: 60000, // 1 minute
      maxStoredReports: 50,
      includePII: false,
      endpoints: {
        crash: 'https://api.example.com/errors/crash',
        batch: 'https://api.example.com/errors/batch',
        manual: 'https://api.example.com/errors/manual'
      },
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const errorReportingService = ErrorReportingService.getInstance();