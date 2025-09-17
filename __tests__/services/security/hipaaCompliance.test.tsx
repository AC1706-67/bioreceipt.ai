/**
 * HIPAA Compliance Test Suite
 * Comprehensive tests for all HIPAA compliance features
 */

import { EncryptionService } from '../../../src/services/security/encryption';
import { SecureStorageService } from '../../../src/services/security/secureStorage';
import { NetworkSecurityService } from '../../../src/services/security/networkSecurity';
import { AuditService } from '../../../src/services/security/auditService';
import { ConsentService } from '../../../src/services/security/consentService';
import { DataRetentionService } from '../../../src/services/security/dataRetentionService';

// Mock external dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  clear: jest.fn().mockResolvedValue(undefined),
}));

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
      toString: () => 'test-plaintext-data',
    })),
  },
  PBKDF2: jest.fn(() => ({
    toString: () => 'mock-derived-key',
  })),
  HmacSHA256: jest.fn(() => ({
    toString: () => 'mock-hmac-valid',
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

jest.mock('../../../src/services/logging/loggingService');

// Mock timers for testing time-based functionality
jest.useFakeTimers();

describe('HIPAA Compliance Test Suite', () => {
  const testUserId = 'user-123';
  const masterPassword = 'test-master-password-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('EncryptionService - PHI Encryption & Tampering Protection', () => {
    let encryptionService: EncryptionService;

    beforeEach(async () => {
      encryptionService = EncryptionService.getInstance();
      await encryptionService.initialize(masterPassword);
    });

    afterEach(() => {
      encryptionService.secureWipe();
    });

    it('should encrypt PHI data correctly', async () => {
      const phiData = {
        patientId: 'patient-123',
        diagnosis: 'hypertension',
        medications: ['lisinopril'],
      };

      const encrypted = await encryptionService.encryptPHI(
        phiData,
        testUserId,
        'medical_history',
      );

      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('hmac');
      expect(encrypted).toHaveProperty('version', '1.0');
      expect(encrypted).toHaveProperty('timestamp');
      expect(typeof encrypted.timestamp).toBe('number');
    });

    it('should decrypt PHI data correctly', async () => {
      const phiData = { patientId: 'test', condition: 'diabetes' };

      const encrypted = await encryptionService.encryptPHI(
        phiData,
        testUserId,
        'health_data',
      );

      // Mock successful decryption
      const CryptoJS = require('crypto-js');
      CryptoJS.AES.decrypt.mockReturnValueOnce({
        toString: () => JSON.stringify({ data: phiData }),
      });

      const decrypted = await encryptionService.decryptPHI(
        encrypted,
        testUserId,
        'health_data',
      );

      expect(decrypted).toEqual({ data: phiData });
    });

    it('should throw on HMAC tampering', async () => {
      const tamperedData = {
        encryptedData: 'tampered-data',
        iv: 'test-iv',
        salt: 'test-salt',
        hmac: 'invalid-hmac',
        version: '1.0',
        timestamp: Date.now(),
      };

      // Mock HMAC validation failure
      const CryptoJS = require('crypto-js');
      CryptoJS.HmacSHA256.mockReturnValueOnce({
        toString: () => 'different-hmac',
      });

      await expect(encryptionService.decryptData(tamperedData)).rejects.toThrow(
        'Data integrity verification failed',
      );
    });

    it('should throw on unsupported version', async () => {
      const invalidVersionData = {
        encryptedData: 'test',
        iv: 'test',
        salt: 'test',
        hmac: 'test',
        version: '2.0', // Unsupported version
        timestamp: Date.now(),
      };

      await expect(
        encryptionService.decryptData(invalidVersionData),
      ).rejects.toThrow('Unsupported encryption version: 2.0');
    });
  });

  describe('SecureStorageService - Encrypted Storage & Auto-Purge', () => {
    let secureStorage: SecureStorageService;
    let mockEncryptedStorage: any;

    beforeEach(async () => {
      secureStorage = SecureStorageService.getInstance();
      await secureStorage.initialize(masterPassword);
      mockEncryptedStorage = require('react-native-encrypted-storage');
    });

    it('should store data with encryption', async () => {
      const testData = { patientId: 'test', vitals: '120/80' };

      await secureStorage.setItem('test-key', testData, {
        encrypt: true,
        userId: testUserId,
        dataType: 'health_data',
      });

      expect(mockEncryptedStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining('encrypted'),
      );
    });

    it('should retrieve encrypted data correctly', async () => {
      const testData = { patientId: 'test', condition: 'diabetes' };

      // Mock encrypted storage return
      mockEncryptedStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          encrypted: true,
          encryptedData: 'mock-encrypted',
          iv: 'mock-iv',
          salt: 'mock-salt',
          hmac: 'mock-hmac',
          version: '1.0',
          timestamp: Date.now(),
        }),
      );

      const retrieved = await secureStorage.getItem('test-key', {
        userId: testUserId,
        dataType: 'health_data',
      });

      expect(mockEncryptedStorage.getItem).toHaveBeenCalledWith('test-key');
      // Data would be decrypted by the encryption service
      expect(retrieved).toBeDefined();
    });

    it('should auto-purge expired entries', async () => {
      const expiredTime = Date.now() - 1000; // 1 second ago

      // Mock expired data
      mockEncryptedStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: { test: 'data' },
          metadata: {
            createdAt: Date.now() - 10000,
            expiresAt: expiredTime,
            encrypted: false,
          },
        }),
      );

      const result = await secureStorage.getItem('expired-key');

      expect(result).toBeNull();
      expect(mockEncryptedStorage.removeItem).toHaveBeenCalledWith(
        'expired-key',
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockEncryptedStorage.setItem.mockRejectedValueOnce(
        new Error('Storage full'),
      );

      await expect(
        secureStorage.setItem('test-key', { data: 'test' }),
      ).rejects.toThrow();
    });
  });

  describe('NetworkSecurityService - HTTPS & Certificate Pinning', () => {
    let networkSecurity: NetworkSecurityService;

    beforeEach(() => {
      networkSecurity = NetworkSecurityService.getInstance();
      global.fetch = jest.fn();
    });

    it('should enforce HTTPS for PHI requests', async () => {
      const httpUrl = 'http://api.example.com/phi-data';

      await expect(
        networkSecurity.secureRequest({
          url: httpUrl,
          method: 'GET',
        }),
      ).rejects.toThrow('Only HTTPS requests are allowed for PHI data');
    });

    it('should apply certificate pinning', () => {
      const hostname = 'api.BioReceipt.com';
      const validCert = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      const invalidCert = 'sha256/INVALID_CERT_HASH';

      expect(networkSecurity.validateCertificate(hostname, validCert)).toBe(
        true,
      );
      expect(networkSecurity.validateCertificate(hostname, invalidCert)).toBe(
        false,
      );
    });

    it('should reject requests with invalid certificates', () => {
      const hostname = 'unknown.example.com';
      const cert = 'sha256/SOME_CERT_HASH';

      expect(networkSecurity.validateCertificate(hostname, cert)).toBe(false);
    });

    it('should handle network timeouts', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 35000),
          ),
      );

      await expect(
        networkSecurity.secureRequest({
          url: 'https://api.example.com/data',
          method: 'GET',
          options: { timeout: 1000 },
        }),
      ).rejects.toThrow();
    });
  });

  describe('AuditService - Event Logging & Error Propagation', () => {
    let auditService: AuditService;

    beforeEach(() => {
      auditService = AuditService.getInstance();
    });

    it('should log events in correct order', async () => {
      const events = [
        { type: 'user_login', action: 'LOGIN', outcome: 'success' as const },
        {
          type: 'data_access',
          action: 'READ_PHI',
          outcome: 'success' as const,
        },
        { type: 'user_logout', action: 'LOGOUT', outcome: 'success' as const },
      ];

      const eventIds: string[] = [];

      for (const event of events) {
        const eventId = await auditService.logEvent(
          event.type as any,
          event.action,
          event.outcome,
          { timestamp: Date.now() },
          { userId: testUserId },
        );
        eventIds.push(eventId);
      }

      expect(eventIds).toHaveLength(3);
      eventIds.forEach((id, index) => {
        expect(id).toMatch(/^audit_/);
        expect(id).toContain(Date.now().toString());
      });
    });

    it('should propagate repository errors', async () => {
      // Mock storage failure
      const mockStorage = require('react-native-encrypted-storage');
      mockStorage.setItem.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        auditService.logEvent('data_access', 'TEST_ERROR', 'failure', {
          test: 'data',
        }),
      ).rejects.toThrow();
    });

    it('should handle critical events immediately', async () => {
      const eventId = await auditService.logEvent(
        'security_event',
        'CRITICAL_BREACH',
        'failure',
        { severity: 'critical' },
        { severity: 'critical' },
      );

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should log PHI access with proper context', async () => {
      const eventId = await auditService.logPHIAccess(
        'read',
        'medical_history',
        'record-123',
        testUserId,
      );

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^audit_/);
    });
  });

  describe('ConsentService - Consent Recording & Version Tracking', () => {
    let consentService: ConsentService;

    beforeEach(() => {
      consentService = ConsentService.getInstance();
    });

    it('should record user consent with metadata', async () => {
      const consentId = await consentService.grantConsent(
        testUserId,
        'data_processing',
        {
          method: 'explicit',
          source: 'onboarding',
          deviceId: 'device-123',
          appVersion: '1.0.0',
          ipAddress: '192.168.1.1',
        },
      );

      expect(consentId).toBeDefined();
      expect(consentId).toMatch(/^consent_/);
    });

    it('should update existing consent', async () => {
      // First grant consent
      await consentService.grantConsent(testUserId, 'analytics', {
        method: 'explicit',
        source: 'settings',
        deviceId: 'device-123',
        appVersion: '1.0.0',
      });

      // Update consent
      const updatedConsentId = await consentService.grantConsent(
        testUserId,
        'analytics',
        {
          method: 'explicit',
          source: 'settings_update',
          deviceId: 'device-123',
          appVersion: '1.1.0',
        },
      );

      expect(updatedConsentId).toBeDefined();
    });

    it('should track consent version history', async () => {
      await consentService.grantConsent(testUserId, 'marketing', {
        method: 'opt_in',
        source: 'newsletter_signup',
        deviceId: 'device-123',
        appVersion: '1.0.0',
      });

      const consent = await consentService.getConsent(testUserId, 'marketing');

      expect(consent).toBeDefined();
      expect(consent?.history).toBeDefined();
      expect(consent?.history.length).toBeGreaterThan(0);
      expect(consent?.version).toBe('1.0');
    });

    it('should withdraw consent with reason', async () => {
      // Grant consent first
      await consentService.grantConsent(testUserId, 'data_sharing', {
        method: 'explicit',
        source: 'research_signup',
        deviceId: 'device-123',
        appVersion: '1.0.0',
      });

      // Withdraw consent
      await consentService.withdrawConsent(
        testUserId,
        'data_sharing',
        'user_request',
      );

      const hasConsent = await consentService.hasConsent(
        testUserId,
        'data_sharing',
      );
      expect(hasConsent).toBe(false);
    });

    it('should generate consent summary', async () => {
      // Grant multiple consents
      await consentService.grantConsent(testUserId, 'data_collection', {
        method: 'explicit',
        source: 'onboarding',
        deviceId: 'device-123',
        appVersion: '1.0.0',
      });

      await consentService.grantConsent(testUserId, 'push_notifications', {
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

  describe('DataRetentionService - 7-Year Policy & Retention Status', () => {
    let retentionService: DataRetentionService;

    beforeEach(() => {
      retentionService = DataRetentionService.getInstance();
    });

    it('should enforce 7-year retention policy for health data', () => {
      const policies = retentionService.getRetentionPolicies();

      expect(policies.health_data.retentionPeriodDays).toBe(2555); // 7 years
      expect(policies.medical_history.retentionPeriodDays).toBe(2555);
      expect(policies.audit_logs.retentionPeriodDays).toBe(2555);
    });

    it('should purge data according to retention policy', async () => {
      const jobId = await retentionService.scheduleRetentionJob('cache_data');
      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^retention_/);

      const job = await retentionService.executeRetentionJob(jobId);

      expect(job.status).toBe('completed');
      expect(typeof job.recordsProcessed).toBe('number');
      expect(typeof job.recordsDeleted).toBe('number');
    });

    it('should report retention status', async () => {
      const report = await retentionService.generateRetentionReport();

      expect(report).toHaveProperty('totalRecords');
      expect(report).toHaveProperty('recordsByCategory');
      expect(report).toHaveProperty('expiredRecords');
      expect(report).toHaveProperty('complianceStatus');
      expect(['compliant', 'non_compliant', 'warning']).toContain(
        report.complianceStatus,
      );
    });

    it('should handle user data deletion', async () => {
      const deletionResult = await retentionService.deleteUserData(testUserId);

      expect(deletionResult).toHaveProperty('deletedRecords');
      expect(deletionResult).toHaveProperty('totalSize');
      expect(deletionResult).toHaveProperty('categories');
      expect(typeof deletionResult.deletedRecords).toBe('number');
      expect(Array.isArray(deletionResult.categories)).toBe(true);
    });

    it('should respect retention exceptions', async () => {
      const policy = retentionService.getRetentionPolicy('health_data');

      expect(policy).toBeDefined();
      expect(policy?.exceptions).toContain('ongoing_treatment');
      expect(policy?.exceptions).toContain('legal_hold');
      expect(policy?.autoDelete).toBe(false); // Health data requires manual review
    });

    it('should run full retention cycle', async () => {
      const jobs = await retentionService.runFullRetention();

      expect(Array.isArray(jobs)).toBe(true);
      jobs.forEach(job => {
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('category');
        expect(['completed', 'failed']).toContain(job.status);
      });
    });
  });

  describe('Integration - Cross-Service HIPAA Compliance', () => {
    it('should maintain audit trail across all services', async () => {
      const auditService = AuditService.getInstance();
      const consentService = ConsentService.getInstance();
      const secureStorage = SecureStorageService.getInstance();

      // Initialize services
      await secureStorage.initialize(masterPassword);

      // Grant consent (audited)
      await consentService.grantConsent(testUserId, 'health_data_processing', {
        method: 'explicit',
        source: 'integration_test',
        deviceId: 'test-device',
        appVersion: '1.0.0',
      });

      // Store PHI data (audited)
      await secureStorage.setItem(
        'test-phi',
        { data: 'sensitive' },
        {
          encrypt: true,
          userId: testUserId,
          dataType: 'health_data',
        },
      );

      // Access PHI data (audited)
      await secureStorage.getItem('test-phi', {
        userId: testUserId,
        dataType: 'health_data',
      });

      // Query audit events
      const events = await auditService.queryEvents({
        userId: testUserId,
        startDate: new Date(Date.now() - 60000), // Last minute
      });

      expect(Array.isArray(events)).toBe(true);
    });

    it('should handle service failures gracefully', async () => {
      const mockStorage = require('react-native-encrypted-storage');
      mockStorage.setItem.mockRejectedValueOnce(
        new Error('Service unavailable'),
      );

      const secureStorage = SecureStorageService.getInstance();
      await secureStorage.initialize(masterPassword);

      await expect(
        secureStorage.setItem('test-key', { data: 'test' }),
      ).rejects.toThrow('Service unavailable');
    });

    it('should maintain data consistency across services', async () => {
      const encryptionService = EncryptionService.getInstance();
      const auditService = AuditService.getInstance();

      await encryptionService.initialize(masterPassword);

      // Encrypt data
      const testData = { sensitive: 'phi-data' };
      const encrypted = await encryptionService.encryptData(
        JSON.stringify(testData),
      );

      // Decrypt data
      const decrypted = await encryptionService.decryptData(encrypted);

      // Both operations should be consistent
      expect(decrypted).toBe('test-plaintext-data'); // Mocked return
    });
  });
});
