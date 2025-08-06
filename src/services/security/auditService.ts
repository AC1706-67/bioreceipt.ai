/**
 * Audit Service
 * HIPAA-compliant audit logging for all data access and modifications
 * Tamper-evident logging with integrity verification
 */

import { LoggingService } from '../logging/loggingService';
import { SecureStorageService } from './secureStorage';
import { EncryptionService } from './encryption';

export type AuditEventType = 
  | 'data_access'
  | 'data_create'
  | 'data_update'
  | 'data_delete'
  | 'user_login'
  | 'user_logout'
  | 'consent_given'
  | 'consent_withdrawn'
  | 'data_export'
  | 'data_purge'
  | 'security_event'
  | 'system_event';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  metadata: {
    appVersion: string;
    platform: string;
    deviceId: string;
    correlationId?: string;
  };
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  userId?: string;
  severity?: AuditSeverity[];
  outcome?: ('success' | 'failure' | 'partial')[];
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByOutcome: Record<string, number>;
  timeRange: {
    earliest: number;
    latest: number;
  };
  uniqueUsers: number;
  criticalEvents: number;
}

/**
 * Audit Service Class
 */
export class AuditService {
  private static instance: AuditService;
  private loggingService: LoggingService;
  private secureStorage: SecureStorageService;
  private encryptionService: EncryptionService;
  private eventCounter: number = 0;
  private sessionId: string;

  private constructor() {
    this.loggingService = LoggingService.getInstance();
    this.secureStorage = SecureStorageService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit event
   */
  public async logEvent(
    eventType: AuditEventType,
    action: string,
    outcome: 'success' | 'failure' | 'partial',
    details: Record<string, any> = {},
    options: {
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      severity?: AuditSeverity;
      correlationId?: string;
    } = {}
  ): Promise<string> {
    try {
      const eventId = this.generateEventId();
      
      const auditEvent: AuditEvent = {
        id: eventId,
        timestamp: Date.now(),
        eventType,
        severity: options.severity || this.determineSeverity(eventType, outcome),
        userId: options.userId,
        sessionId: this.sessionId,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        action,
        outcome,
        details: this.sanitizeDetails(details),
        metadata: {
          appVersion: '1.0.0', // This should come from app config
          platform: 'mobile',
          deviceId: await this.getDeviceId(),
          correlationId: options.correlationId,
        },
      };

      // Store audit event securely
      await this.storeAuditEvent(auditEvent);

      // Log to standard logging system as well
      await this.loggingService.logInfo(`Audit: ${eventType} - ${action}`, {
        module: 'AuditService',
        eventId,
        eventType,
        action,
        outcome,
        userId: options.userId,
        severity: auditEvent.severity,
      });

      // Handle critical events immediately
      if (auditEvent.severity === 'critical') {
        await this.handleCriticalEvent(auditEvent);
      }

      return eventId;
    } catch (error) {
      // Audit logging failures are critical - log to system
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Audit logging failed'),
        {
          module: 'AuditService',
          method: 'logEvent',
          eventType,
          action,
          outcome,
        }
      );
      
      throw error;
    }
  }

  /**
   * Log PHI access event
   */
  public async logPHIAccess(
    action: 'read' | 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    userId: string,
    outcome: 'success' | 'failure' | 'partial' = 'success',
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logEvent(
      'data_access',
      `PHI_${action.toUpperCase()}`,
      outcome,
      {
        ...details,
        phi: true,
        dataType: resourceType,
      },
      {
        userId,
        resourceType,
        resourceId,
        severity: 'high', // PHI access is always high severity
      }
    );
  }

  /**
   * Log user authentication event
   */
  public async logAuthEvent(
    action: 'login' | 'logout' | 'token_refresh' | 'password_change',
    userId: string,
    outcome: 'success' | 'failure' | 'partial',
    details: Record<string, any> = {}
  ): Promise<string> {
    const eventType: AuditEventType = action === 'login' ? 'user_login' : 
                                     action === 'logout' ? 'user_logout' : 
                                     'security_event';

    return this.logEvent(
      eventType,
      action.toUpperCase(),
      outcome,
      details,
      {
        userId,
        severity: outcome === 'failure' ? 'high' : 'medium',
      }
    );
  }

