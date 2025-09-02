/**
 * Logging Service
 * Centralized logging system for error handling and debugging
 */

import { Platform } from 'react-native';
import { storeData, getData } from '../../utils/storage';
import { SyncService } from '../sync/syncService';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  correlationId: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  deviceInfo?: DeviceInfo;
  appInfo?: AppInfo;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  osVersion?: string;
  appVersion: string;
  buildNumber: string;
  isEmulator?: boolean;
  memoryUsage?: number;
  diskSpace?: number;
}

export interface AppInfo {
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  bundleId: string;
  installationId: string;
}

export interface ErrorContext {
  module?: string;
  method?: string;
  userId?: string;
  userAgent?: string;
  url?: string;
  component?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  [key: string]: any;
}

export interface LoggingConfig {
  enabled: boolean;
  logLevel: LogLevel;
  maxLogEntries: number;
  retentionDays: number;
  enableConsoleOutput: boolean;
  enableRemoteLogging: boolean;
  batchSize: number;
  flushInterval: number; // in milliseconds
}

/**
 * Logging Service Class
 */
export class LoggingService {
  private static instance: LoggingService;
  private syncService: SyncService;
  private config: LoggingConfig;
  private sessionId: string;
  private correlationIdCounter: number = 0;
  private logQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.syncService = SyncService.getInstance();
    this.config = {
      enabled: true,
      logLevel: __DEV__ ? 'debug' : 'error',
      maxLogEntries: 1000,
      retentionDays: 30,
      enableConsoleOutput: __DEV__,
      enableRemoteLogging: !__DEV__,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
    };
    this.sessionId = this.generateSessionId();
    this.initializeFlushTimer();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Initialize logging service with configuration
   */
  public async initialize(config?: Partial<LoggingConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Load saved config
      const savedConfig = await getData<Partial<LoggingConfig>>('LOGGING_CONFIG');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }

      // Save updated config
      await storeData('LOGGING_CONFIG', this.config);

      // Clean up old logs
      await this.cleanupOldLogs();

