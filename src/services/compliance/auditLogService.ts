/**
 * Audit Log Service
 * Provides comprehensive audit logging for HIPAA compliance
 * Tracks all data access, modifications, and system events
 */

import { SecureStorageService } from '../security/secureStorage';
import { EncryptionService } from '../security/encryption';

export interface AuditLogEntry {
  id?: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogSummary {
  totalEntries: number;
  uniqueUsers: number;
  actionTypes: Record<string, number>;
  resourceTypes: Record<string, number>;
  timeRange: {
    earliest: Date;
    latest: Date;
  };
}

export class AuditLogService {
  private static instance: AuditLogService;
  private secureStorage: SecureStorageService;
  private encryptionService: EncryptionService;
  private logBuffer: AuditLogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    this.startPeriodicFlush();
  }

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Log a data access event
   */
  public async logDataAccess(entry: AuditLogEntry): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        ...entry,
        id: this.generateLogId(),
        timestamp: entry.timestamp || new Date(),
        success: entry.success !== false // Default to true unless explicitly false
      };

      // Add to buffer for batch processing
      this.logBuffer.push(logEntry);

      // Flush if buffer is full
      if (this.logBuffer.length >= this.bufferSize) {
        await this.flushLogs();
      }

      // For critical actions, log immediately
      if (this.isCriticalAction(entry.action)) {
        await this.flushLogs();
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }

  /**
   * Log a data modification event
   */
  public async logDataModification(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue?: any,
    newValue?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logDataAccess({
      userId,
      action,
      resourceType,
      resourceId,
      timestamp: new Date(),
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      details: {
        oldValue: oldValue ? this.sanitizeLogData(oldValue) : undefined,
        newValue: newValue ? this.sanitizeLogData(newValue) : undefined,
        modificationType: action
      }
    });
  }

  /**
   * Log a system event
   */
  public async logSystemEvent(
    action: string,
    details?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.logDataAccess({
      userId: userId || 'SYSTEM',
      action,
      resourceType: 'SYSTEM',
      resourceId: 'SYSTEM',
      timestamp: new Date(),
      ipAddress: 'localhost',
      userAgent: 'SYSTEM',
      details
    });
  }

  /**
   * Log an authentication event
   */
  public async logAuthenticationEvent(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED',
    ipAddress: string,
    userAgent: string,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logDataAccess({
      userId,
      action: `AUTH_${action}`,
      resourceType: 'AUTHENTICATION',
      resourceId: userId,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      success,
      details
    });
  }

  /**
   * Query audit logs
   */
  public async queryAuditLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      // First flush any pending logs
      await this.flushLogs();

      const allLogs = await this.getAllStoredLogs();
      let filteredLogs = allLogs;

      // Apply filters
      if (query.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
      }

      if (query.action) {
        filteredLogs = filteredLogs.filter(log => log.action === query.action);
      }

      if (query.resourceType) {
        filteredLogs = filteredLogs.filter(log => log.resourceType === query.resourceType);
      }

      if (query.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= query.startDate!
        );
      }

      if (query.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= query.endDate!
        );
      }

      // Sort by timestamp (newest first)
      filteredLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      
      return filteredLogs.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific user
   */
  public async getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    return await this.queryAuditLogs({
      userId,
      limit
    });
  }

  /**
   * Get audit log summary
   */
  public async getAuditLogSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLogSummary> {
    try {
      const logs = await this.queryAuditLogs({
        startDate,
        endDate,
        limit: 10000 // Get a large sample for summary
      });

      const uniqueUsers = new Set(logs.map(log => log.userId)).size;
      const actionTypes: Record<string, number> = {};
      const resourceTypes: Record<string, number> = {};
      
      let earliest = new Date();
      let latest = new Date(0);

      logs.forEach(log => {
        // Count action types
        actionTypes[log.action] = (actionTypes[log.action] || 0) + 1;
        
        // Count resource types
        resourceTypes[log.resourceType] = (resourceTypes[log.resourceType] || 0) + 1;
        
        // Track time range
        const logTime = new Date(log.timestamp);
        if (logTime < earliest) earliest = logTime;
        if (logTime > latest) latest = logTime;
      });

      return {
        totalEntries: logs.length,
        uniqueUsers,
        actionTypes,
        resourceTypes,
        timeRange: {
          earliest,
          latest
        }
      };
    } catch (error) {
      console.error('Failed to generate audit log summary:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance reporting
   */
  public async exportAuditLogs(
    query: AuditLogQuery,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const logs = await this.queryAuditLogs(query);
      
      if (format === 'csv') {
        return this.convertLogsToCSV(logs);
      } else {
        return JSON.stringify(logs, null, 2);
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Check if auditing is active
   */
  public async isAuditingActive(): Promise<boolean> {
    try {
      // Check if we can write and read audit logs
      const testEntry: AuditLogEntry = {
        userId: 'SYSTEM',
        action: 'AUDIT_TEST',
        resourceType: 'SYSTEM',
        resourceId: 'AUDIT_SERVICE',
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM'
      };

      await this.logDataAccess(testEntry);
      await this.flushLogs();
      
      return true;
    } catch (error) {
      console.error('Auditing system check failed:', error);
      return false;
    }
  }

  /**
   * Purge old audit logs based on retention policy
   */
  public async purgeOldLogs(retentionDays: number = 2555): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const allLogs = await this.getAllStoredLogs();
      const logsToKeep = allLogs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );
      
      const purgedCount = allLogs.length - logsToKeep.length;

      if (purgedCount > 0) {
        await this.saveLogsToStorage(logsToKeep);
        
        // Log the purge operation
        await this.logSystemEvent('AUDIT_LOGS_PURGED', {
          purgedCount,
          retentionDays,
          cutoffDate: cutoffDate.toISOString()
        });
      }

      return purgedCount;
    } catch (error) {
      console.error('Failed to purge old audit logs:', error);
      throw error;
    }
  }

  /**
   * Flush buffered logs to storage
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // Get existing logs
      const existingLogs = await this.getAllStoredLogs();
      
      // Combine with new logs
      const allLogs = [...existingLogs, ...logsToFlush];
      
      // Save to storage
      await this.saveLogsToStorage(allLogs);
      
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Put logs back in buffer if flush failed
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  /**
   * Start periodic log flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushLogs();
    }, this.flushInterval);
  }

  /**
   * Stop periodic log flushing
   */
  public stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Get all stored logs from secure storage
   */
  private async getAllStoredLogs(): Promise<AuditLogEntry[]> {
    try {
      const storedLogs = await this.secureStorage.getItem('audit_logs');
      if (!storedLogs) return [];
      
      const logs = JSON.parse(storedLogs);
      return Array.isArray(logs) ? logs : [];
    } catch (error) {
      console.error('Failed to retrieve stored audit logs:', error);
      return [];
    }
  }

  /**
   * Save logs to secure storage
   */
  private async saveLogsToStorage(logs: AuditLogEntry[]): Promise<void> {
    try {
      // Keep only the most recent logs to prevent storage bloat
      const maxLogs = 10000;
      const logsToSave = logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxLogs);

      await this.secureStorage.setItem('audit_logs', JSON.stringify(logsToSave));
    } catch (error) {
      console.error('Failed to save audit logs to storage:', error);
      throw error;
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if action is critical and requires immediate logging
   */
  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'AUTH_LOGIN_FAILED',
      'AUTH_ACCOUNT_LOCKED',
      'DATA_DELETION_REQUESTED',
      'COMPLIANCE_VIOLATION',
      'SECURITY_INCIDENT',
      'BREACH_HANDLING',
      'UNAUTHORIZED_ACCESS'
    ];
    
    return criticalActions.includes(action);
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Convert logs to CSV format
   */
  private convertLogsToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID', 'User ID', 'Action', 'Resource Type', 'Resource ID',
      'Timestamp', 'IP Address', 'User Agent', 'Success', 'Details'
    ];

    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.id || '',
        log.userId,
        log.action,
        log.resourceType,
        log.resourceId,
        log.timestamp.toISOString(),
        log.ipAddress,
        log.userAgent,
        log.success?.toString() || 'true',
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.stopPeriodicFlush();
    await this.flushLogs();
  }
}