/**
 * Error Logging Service
 * Comprehensive logging service for enhanced error tracking and debugging
 */

import {
  EnhancedError,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext
} from '../../types/errors';
import { storage } from '../../utils/storage';
import { loggingService } from '../logging/loggingService';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  error?: EnhancedError;
  context?: ErrorContext;
  metadata?: Record<string, any>;
  tags?: string[];
}

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  maxLogEntries: number;
  persistToDisk: boolean;
  includeStackTrace: boolean;
  includeContext: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  batchSize: number;
  flushInterval: number; // milliseconds
}

interface LogFilter {
  level?: LogLevel;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  timeRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  searchTerm?: string;
}

interface LogStats {
  totalEntries: number;
  entriesByLevel: Record<LogLevel, number>;
  entriesByCategory: Record<ErrorCategory, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
  diskUsage: number; // bytes
}

class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Initialize the logging service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration from storage
      const storedConfig = await storage.getData('ERROR_LOGGING_CONFIG');
      if (storedConfig) {
        this.config = { ...this.config, ...storedConfig };
      }

      // Load existing log buffer
      if (this.config.persistToDisk) {
        await this.loadLogBuffer();
      }

      // Start flush timer
      this.startFlushTimer();

      this.isInitialized = true;

      await this.logInfo('Error logging service initialized', {
        config: this.config,
        bufferSize: this.logBuffer.length
      });
    } catch (error) {
      console.error('Failed to initialize error logging service:', error);
    }
  }

  /**
   * Log an enhanced error
   */
  async logError(error: EnhancedError, additionalContext?: Record<string, any>): Promise<void> {
    if (!this.shouldLog(LogLevel.ERROR)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: this.mapSeverityToLogLevel(error.severity),
      message: `[${error.errorCode}] ${error.message}`,
      error,
      context: error.context,
      metadata: {
        ...additionalContext,
        errorId: error.errorId,
        category: error.category,
        severity: error.severity,
        recoveryStrategy: error.recoveryStrategy,
        retryCount: error.retryCount,
        resolved: error.resolved
      },
      tags: this.generateTags(error)
    };

    await this.addLogEntry(logEntry);
  }

  /**
   * Log debug information
   */
  async logDebug(message: string, metadata?: Record<string, any>, context?: ErrorContext): Promise<void> {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      message,
      context,
      metadata,
      tags: ['debug']
    };

    await this.addLogEntry(logEntry);
  }

  /**
   * Log info message
   */
  async logInfo(message: string, metadata?: Record<string, any>, context?: ErrorContext): Promise<void> {
    if (!this.shouldLog(LogLevel.INFO)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: LogLevel.INFO,
      message,
      context,
      metadata,
      tags: ['info']
    };

    await this.addLogEntry(logEntry);
  }

  /**
   * Log warning message
   */
  async logWarn(message: string, metadata?: Record<string, any>, context?: ErrorContext): Promise<void> {
    if (!this.shouldLog(LogLevel.WARN)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: LogLevel.WARN,
      message,
      context,
      metadata,
      tags: ['warning']
    };

    await this.addLogEntry(logEntry);
  }

  /**
   * Log fatal error
   */
  async logFatal(message: string, error?: Error, metadata?: Record<string, any>, context?: ErrorContext): Promise<void> {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: LogLevel.FATAL,
      message,
      context,
      metadata: {
        ...metadata,
        stack: error?.stack,
        name: error?.name
      },
      tags: ['fatal', 'critical']
    };

    await this.addLogEntry(logEntry);

    // Force immediate flush for fatal errors
    await this.flushLogs();
  }

  /**
   * Add log entry to buffer
   */
  private async addLogEntry(entry: LogEntry): Promise<void> {
    try {
      // Add to buffer
      this.logBuffer.unshift(entry);

      // Maintain buffer size
      if (this.logBuffer.length > this.config.maxLogEntries) {
        this.logBuffer = this.logBuffer.slice(0, this.config.maxLogEntries);
      }

      // Also log to the main logging service
      await this.forwardToMainLogger(entry);

      // Trigger flush if buffer is full
      if (this.logBuffer.length >= this.config.batchSize) {
        await this.flushLogs();
      }
    } catch (error) {
      console.error('Failed to add log entry:', error);
    }
  }

  /**
   * Forward log entry to main logging service
   */
  private async forwardToMainLogger(entry: LogEntry): Promise<void> {
    try {
      const logData = {
        logId: entry.id,
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata,
        context: entry.context,
        tags: entry.tags
      };

      switch (entry.level) {
        case LogLevel.DEBUG:
          await loggingService.debug(entry.message, logData);
          break;
        case LogLevel.INFO:
          await loggingService.info(entry.message, logData);
          break;
        case LogLevel.WARN:
          await loggingService.warn(entry.message, logData);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          await loggingService.error(entry.message, logData);
          break;
      }
    } catch (error) {
      console.error('Failed to forward to main logger:', error);
    }
  }

  /**
   * Get log entries with optional filtering
   */
  async getLogs(filter?: LogFilter, limit?: number): Promise<LogEntry[]> {
    let filteredLogs = [...this.logBuffer];

    if (filter) {
      filteredLogs = filteredLogs.filter(entry => {
        // Level filter
        if (filter.level && entry.level !== filter.level) {
          return false;
        }

        // Category filter
        if (filter.category && entry.error?.category !== filter.category) {
          return false;
        }

        // Severity filter
        if (filter.severity && entry.error?.severity !== filter.severity) {
          return false;
        }

        // Time range filter
        if (filter.timeRange) {
          const entryTime = entry.timestamp.getTime();
          const startTime = filter.timeRange.start.getTime();
          const endTime = filter.timeRange.end.getTime();
          if (entryTime < startTime || entryTime > endTime) {
            return false;
          }
        }

        // Tags filter
        if (filter.tags && filter.tags.length > 0) {
          const hasMatchingTag = filter.tags.some(tag => 
            entry.tags?.includes(tag)
          );
          if (!hasMatchingTag) {
            return false;
          }
        }

        // Search term filter
        if (filter.searchTerm) {
          const searchTerm = filter.searchTerm.toLowerCase();
          const messageMatch = entry.message.toLowerCase().includes(searchTerm);
          const errorCodeMatch = entry.error?.errorCode.toLowerCase().includes(searchTerm);
          const categoryMatch = entry.error?.category.toLowerCase().includes(searchTerm);
          
          if (!messageMatch && !errorCodeMatch && !categoryMatch) {
            return false;
          }
        }

        return true;
      });
    }

    // Apply limit
    if (limit && limit > 0) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    return filteredLogs;
  }

  /**
   * Get logging statistics
   */
  async getLogStats(): Promise<LogStats> {
    const stats: LogStats = {
      totalEntries: this.logBuffer.length,
      entriesByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0
      },
      entriesByCategory: {} as Record<ErrorCategory, number>,
      diskUsage: 0
    };

    // Count entries by level and category
    this.logBuffer.forEach(entry => {
      stats.entriesByLevel[entry.level]++;
      
      if (entry.error?.category) {
        stats.entriesByCategory[entry.error.category] = 
          (stats.entriesByCategory[entry.error.category] || 0) + 1;
      }
    });

    // Find oldest and newest entries
    if (this.logBuffer.length > 0) {
      const timestamps = this.logBuffer.map(entry => entry.timestamp);
      stats.oldestEntry = new Date(Math.min(...timestamps.map(t => t.getTime())));
      stats.newestEntry = new Date(Math.max(...timestamps.map(t => t.getTime())));
    }

    // Calculate disk usage (approximate)
    try {
      const serializedLogs = JSON.stringify(this.logBuffer);
      stats.diskUsage = new Blob([serializedLogs]).size;
    } catch (error) {
      stats.diskUsage = 0;
    }

    return stats;
  }

  /**
   * Export logs in various formats
   */
  async exportLogs(format: 'json' | 'csv' | 'txt', filter?: LogFilter): Promise<string> {
    const logs = await this.getLogs(filter);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
        
      case 'csv':
        return this.exportToCsv(logs);
        
      case 'txt':
        return this.exportToText(logs);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export logs to CSV format
   */
  private exportToCsv(logs: LogEntry[]): string {
    const headers = [
      'Timestamp',
      'Level',
      'Message',
      'Error Code',
      'Category',
      'Severity',
      'User ID',
      'Session ID',
      'Screen',
      'Tags'
    ];

    const rows = logs.map(entry => [
      entry.timestamp.toISOString(),
      entry.level,
      `"${entry.message.replace(/"/g, '""')}"`,
      entry.error?.errorCode || '',
      entry.error?.category || '',
      entry.error?.severity || '',
      entry.context?.userId || '',
      entry.context?.sessionId || '',
      entry.context?.currentScreen || '',
      entry.tags?.join(';') || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export logs to text format
   */
  private exportToText(logs: LogEntry[]): string {
    return logs.map(entry => {
      let text = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;
      
      if (entry.error) {
        text += `\n  Error Code: ${entry.error.errorCode}`;
        text += `\n  Category: ${entry.error.category}`;
        text += `\n  Severity: ${entry.error.severity}`;
      }
      
      if (entry.context) {
        text += `\n  Context: ${entry.context.currentScreen || 'unknown'} (${entry.context.userId || 'anonymous'})`;
      }
      
      if (entry.tags && entry.tags.length > 0) {
        text += `\n  Tags: ${entry.tags.join(', ')}`;
      }
      
      return text;
    }).join('\n\n');
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    try {
      this.logBuffer = [];
      
      if (this.config.persistToDisk) {
        await storage.removeData('ERROR_LOG_BUFFER');
      }
      
      await this.logInfo('Log buffer cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<LoggingConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      
      await storage.storeData('ERROR_LOGGING_CONFIG', this.config);
      
      // Restart flush timer if interval changed
      if (newConfig.flushInterval) {
        this.startFlushTimer();
      }
      
      await this.logInfo('Logging configuration updated', { newConfig });
    } catch (error) {
      console.error('Failed to update logging config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Flush logs to persistent storage
   */
  async flushLogs(): Promise<void> {
    if (!this.config.persistToDisk || this.logBuffer.length === 0) {
      return;
    }

    try {
      await storage.storeData('ERROR_LOG_BUFFER', this.logBuffer);
      
      // Send to remote endpoint if enabled
      if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
        await this.sendToRemote(this.logBuffer.slice(0, this.config.batchSize));
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  /**
   * Send logs to remote endpoint
   */
  private async sendToRemote(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      // In a real implementation, this would send to a remote logging service
      console.log(`Sending ${logs.length} log entries to ${this.config.remoteEndpoint}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
    }
  }

  /**
   * Load log buffer from storage
   */
  private async loadLogBuffer(): Promise<void> {
    try {
      const storedBuffer = await storage.getData('ERROR_LOG_BUFFER');
      if (storedBuffer && Array.isArray(storedBuffer)) {
        this.logBuffer = storedBuffer.map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load log buffer:', error);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.config.flushInterval);
  }

  /**
   * Helper methods
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.FATAL]: 4
    };

    return levelPriority[level] >= levelPriority[this.config.level];
  }

  private mapSeverityToLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return LogLevel.FATAL;
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      default:
        return LogLevel.ERROR;
    }
  }

  private generateTags(error: EnhancedError): string[] {
    const tags = [
      'error',
      error.category.toLowerCase(),
      error.severity.toLowerCase(),
      error.errorCode.toLowerCase()
    ];

    if (error.context.currentScreen) {
      tags.push(`screen:${error.context.currentScreen.toLowerCase()}`);
    }

    if (error.context.feature) {
      tags.push(`feature:${error.context.feature.toLowerCase()}`);
    }

    if (error.resolved) {
      tags.push('resolved');
    }

    return tags;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultConfig(): LoggingConfig {
    return {
      enabled: true,
      level: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
      maxLogEntries: 1000,
      persistToDisk: true,
      includeStackTrace: true,
      includeContext: true,
      enableRemoteLogging: !__DEV__,
      batchSize: 50,
      flushInterval: 30000 // 30 seconds
    };
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    // Final flush
    this.flushLogs();
  }
}

export const errorLoggingService = ErrorLoggingService.getInstance();