      console.log('Logging service initialized');
    } catch (error) {
      console.error('Error initializing logging service:', error);
    }
  }

  /**
   * Log an error with context
   */
  public async logError(
    message: string,
    error?: Error,
    context?: ErrorContext
  ): Promise<void>;
  public async logError(
    error: Error | string,
    context?: ErrorContext
  ): Promise<void>;
  public async logError(
    messageOrError: string | Error,
    errorOrContext?: Error | ErrorContext,
    context?: ErrorContext
  ): Promise<void> {
    if (!this.shouldLog('error')) return;

    try {
      let errorObj: Error;
      let finalContext: ErrorContext | undefined;

      // Handle different overload signatures
      if (typeof messageOrError === 'string') {
        if (errorOrContext instanceof Error) {
          // logError(message, error, context)
          errorObj = errorOrContext;
          errorObj.message = `${messageOrError}: ${errorObj.message}`;
          finalContext = context;
        } else {
          // logError(message, context)
          errorObj = new Error(messageOrError);
          finalContext = errorOrContext as ErrorContext;
        }
      } else {
        // logError(error, context)
        errorObj = messageOrError;
        finalContext = errorOrContext as ErrorContext;
      }
      
      const logEntry: LogEntry = {
        id: this.generateLogId(),
        level: 'error',
        message: errorObj.message,
        timestamp: new Date(),
        userId: finalContext?.userId,
        sessionId: this.sessionId,
        correlationId: this.generateCorrelationId(),
        metadata: finalContext,
        stackTrace: errorObj.stack,
        deviceInfo: await this.getDeviceInfo(),
        appInfo: this.getAppInfo(),
      };

      await this.writeLog(logEntry);

      // Also track in analytics if available
      try {
        const { AnalyticsService } = await import('../analytics/analyticsService');
        const analyticsService = AnalyticsService.getInstance();
        await analyticsService.trackEvent('error_occurred', {
          errorType: errorObj.name,
          errorMessage: errorObj.message,
          module: finalContext?.module,
          method: finalContext?.method,
          userId: finalContext?.userId,
        });
      } catch (analyticsError) {
        // Don't let analytics errors break logging
        console.warn('Failed to track error in analytics:', analyticsError);
      }
    } catch (loggingError) {
      console.error('Error in logError:', loggingError);
    }
  }

  /**
   * Log a warning message
   */
  public async logWarn(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldLog('warn')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      level: 'warn',
      message,
      timestamp: new Date(),
      sessionId: this.sessionId,
      correlationId: this.generateCorrelationId(),
      metadata: data,
      deviceInfo: await this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log a warning message (alias for logWarn for consistency)
   */
  public async logWarning(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    return this.logWarn(message, data);
  }

  /**
   * Log an info message
   */
  public async logInfo(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldLog('info')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      level: 'info',
      message,
      timestamp: new Date(),
      sessionId: this.sessionId,
      correlationId: this.generateCorrelationId(),
      metadata: data,
      deviceInfo: await this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log an info message
   */
  public async info(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldLog('info')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      level: 'info',
      message,
      timestamp: new Date(),
      sessionId: this.sessionId,
      data,
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log an error message
   */
  public async error(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldLog('error')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      level: 'error',
      message,
      timestamp: new Date(),
      sessionId: this.sessionId,
      data,
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log a debug message
   */
  public async logDebug(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldLog('debug')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      level: 'debug',
      message,
      timestamp: new Date(),
      sessionId: this.sessionId,
      correlationId: this.generateCorrelationId(),
      metadata: data,
      deviceInfo: await this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log API call errors
   */
  public async logApiError(
    endpoint: string,
    statusCode: number,
    errorMessage: string,
    requestData?: any,
    responseData?: any
  ): Promise<void> {
    await this.logError(new Error(`API Error: ${errorMessage}`), {
      module: 'api',
      method: endpoint,
      statusCode,
      requestData,
      responseData,
    });
  }

  /**
   * Log component errors (for React Error Boundaries)
   */
  public async logComponentError(
    error: Error,
    errorInfo: { componentStack: string },
    componentName?: string
  ): Promise<void> {
    await this.logError(error, {
      module: 'component',
      component: componentName,
      componentStack: errorInfo.componentStack,
    });
  }

  /**
   * Log validation errors
   */
  public async logValidationError(
    fieldName: string,
    value: any,
    validationRule: string,
    errorMessage: string
  ): Promise<void> {
    await this.logError(new Error(`Validation Error: ${errorMessage}`), {
      module: 'validation',
      fieldName,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
      validationRule,
    });
  }

  /**
   * Log performance issues
   */
  public async logPerformanceIssue(
    operation: string,
    duration: number,
    threshold: number,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logWarn(`Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, {
      module: 'performance',
      operation,
      duration,
      threshold,
      ...context,
    });
  }

  /**
   * Get all log entries
   */
  public async getAllLogs(): Promise<LogEntry[]> {
    try {
      const logs = await getData<LogEntry[]>('LOG_ENTRIES');
      return logs || [];
    } catch (error) {
      console.error('Error getting logs:', error);
      return [];
    }
  }

  /**
   * Get logs by level
   */
  public async getLogsByLevel(level: LogLevel): Promise<LogEntry[]> {
    const allLogs = await this.getAllLogs();
    return allLogs.filter(log => log.level === level);
  }

  /**
   * Get logs by date range
   */
  public async getLogsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<LogEntry[]> {
    const allLogs = await this.getAllLogs();
    return allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Get logs by correlation ID
   */
  public async getLogsByCorrelationId(correlationId: string): Promise<LogEntry[]> {
    const allLogs = await this.getAllLogs();
    return allLogs.filter(log => log.correlationId === correlationId);
  }

  /**
   * Clear all logs
   */
  public async clearAllLogs(): Promise<void> {
    try {
      await storeData('LOG_ENTRIES', []);
      this.logQueue = [];
      console.log('All logs cleared');
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }

  /**
   * Export logs for debugging
   */
  public async exportLogs(): Promise<string> {
    try {
      const logs = await this.getAllLogs();
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Error exporting logs:', error);
      return '[]';
    }
  }

  /**
   * Update logging configuration
   */
  public async updateConfig(updates: Partial<LoggingConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...updates };
      await storeData('LOGGING_CONFIG', this.config);
      
      if (updates.flushInterval) {
        this.initializeFlushTimer();
      }
      
      console.log('Logging config updated:', updates);
    } catch (error) {
      console.error('Error updating logging config:', error);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Start a new session
   */
  public startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.correlationIdCounter = 0;
  }

  // Private helper methods

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  private async writeLog(logEntry: LogEntry): Promise<void> {
    try {
      // Console output
      if (this.config.enableConsoleOutput) {
        this.outputToConsole(logEntry);
      }

      // Store locally
      await this.storeLog(logEntry);

      // Add to queue for remote logging
      if (this.config.enableRemoteLogging) {
        this.logQueue.push(logEntry);

        // Flush if queue is full
        if (this.logQueue.length >= this.config.batchSize) {
          await this.flushLogs();
        }
      }
    } catch (error) {
      console.error('Error writing log:', error);
    }
  }

  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const message = `[${timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`;

    switch (logEntry.level) {
      case 'error':
        console.error(message, logEntry.metadata, logEntry.stackTrace);
        break;
      case 'warn':
        console.warn(message, logEntry.metadata);
        break;
      case 'info':
        console.info(message, logEntry.metadata);
        break;
      case 'debug':
        console.debug(message, logEntry.metadata);
        break;
    }
  }

  private async storeLog(logEntry: LogEntry): Promise<void> {
    const allLogs = await this.getAllLogs();
    allLogs.push(logEntry);

    // Limit the number of stored logs
    if (allLogs.length > this.config.maxLogEntries) {
      allLogs.splice(0, allLogs.length - this.config.maxLogEntries);
    }

    await storeData('LOG_ENTRIES', allLogs);
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      // In a real app, you'd send logs to your remote logging service
      await this.syncService.handleOfflineAction('log_batch', {
        logs: [...this.logQueue],
        timestamp: new Date(),
      });

      this.logQueue = [];
      console.log('Logs flushed to remote service');
    } catch (error) {
      console.error('Error flushing logs:', error);
    }
  }

  private initializeFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.config.enableRemoteLogging) {
      this.flushTimer = setInterval(() => {
        this.flushLogs();
      }, this.config.flushInterval);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const allLogs = await this.getAllLogs();
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      const filteredLogs = allLogs.filter(log => 
        new Date(log.timestamp) >= cutoffDate
      );

      if (filteredLogs.length !== allLogs.length) {
        await storeData('LOG_ENTRIES', filteredLogs);
        console.log(`Cleaned up ${allLogs.length - filteredLogs.length} old log entries`);
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    this.correlationIdCounter++;
    return `${this.sessionId}_${this.correlationIdCounter.toString().padStart(4, '0')}`;
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    // In a real app, you'd use react-native-device-info
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: 'Unknown', // Would get from device-info
      osVersion: Platform.Version.toString(),
      appVersion: '1.0.0', // Would get from package.json or device-info
      buildNumber: '1', // Would get from device-info
      isEmulator: __DEV__, // Would get from device-info
      memoryUsage: 0, // Would get from device-info
      diskSpace: 0, // Would get from device-info
    };
  }

  private getAppInfo(): AppInfo {
    return {
      version: '1.0.0', // Would get from package.json
      buildNumber: '1', // Would get from build system
      environment: __DEV__ ? 'development' : 'production',
      bundleId: 'com.BioReceipt', // Would get from app config
      installationId: 'unknown', // Would generate and store on first launch
    };
  }
}// 
// Export singleton instance
export const loggingService = LoggingService.getInstance();