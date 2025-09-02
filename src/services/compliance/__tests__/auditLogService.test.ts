/**
 * Audit Log Service Tests
 * Unit tests for audit logging functionality
 */

import { AuditLogService, AuditLogEntry } from '../auditLogService';
import { SecureStorageService } from '../../security/secureStorage';

// Mock the secure storage service
jest.mock('../../security/secureStorage');

describe('AuditLogService', () => {
  let auditService: AuditLogService;
  let mockSecureStorage: jest.Mocked<SecureStorageService>;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService = AuditLogService.getInstance();
    mockSecureStorage = SecureStorageService.getInstance() as jest.Mocked<SecureStorageService>;
  });

  afterEach(() => {
    auditService.stopPeriodicFlush();
  });

  describe('logDataAccess', () => {
    it('should log data access event', async () => {
      const logEntry: AuditLogEntry = {
        userId: 'test-user-123',
        action: 'DATA_READ',
        resourceType: 'USER_PROFILE',
        resourceId: 'profile-123',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0'
      };

      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockSecureStorage.setItem.mockResolvedValue();

      await auditService.logDataAccess(logEntry);

      // Should not throw any errors
      expect(mockSecureStorage.getItem).not.toHaveBeenCalled(); // Buffered initially
    });

    it('should handle logging errors gracefully', async () => {
      const logEntry: AuditLogEntry = {
        userId: 'test-user-123',
        action: 'DATA_READ',
        resourceType: 'USER_PROFILE',
        resourceId: 'profile-123',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0'
      };

      // Mock storage error
      mockSecureStorage.setItem.mockRejectedValue(new Error('Storage error'));

      // Should not throw error (graceful handling)
      await expect(auditService.logDataAccess(logEntry)).resolves.not.toThrow();
    });

    it('should flush logs immediately for critical actions', async () => {
      const criticalLogEntry: AuditLogEntry = {
        userId: 'test-user-123',
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'AUTHENTICATION',
        resourceId: 'auth-123',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0'
      };

      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockSecureStorage.setItem.mockResolvedValue();

      await auditService.logDataAccess(criticalLogEntry);

      expect(mockSecureStorage.getItem).toHaveBeenCalled();
      expect(mockSecureStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('logDataModification', () => {
    it('should log data modification with old and new values', async () => {
      const userId = 'test-user-123';
      const action = 'DATA_UPDATE';
      const resourceType = 'USER_PROFILE';
      const resourceId = 'profile-123';
      const oldValue = { name: 'Old Name' };
      const newValue = { name: 'New Name' };

      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockSecureStorage.setItem.mockResolvedValue();

      await auditService.logDataModification(
        userId,
        action,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        '192.168.1.1',
        'TestAgent/1.0'
      );

      // Should complete without errors
      expect(mockSecureStorage.getItem).not.toHaveBeenCalled(); // Buffered initially
    });
  });

  describe('logSystemEvent', () => {
    it('should log system events', async () => {
      const action = 'SYSTEM_STARTUP';
      const details = { version: '1.0.0' };

      await auditService.logSystemEvent(action, details);

      // Should complete without errors
      expect(mockSecureStorage.getItem).not.toHaveBeenCalled(); // Buffered initially
    });

    it('should log system events with user ID', async () => {
      const action = 'USER_ACTION';
      const details = { action: 'profile_update' };
      const userId = 'test-user-123';

      await auditService.logSystemEvent(action, details, userId);

      // Should complete without errors
      expect(mockSecureStorage.getItem).not.toHaveBeenCalled(); // Buffered initially
    });
  });

  describe('logAuthenticationEvent', () => {
    it('should log successful authentication', async () => {
      const userId = 'test-user-123';
      const action = 'LOGIN';
      const ipAddress = '192.168.1.1';
      const userAgent = 'TestAgent/1.0';

      await auditService.logAuthenticationEvent(userId, action, ipAddress, userAgent, true);

      // Should complete without errors
      expect(mockSecureStorage.getItem).not.toHaveBeenCalled(); // Buffered initially
    });

    it('should log failed authentication', async () => {
      const userId = 'test-user-123';
      const action = 'LOGIN_FAILED';
      const ipAddress = '192.168.1.1';
      const userAgent = 'TestAgent/1.0';

      await auditService.logAuthenticationEvent(userId, action, ipAddress, userAgent, false);

      // Should complete without errors
      expect(mockSecureStorage.getItem).not.toHaveBeenCalled(); // Buffered initially
    });
  });

  describe('queryAuditLogs', () => {
    const mockLogs: AuditLogEntry[] = [
      {
        id: 'log1',
        userId: 'user1',
        action: 'DATA_READ',
        resourceType: 'USER_PROFILE',
        resourceId: 'profile1',
        timestamp: new Date('2023-01-01'),
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0'
      },
      {
        id: 'log2',
        userId: 'user2',
        action: 'DATA_WRITE',
        resourceType: 'HEALTH_DATA',
        resourceId: 'health1',
        timestamp: new Date('2023-01-02'),
        ipAddress: '192.168.1.2',
        userAgent: 'TestAgent/1.0'
      }
    ];

    beforeEach(() => {
      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));
    });

    it('should query all logs without filters', async () => {
      const logs = await auditService.queryAuditLogs({});

      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe('log2'); // Newest first
      expect(logs[1].id).toBe('log1');
    });

    it('should filter logs by user ID', async () => {
      const logs = await auditService.queryAuditLogs({ userId: 'user1' });

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user1');
    });

    it('should filter logs by action', async () => {
      const logs = await auditService.queryAuditLogs({ action: 'DATA_READ' });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('DATA_READ');
    });

    it('should filter logs by resource type', async () => {
      const logs = await auditService.queryAuditLogs({ resourceType: 'HEALTH_DATA' });

      expect(logs).toHaveLength(1);
      expect(logs[0].resourceType).toBe('HEALTH_DATA');
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const logs = await auditService.queryAuditLogs({ startDate, endDate });

      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('log1');
    });

    it('should apply pagination', async () => {
      const logs = await auditService.queryAuditLogs({ limit: 1, offset: 0 });

      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('log2'); // Newest first
    });

    it('should handle query errors gracefully', async () => {
      mockSecureStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const logs = await auditService.queryAuditLogs({});

      expect(logs).toEqual([]);
    });
  });

  describe('getUserAuditLogs', () => {
    it('should get logs for specific user', async () => {
      const mockLogs = [
        {
          id: 'log1',
          userId: 'test-user-123',
          action: 'DATA_READ',
          resourceType: 'USER_PROFILE',
          resourceId: 'profile1',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'TestAgent/1.0'
        }
      ];

      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));

      const logs = await auditService.getUserAuditLogs('test-user-123');

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('test-user-123');
    });
  });

  describe('getAuditLogSummary', () => {
    const mockLogs: AuditLogEntry[] = [
      {
        id: 'log1',
        userId: 'user1',
        action: 'DATA_READ',
        resourceType: 'USER_PROFILE',
        resourceId: 'profile1',
        timestamp: new Date('2023-01-01'),
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0'
      },
      {
        id: 'log2',
        userId: 'user2',
        action: 'DATA_READ',
        resourceType: 'HEALTH_DATA',
        resourceId: 'health1',
        timestamp: new Date('2023-01-02'),
        ipAddress: '192.168.1.2',
        userAgent: 'TestAgent/1.0'
      }
    ];

    it('should generate audit log summary', async () => {
      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));

      const summary = await auditService.getAuditLogSummary();

      expect(summary.totalEntries).toBe(2);
      expect(summary.uniqueUsers).toBe(2);
      expect(summary.actionTypes['DATA_READ']).toBe(2);
      expect(summary.resourceTypes['USER_PROFILE']).toBe(1);
      expect(summary.resourceTypes['HEALTH_DATA']).toBe(1);
      expect(summary.timeRange.earliest).toEqual(new Date('2023-01-01'));
      expect(summary.timeRange.latest).toEqual(new Date('2023-01-02'));
    });

    it('should handle summary generation errors', async () => {
      mockSecureStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(auditService.getAuditLogSummary()).rejects.toThrow('Storage error');
    });
  });

  describe('exportAuditLogs', () => {
    const mockLogs: AuditLogEntry[] = [
      {
        id: 'log1',
        userId: 'user1',
        action: 'DATA_READ',
        resourceType: 'USER_PROFILE',
        resourceId: 'profile1',
        timestamp: new Date('2023-01-01'),
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0'
      }
    ];

    beforeEach(() => {
      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));
    });

    it('should export logs as JSON', async () => {
      const exported = await auditService.exportAuditLogs({}, 'json');

      expect(exported).toContain('"id": "log1"');
      expect(exported).toContain('"userId": "user1"');
    });

    it('should export logs as CSV', async () => {
      const exported = await auditService.exportAuditLogs({}, 'csv');

      expect(exported).toContain('ID,User ID,Action');
      expect(exported).toContain('log1,user1,DATA_READ');
    });
  });

  describe('isAuditingActive', () => {
    it('should return true when auditing is working', async () => {
      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockSecureStorage.setItem.mockResolvedValue();

      const isActive = await auditService.isAuditingActive();

      expect(isActive).toBe(true);
    });

    it('should return false when auditing fails', async () => {
      mockSecureStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const isActive = await auditService.isAuditingActive();

      expect(isActive).toBe(false);
    });
  });

  describe('purgeOldLogs', () => {
    it('should purge logs older than retention period', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const mockLogs: AuditLogEntry[] = [
        {
          id: 'old-log',
          userId: 'user1',
          action: 'DATA_READ',
          resourceType: 'USER_PROFILE',
          resourceId: 'profile1',
          timestamp: oldDate,
          ipAddress: '192.168.1.1',
          userAgent: 'TestAgent/1.0'
        },
        {
          id: 'recent-log',
          userId: 'user1',
          action: 'DATA_READ',
          resourceType: 'USER_PROFILE',
          resourceId: 'profile1',
          timestamp: recentDate,
          ipAddress: '192.168.1.1',
          userAgent: 'TestAgent/1.0'
        }
      ];

      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));
      mockSecureStorage.setItem.mockResolvedValue();

      const purgedCount = await auditService.purgeOldLogs(30);

      expect(purgedCount).toBe(1);
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'audit_logs',
        expect.stringContaining('recent-log')
      );
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'audit_logs',
        expect.not.stringContaining('old-log')
      );
    });

    it('should handle purge errors', async () => {
      mockSecureStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(auditService.purgeOldLogs(30)).rejects.toThrow('Storage error');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuditLogService.getInstance();
      const instance2 = AuditLogService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      mockSecureStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockSecureStorage.setItem.mockResolvedValue();

      await auditService.cleanup();

      // Should complete without errors
      expect(mockSecureStorage.getItem).toHaveBeenCalled();
    });
  });
});