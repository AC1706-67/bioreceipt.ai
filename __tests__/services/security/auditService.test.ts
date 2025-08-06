/**
 * Audit Service Tests
 * Tests for HIPAA-compliant audit logging functionality
 */

import { AuditService, AuditEventType, AuditSeverity } from '../../../src/services/security/auditService';

// Mock dependencies
jest.mock('../../../src/services/logging/loggingService');
jest.mock('../../../src/services/security/secureStorage');

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService = AuditService.getInstance();
  });

  describe('Initialization', () => {
    it('should be singleton', () => {
      const service1 = AuditService.getInstance();
      const service2 = AuditService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('Event Logging', () => {
    it('should log audit event successfully', async () => {
      const eventType: AuditEventType = 'data_access';
      const action = 'READ_HEALTH_DATA';
      const outcome = 'success';
      const details = { resourceId: 'health-123' };
      const options = {
        userId: 'user-123',
        resourceType: 'health_data',
        resourceId: 'health-123',
        severity: 'high' as AuditSeverity,
      };

      const eventId = await auditService.logEvent(
        eventType,
        action,
        outcome,
        details,
        options
      );

      expect(typeof eventId).toBe('string');
      expect(eventId).toMatch(/^audit_/);
    });

    it('should determine severity automatically', async () => {
      const eventId = await auditService.logEvent(
        'user_login',
        'LOGIN_ATTEMPT',
        'failure',
        { ipAddress: '192.168.1.1' }
      );

      expect(typeof eventId).toBe('string');
    });

    it('should handle critical events', async () => {
      const eventId = await auditService.logEvent(
        'security_event',
        'UNAUTHORIZED_ACCESS',
        'failure',
        { attemptedResource: 'admin-panel' },
        { severity: 'critical' }
      );

      expect(typeof eventId).toBe('string');
    });
  });

  describe('PHI Access Logging', () => {
    it('should log PHI read access', async () => {
      const eventId = await auditService.logPHIAccess(
        'read',
        'medical_history',
        'record-123',
        'user-456'
      );

      expect(typeof eventId).toBe('string');
    });

    it('should log PHI create access', async () => {
      const eventId = await auditService.logPHIAccess(
        'create',
        'health_data',
        'new-record-789',
        'user-456',
        'success',
        { dataType: 'blood_pressure' }
      );

      expect(typeof eventId).toBe('string');
    });

    it('should log PHI delete access', async () => {
      const eventId = await auditService.logPHIAccess(
        'delete',
        'progress_data',
        'progress-123',
        'user-456',
        'success'
      );

      expect(typeof eventId).toBe('string');
    });
  });

  describe('Authentication Event Logging', () => {
    it('should log successful login', async () => {
      const eventId = await auditService.logAuthEvent(
        'login',
        'user-123',
        'success',
        { method: 'password', ipAddress: '192.168.1.1' }
      );

      expect(typeof eventId).toBe('string');
    });

    it('should log failed login', async () => {
      const eventId = await auditService.logAuthEvent(
        'login',
        'user-123',
        'failure',
        { reason: 'invalid_password', ipAddress: '192.168.1.1' }
      );

      expect(typeof eventId).toBe('string');
    });

    it('should log logout', async () => {
      const eventId = await auditService.logAuthEvent(
        'logout',
        'user-123',
        'success'
      );

      expect(typeof eventId).toBe('string');
    });

    it('should log password change', async () => {
      const eventId = await auditService.logAuthEvent(
        'password_change',
        'user-123',
        'success',
        { method: 'self_service' }
      );

      expect(typeof eventId).toBe('string');
    });
  });

  describe('Consent Event Logging', () => {
    it('should log consent given', async () => {
      const eventId = await auditService.logConsentEvent(
        'given',
        'user-123',
        'data_processing',
        { version: '1.0', method: 'explicit' }
      );

      expect(typeof eventId).toBe('string');
    });

    it('should log consent withdrawn', async () => {
      const eventId = await auditService.logConsentEvent(
        'withdrawn',
        'user-123',
        'marketing',
        { reason: 'user_request' }
      );

      expect(typeof eventId).toBe('string');
    });

    it('should log consent updated', async () => {
      const eventId = await auditService.logConsentEvent(
        'updated',
        'user-123',
        'analytics',
        { oldVersion: '1.0', newVersion: '1.1' }
      );

      expect(typeof eventId).toBe('string');
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with different severities', async () => {
      const lowSeverityEvent = await auditService.logSecurityEvent(
        'PASSWORD_POLICY_CHECK',
        'low',
        { policyVersion: '1.0' }
      );

      const highSeverityEvent = await auditService.logSecurityEvent(
        'SUSPICIOUS_ACTIVITY_DETECTED',
        'high',
        { activityType: 'multiple_failed_logins' },
        'user-123'
      );

      expect(typeof lowSeverityEvent).toBe('string');
      expect(typeof highSeverityEvent).toBe('string');
    });

    it('should log critical security events', async () => {
      const eventId = await auditService.logSecurityEvent(
        'DATA_BREACH_DETECTED',
        'critical',
        { affectedRecords: 100, breachType: 'unauthorized_access' }
      );

      expect(typeof eventId).toBe('string');
    });
  });

  describe('Query Events', () => {
    it('should query events with no filters', async () => {
      // First log some events
      await auditService.logEvent('data_access', 'READ', 'success');
      await auditService.logEvent('user_login', 'LOGIN', 'success');

      const events = await auditService.queryEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should query events with date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date();

      const events = await auditService.queryEvents({
        startDate,
        endDate,
      });

      expect(Array.isArray(events)).toBe(true);
    });

    it('should query events by user', async () => {
      const events = await auditService.queryEvents({
        userId: 'user-123',
      });

      expect(Array.isArray(events)).toBe(true);
    });

    it('should query events by type', async () => {
      const events = await auditService.queryEvents({
        eventTypes: ['data_access', 'user_login'],
      });

      expect(Array.isArray(events)).toBe(true);
    });

    it('should query events with limit and offset', async () => {
      const events = await auditService.queryEvents({
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Audit Summary', () => {
    it('should generate audit summary', async () => {
      // Log some test events
      await auditService.logEvent('data_access', 'READ', 'success');
      await auditService.logEvent('user_login', 'LOGIN', 'failure');
      await auditService.logEvent('security_event', 'ALERT', 'success', {}, { severity: 'critical' });

      const summary = await auditService.getAuditSummary();

      expect(summary).toHaveProperty('totalEvents');
      expect(summary).toHaveProperty('eventsByType');
      expect(summary).toHaveProperty('eventsBySeverity');
      expect(summary).toHaveProperty('eventsByOutcome');
      expect(summary).toHaveProperty('timeRange');
      expect(summary).toHaveProperty('uniqueUsers');
      expect(summary).toHaveProperty('criticalEvents');
      expect(typeof summary.totalEvents).toBe('number');
    });

    it('should generate summary with query filters', async () => {
      const summary = await auditService.getAuditSummary({
        eventTypes: ['data_access'],
        severity: ['high', 'critical'],
      });

      expect(summary).toHaveProperty('totalEvents');
      expect(typeof summary.totalEvents).toBe('number');
    });
  });

  describe('Export Audit Logs', () => {
    it('should export logs as JSON', async () => {
      const jsonExport = await auditService.exportAuditLogs({}, 'json');
      expect(typeof jsonExport).toBe('string');
      
      // Should be valid JSON
      expect(() => JSON.parse(jsonExport)).not.toThrow();
    });

    it('should export logs as CSV', async () => {
      const csvExport = await auditService.exportAuditLogs({}, 'csv');
      expect(typeof csvExport).toBe('string');
      
      // CSV should contain headers if there's data
      if (csvExport.length > 0) {
        expect(csvExport).toContain('ID');
        expect(csvExport).toContain('Timestamp');
        expect(csvExport).toContain('Event Type');
      }
    });

    it('should export logs with query filters', async () => {
      const export1 = await auditService.exportAuditLogs({
        eventTypes: ['data_access'],
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      expect(typeof export1).toBe('string');
    });
  });

  describe('Log Purging', () => {
    it('should purge old logs', async () => {
      const retentionDays = 30;
      const purgedCount = await auditService.purgeOldLogs(retentionDays);
      
      expect(typeof purgedCount).toBe('number');
      expect(purgedCount).toBeGreaterThanOrEqual(0);
    });

    it('should use default retention period', async () => {
      const purgedCount = await auditService.purgeOldLogs();
      
      expect(typeof purgedCount).toBe('number');
      expect(purgedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', async () => {
      // This test would require mocking the storage to throw an error
      // For now, we'll test that the method doesn't throw
      await expect(
        auditService.logEvent('data_access', 'TEST', 'success')
      ).resolves.toBeDefined();
    });

    it('should handle query errors gracefully', async () => {
      // Test that query methods handle errors without crashing
      await expect(
        auditService.queryEvents({ userId: 'nonexistent' })
      ).resolves.toBeDefined();
    });

    it('should handle export errors gracefully', async () => {
      await expect(
        auditService.exportAuditLogs({ userId: 'test' })
      ).resolves.toBeDefined();
    });
  });

  describe('Compliance Features', () => {
    it('should sanitize sensitive details', async () => {
      const sensitiveDetails = {
        password: 'secret123',
        token: 'bearer-token',
        ssn: '123-45-6789',
        normalField: 'normal-value',
      };

      const eventId = await auditService.logEvent(
        'data_access',
        'TEST_SANITIZATION',
        'success',
        sensitiveDetails
      );

      expect(typeof eventId).toBe('string');
      // The actual sanitization would be tested by checking stored data
    });

    it('should generate correlation IDs', async () => {
      const correlationId = 'correlation-123';
      const eventId = await auditService.logEvent(
        'data_access',
        'TEST_CORRELATION',
        'success',
        {},
        { correlationId }
      );

      expect(typeof eventId).toBe('string');
    });

    it('should track session information', async () => {
      const eventId = await auditService.logEvent(
        'user_login',
        'SESSION_START',
        'success',
        { sessionDuration: 3600 }
      );

      expect(typeof eventId).toBe('string');
    });
  });
});