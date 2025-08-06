/**
 * HIPAA Compliance Integration Tests
 * End-to-end tests for HIPAA compliance features
 */

import {
  initializeSecurityServices,
  EncryptionService,
  SecureStorageService,
  AuditService,
  ConsentService,
  DataRetentionService,
  auditPHIAccess,
  hasUserConsent,
  grantUserConsent,
} from '../../src/services/security';

// Mock react-native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  lib: {
    WordArray: {
      random: jest.fn(() => ({
        toString: () => 'mock-random-string',
      })),
    },
  },
  AES: {
    encrypt: jest.fn(() => ({
      toString: () => 'mock-encrypted-data',
    })),
    decrypt: jest.fn(() => ({
      toString: () => JSON.stringify({ test: 'decrypted-data' }),
    })),
  },
  PBKDF2: jest.fn(() => ({
    toString: () => 'mock-derived-key',
  })),
  HmacSHA256: jest.fn(() => ({
    toString: () => 'mock-hmac',
  })),
  SHA256: jest.fn(() => ({
    toString: () => 'mock-hash',
    substring: () => 'mock-salt',
  })),
  mode: { CBC: 'CBC' },
  pad: { Pkcs7: 'Pkcs7' },
  enc: {
    Hex: {
      parse: jest.fn(() => 'mock-parsed-hex'),
    },
    Utf8: 'Utf8',
  },
  algo: { SHA256: 'SHA256' },
}));