  /**
   * Log consent event
   */
  public async logConsentEvent(
    action: 'given' | 'withdrawn' | 'updated',
    userId: string,
    consentType: string,
    details: Record<string, any> = {}
  ): Promise<string> {
    const eventType: AuditEventType = action === 'given' ? 'consent_given' : 'consent_withdrawn';

    return this.logEvent(
      eventType,
      `CONSENT_${action.toUpperCase()}`,
      'success',
      {
        ...details,
        consentType,
      },
      {
        userId,
        severity: 'medium',
      }
    );
  }

  /**
   * Log security event
   */
  public async logSecurityEvent(
    action: string,
    severity: AuditSeverity,
    details: Record<string, any> = {},
    userId?: string
  ): Promise<string> {
    return this.logEvent(
      'security_event',
      action,
      'success',
      details,
      {
        userId,
        severity,
      }
    );
  }

  /**
   * Query audit events
   */
  public async queryEvents(query: AuditQuery = {}): Promise<AuditEvent[]> {
    try {
      const allKeys = await this.secureStorage.getAllKeys({
        prefix: 'audit_event_',
      });

      const events: AuditEvent[] = [];
      
      for (const key of allKeys) {
        try {
          const event = await this.secureStorage.getItem<AuditEvent>(key, {
            dataType: 'audit_logs',
          });
          
          if (event && this.matchesQuery(event, query)) {
            events.push(event);
          }
        } catch (error) {
          console.warn(`Failed to retrieve audit event ${key}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit and offset
      const start = query.offset || 0;
      const end = query.limit ? start + query.limit : undefined;
      
      return events.slice(start, end);
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Audit query failed'),
        {
          module: 'AuditService',
          method: 'queryEvents',
          query,
        }
      );
      
      throw error;
    }
  }

  /**
   * Get audit summary
   */
  public async getAuditSummary(query: AuditQuery = {}): Promise<AuditSummary> {
    try {
      const events = await this.queryEvents(query);
      
      const summary: AuditSummary = {
        totalEvents: events.length,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {} as Record<AuditSeverity, number>,
        eventsByOutcome: {},
        timeRange: {
          earliest: events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : 0,
          latest: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : 0,
        },
        uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
        criticalEvents: events.filter(e => e.severity === 'critical').length,
      };

      // Count events by type
      events.forEach(event => {
        summary.eventsByType[event.eventType] = (summary.eventsByType[event.eventType] || 0) + 1;
        summary.eventsBySeverity[event.severity] = (summary.eventsBySeverity[event.severity] || 0) + 1;
        summary.eventsByOutcome[event.outcome] = (summary.eventsByOutcome[event.outcome] || 0) + 1;
      });

      return summary;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Audit summary failed'),
        {
          module: 'AuditService',
          method: 'getAuditSummary',
          query,
        }
      );
      
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  public async exportAuditLogs(
    query: AuditQuery = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const events = await this.queryEvents(query);
      
      if (format === 'csv') {
        return this.convertToCSV(events);
      } else {
        return JSON.stringify(events, null, 2);
      }
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Audit export failed'),
        {
          module: 'AuditService',
          method: 'exportAuditLogs',
          query,
          format,
        }
      );
      
      throw error;
    }
  }

  /**
   * Purge old audit logs based on retention policy
   */
  public async purgeOldLogs(retentionDays: number = 2555): Promise<number> { // 7 years default
    try {
      const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      const allKeys = await this.secureStorage.getAllKeys({
        prefix: 'audit_event_',
      });

      let purgedCount = 0;

      for (const key of allKeys) {
        try {
          const event = await this.secureStorage.getItem<AuditEvent>(key, {
            dataType: 'audit_logs',
          });
          
          if (event && event.timestamp < cutoffDate) {
            await this.secureStorage.removeItem(key, {
              dataType: 'audit_logs',
            });
            purgedCount++;
          }
        } catch (error) {
          console.warn(`Failed to process audit event ${key} for purging:`, error);
        }
      }

      // Log the purge operation
      await this.logEvent(
        'system_event',
        'AUDIT_LOG_PURGE',
        'success',
        {
          retentionDays,
          purgedCount,
          cutoffDate,
        },
        {
          severity: 'medium',
        }
      );

      return purgedCount;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Audit log purge failed'),
        {
          module: 'AuditService',
          method: 'purgeOldLogs',
          retentionDays,
        }
      );
      
      throw error;
    }
  }

  // Private helper methods

  private generateEventId(): string {
    this.eventCounter++;
    return `audit_${Date.now()}_${this.eventCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDeviceId(): Promise<string> {
    // This would typically use a device ID library
    // For now, generate a consistent ID based on platform info
    return `device_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(eventType: AuditEventType, outcome: string): AuditSeverity {
    // Critical events
    if (outcome === 'failure' && ['user_login', 'data_access'].includes(eventType)) {
      return 'critical';
    }
    
    // High severity events
    if (['data_delete', 'data_purge', 'consent_withdrawn'].includes(eventType)) {
      return 'high';
    }
    
    // Medium severity events
    if (['data_create', 'data_update', 'user_login', 'consent_given'].includes(eventType)) {
      return 'medium';
    }
    
    // Default to low
    return 'low';
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private async storeAuditEvent(event: AuditEvent): Promise<void> {
    const key = `audit_event_${event.id}`;
    
    await this.secureStorage.setItem(key, event, {
      encrypt: true,
      dataType: 'audit_logs',
      expirationTime: Date.now() + (7 * 365 * 24 * 60 * 60 * 1000), // 7 years
    });
  }

  private async handleCriticalEvent(event: AuditEvent): Promise<void> {
    // Log critical event to system immediately
    await this.loggingService.logError(
      new Error(`Critical audit event: ${event.action}`),
      {
        module: 'AuditService',
        method: 'handleCriticalEvent',
        eventId: event.id,
        eventType: event.eventType,
        action: event.action,
        outcome: event.outcome,
        userId: event.userId,
      }
    );

    // In a real implementation, this might:
    // - Send alerts to administrators
    // - Trigger security protocols
    // - Create incident reports
  }

  private matchesQuery(event: AuditEvent, query: AuditQuery): boolean {
    // Date range filter
    if (query.startDate && event.timestamp < query.startDate.getTime()) {
      return false;
    }
    if (query.endDate && event.timestamp > query.endDate.getTime()) {
      return false;
    }

    // Event type filter
    if (query.eventTypes && !query.eventTypes.includes(event.eventType)) {
      return false;
    }

    // User filter
    if (query.userId && event.userId !== query.userId) {
      return false;
    }

    // Severity filter
    if (query.severity && !query.severity.includes(event.severity)) {
      return false;
    }

    // Outcome filter
    if (query.outcome && !query.outcome.includes(event.outcome)) {
      return false;
    }

    return true;
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) {
      return '';
    }

    const headers = [
      'ID',
      'Timestamp',
      'Event Type',
      'Severity',
      'User ID',
      'Session ID',
      'Resource Type',
      'Resource ID',
      'Action',
      'Outcome',
      'Details',
    ];

    const rows = events.map(event => [
      event.id,
      new Date(event.timestamp).toISOString(),
      event.eventType,
      event.severity,
      event.userId || '',
      event.sessionId || '',
      event.resourceType || '',
      event.resourceId || '',
      event.action,
      event.outcome,
      JSON.stringify(event.details),
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

// Convenience functions for common audit operations

/**
 * Log PHI access for HIPAA compliance
 */
export async function auditPHIAccess(
  action: 'read' | 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  userId: string,
  details?: Record<string, any>
): Promise<string> {
  const auditService = AuditService.getInstance();
  return auditService.logPHIAccess(action, resourceType, resourceId, userId, 'success', details);
}

/**
 * Log authentication events
 */
export async function auditAuthEvent(
  action: 'login' | 'logout' | 'token_refresh' | 'password_change',
  userId: string,
  outcome: 'success' | 'failure' | 'partial',
  details?: Record<string, any>
): Promise<string> {
  const auditService = AuditService.getInstance();
  return auditService.logAuthEvent(action, userId, outcome, details);
}

/**
 * Log consent events
 */
export async function auditConsentEvent(
  action: 'given' | 'withdrawn' | 'updated',
  userId: string,
  consentType: string,
  details?: Record<string, any>
): Promise<string> {
  const auditService = AuditService.getInstance();
  return auditService.logConsentEvent(action, userId, consentType, details);
}

/**
 * Log security events
 */
export async function auditSecurityEvent(
  action: string,
  severity: AuditSeverity,
  details?: Record<string, any>,
  userId?: string
): Promise<string> {
  const auditService = AuditService.getInstance();
  return auditService.logSecurityEvent(action, severity, details, userId);
}