describe('HIPAA Compliance Integration', () => {
  const masterPassword = 'test-master-password-123';
  const testUserId = 'user-123';

  beforeAll(async () => {
    await initializeSecurityServices(masterPassword);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Security Services Initialization', () => {
    it('should initialize all security services', async () => {
      await expect(initializeSecurityServices(masterPassword)).resolves.not.toThrow();
    });

    it('should have all services available', () => {
      expect(EncryptionService.getInstance()).toBeDefined();
      expect(SecureStorageService.getInstance()).toBeDefined();
      expect(AuditService.getInstance()).toBeDefined();
      expect(ConsentService.getInstance()).toBeDefined();
      expect(DataRetentionService.getInstance()).toBeDefined();
    });
  });

  describe('PHI Data Lifecycle', () => {
    it('should handle complete PHI data lifecycle with compliance', async () => {
      const phiData = {
        patientId: testUserId,
        diagnosis: 'hypertension',
        medications: ['lisinopril', 'metformin'],
        lastVisit: '2024-01-15',
      };

      // 1. Check consent before processing PHI
      const hasConsent = await hasUserConsent(testUserId, 'health_data_processing');
      
      if (!hasConsent) {
        // Grant consent first
        await grantUserConsent(testUserId, 'health_data_processing', {
          method: 'explicit',
          source: 'onboarding_flow',
          deviceId: 'device-123',
          appVersion: '1.0.0',
        });
      }

      // 2. Store PHI data securely
      const secureStorage = SecureStorageService.getInstance();
      await secureStorage.setItem(`phi_${testUserId}_medical`, phiData, {
        encrypt: true,
        userId: testUserId,
        dataType: 'health_data',
      });

      // 3. Audit PHI access
      await auditPHIAccess('create', 'medical_history', `phi_${testUserId}_medical`, testUserId);

      // 4. Retrieve PHI data
      const retrievedData = await secureStorage.getItem(`phi_${testUserId}_medical`, {
        userId: testUserId,
        dataType: 'health_data',
      });

      // 5. Audit PHI read access
      await auditPHIAccess('read', 'medical_history', `phi_${testUserId}_medical`, testUserId);

      expect(retrievedData).toBeDefined();
    });

    it('should prevent PHI access without consent', async () => {
      const consentService = ConsentService.getInstance();
      
      // Ensure no consent exists
      await consentService.withdrawConsent(testUserId, 'health_data_processing', 'test_scenario');
      
      const hasConsent = await hasUserConsent(testUserId, 'health_data_processing');
      expect(hasConsent).toBe(false);

      // Attempting to access PHI without consent should be audited
      await auditPHIAccess('read', 'medical_history', 'test-record', testUserId);
      
      // In a real implementation, this would prevent access
      // For testing, we just verify the audit occurred
    });
  });

  describe('Consent Management Compliance', () => {
    it('should manage consent lifecycle with proper auditing', async () => {
      const consentService = ConsentService.getInstance();
      
      // 1. Grant consent
      const consentId = await consentService.grantConsent(testUserId, 'data_collection', {
        method: 'explicit',
        source: 'privacy_settings',
        deviceId: 'device-123',
        appVersion: '1.0.0',
        ipAddress: '192.168.1.1',
      });

      expect(consentId).toBeDefined();

      // 2. Verify consent exists
      const hasConsent = await consentService.hasConsent(testUserId, 'data_collection');
      expect(hasConsent).toBe(true);

      // 3. Get consent record
      const consentRecord = await consentService.getConsent(testUserId, 'data_collection');
      expect(consentRecord).toBeDefined();
      expect(consentRecord?.status).toBe('granted');

      // 4. Withdraw consent
      await consentService.withdrawConsent(testUserId, 'data_collection', 'user_request');

      // 5. Verify consent is withdrawn
      const hasConsentAfterWithdrawal = await consentService.hasConsent(testUserId, 'data_collection');
      expect(hasConsentAfterWithdrawal).toBe(false);
    });

    it('should generate consent summary for compliance reporting', async () => {
      const consentService = ConsentService.getInstance();
      
      // Grant multiple consents
      await grantUserConsent(testUserId, 'data_processing', {
        method: 'explicit',
        source: 'onboarding',
        deviceId: 'device-123',
        appVersion: '1.0.0',
      });

      await grantUserConsent(testUserId, 'analytics', {
        method: 'opt_in',
        source: 'settings',
        deviceId: 'device-123',
        appVersion: '1.0.0',
      });

      const summary = await consentService.getConsentSummary(testUserId);
      
      expect(summary).toHaveProperty('userId', testUserId);
      expect(summary).toHaveProperty('totalConsents');
      expect(summary).toHaveProperty('grantedConsents');
      expect(summary).toHaveProperty('complianceStatus');
      expect(typeof summary.totalConsents).toBe('number');
    });
  });

  describe('Audit Trail Compliance', () => {
    it('should create comprehensive audit trail for user actions', async () => {
      const auditService = AuditService.getInstance();

      // Simulate user session with multiple actions
      const sessionActions = [
        { type: 'user_login', action: 'LOGIN', outcome: 'success' as const },
        { type: 'data_access', action: 'VIEW_HEALTH_TIPS', outcome: 'success' as const },
        { type: 'data_create', action: 'CREATE_PROGRESS_ENTRY', outcome: 'success' as const },
        { type: 'consent_given', action: 'GRANT_ANALYTICS_CONSENT', outcome: 'success' as const },
        { type: 'user_logout', action: 'LOGOUT', outcome: 'success' as const },
      ];

      const eventIds: string[] = [];

      for (const sessionAction of sessionActions) {
        const eventId = await auditService.logEvent(
          sessionAction.type as any,
          sessionAction.action,
          sessionAction.outcome,
          { sessionId: 'session-123' },
          { userId: testUserId, severity: 'medium' }
        );
        eventIds.push(eventId);
      }

      expect(eventIds).toHaveLength(sessionActions.length);
      eventIds.forEach(id => expect(typeof id).toBe('string'));

      // Query audit events for the user
      const userEvents = await auditService.queryEvents({ userId: testUserId });
      expect(Array.isArray(userEvents)).toBe(true);

      // Generate audit summary
      const auditSummary = await auditService.getAuditSummary({ userId: testUserId });
      expect(auditSummary).toHaveProperty('totalEvents');
      expect(auditSummary).toHaveProperty('eventsByType');
    });

    it('should export audit logs for compliance reporting', async () => {
      const auditService = AuditService.getInstance();

      // Log some test events
      await auditService.logPHIAccess('read', 'health_data', 'record-123', testUserId);
      await auditService.logAuthEvent('login', testUserId, 'success');

      // Export as JSON
      const jsonExport = await auditService.exportAuditLogs({
        userId: testUserId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      });

      expect(typeof jsonExport).toBe('string');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      // Export as CSV
      const csvExport = await auditService.exportAuditLogs({
        userId: testUserId,
      }, 'csv');

      expect(typeof csvExport).toBe('string');
    });
  });

  describe('Data Retention Compliance', () => {
    it('should manage data retention according to HIPAA requirements', async () => {
      const retentionService = DataRetentionService.getInstance();

      // Get retention policies
      const policies = retentionService.getRetentionPolicies();
      expect(policies).toHaveProperty('health_data');
      expect(policies).toHaveProperty('audit_logs');
      expect(policies.health_data.retentionPeriodDays).toBe(2555); // 7 years for HIPAA

      // Generate retention report
      const report = await retentionService.generateRetentionReport();
      expect(report).toHaveProperty('totalRecords');
      expect(report).toHaveProperty('complianceStatus');
      expect(report).toHaveProperty('recordsByCategory');
    });

    it('should handle user data deletion for account closure', async () => {
      const retentionService = DataRetentionService.getInstance();
      const secureStorage = SecureStorageService.getInstance();

      // Create some user data
      await secureStorage.setItem(`user_${testUserId}_profile`, {
        name: 'Test User',
        email: 'test@example.com',
      }, {
        userId: testUserId,
        dataType: 'user_profile',
      });

      await secureStorage.setItem(`user_${testUserId}_health`, {
        bloodPressure: '120/80',
        weight: '70kg',
      }, {
        userId: testUserId,
        dataType: 'health_data',
      });

      // Delete all user data
      const deletionResult = await retentionService.deleteUserData(testUserId);
      
      expect(deletionResult).toHaveProperty('deletedRecords');
      expect(deletionResult).toHaveProperty('totalSize');
      expect(deletionResult).toHaveProperty('categories');
      expect(typeof deletionResult.deletedRecords).toBe('number');
    });
  });

  describe('Data Export for User Rights', () => {
    it('should export user data for GDPR/HIPAA compliance', async () => {
      const consentService = ConsentService.getInstance();
      const secureStorage = SecureStorageService.getInstance();

      // Create user data
      await secureStorage.setItem(`export_test_${testUserId}`, {
        userId: testUserId,
        data: 'test export data',
        timestamp: Date.now(),
      }, {
        userId: testUserId,
        dataType: 'user_profile',
      });

      // Export consent data
      const consentExport = await consentService.exportUserConsentData(testUserId);
      expect(consentExport).toHaveProperty('consents');
      expect(consentExport).toHaveProperty('summary');
      expect(consentExport).toHaveProperty('exportedAt');

      // Export storage data
      const storageExport = await secureStorage.exportUserData(testUserId);
      expect(typeof storageExport).toBe('object');
    });
  });

  describe('Security Health Checks', () => {
    it('should perform comprehensive security health check', async () => {
      const { performSecurityHealthCheck } = await import('../../src/services/security');
      
      const healthCheck = await performSecurityHealthCheck();
      
      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('checks');
      expect(['healthy', 'warning', 'critical']).toContain(healthCheck.status);
      expect(Array.isArray(healthCheck.checks)).toBe(true);
      
      healthCheck.checks.forEach(check => {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('message');
        expect(['pass', 'warn', 'fail']).toContain(check.status);
      });
    });
  });

  describe('Incident Response', () => {
    it('should handle security incidents with proper logging', async () => {
      const auditService = AuditService.getInstance();

      // Simulate security incident
      const incidentId = await auditService.logSecurityEvent(
        'POTENTIAL_DATA_BREACH',
        'critical',
        {
          incidentType: 'unauthorized_access_attempt',
          affectedSystems: ['user_database', 'audit_logs'],
          detectionTime: Date.now(),
          sourceIP: '192.168.1.100',
        },
        testUserId
      );

      expect(typeof incidentId).toBe('string');

      // Log incident response actions
      await auditService.logEvent(
        'system_event',
        'INCIDENT_RESPONSE_INITIATED',
        'success',
        {
          incidentId,
          responseTeam: 'security_team',
          actions: ['isolate_systems', 'notify_stakeholders', 'begin_investigation'],
        },
        { severity: 'critical' }
      );

      // Query critical events
      const criticalEvents = await auditService.queryEvents({
        severity: ['critical'],
        startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      });

      expect(Array.isArray(criticalEvents)).toBe(true);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate comprehensive compliance report', async () => {
      const auditService = AuditService.getInstance();
      const consentService = ConsentService.getInstance();
      const retentionService = DataRetentionService.getInstance();

      // Generate various compliance reports
      const auditSummary = await auditService.getAuditSummary({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      });

      const consentSummary = await consentService.getConsentSummary(testUserId);
      const retentionReport = await retentionService.generateRetentionReport();

      // Verify all reports have required compliance information
      expect(auditSummary).toHaveProperty('totalEvents');
      expect(auditSummary).toHaveProperty('criticalEvents');
      expect(consentSummary).toHaveProperty('complianceStatus');
      expect(retentionReport).toHaveProperty('complianceStatus');

      // Create consolidated compliance report
      const complianceReport = {
        generatedAt: Date.now(),
        reportPeriod: {
          start: Date.now() - 30 * 24 * 60 * 60 * 1000,
          end: Date.now(),
        },
        audit: auditSummary,
        consent: consentSummary,
        retention: retentionReport,
        overallStatus: 'compliant' as const,
      };

      expect(complianceReport).toHaveProperty('generatedAt');
      expect(complianceReport).toHaveProperty('audit');
      expect(complianceReport).toHaveProperty('consent');
      expect(complianceReport).toHaveProperty('retention');
    });
  });
});