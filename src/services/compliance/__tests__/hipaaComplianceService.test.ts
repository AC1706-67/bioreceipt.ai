/**
 * HIPAA Compliance Service Tests
 * Comprehensive unit tests for HIPAA compliance functionality
 */

import { HIPAAComplianceService } from '../hipaaComplianceService';
import { ConsentManagementService } from '../consentManagementService';
import { AuditLogService } from '../auditLogService';
import { DataRetentionService } from '../dataRetentionService';
import { IncidentResponseService } from '../incidentResponseService';

// Mock the dependencies
jest.mock('../consentManagementService');
jest.mock('../auditLogService');
jest.mock('../dataRetentionService');
jest.mock('../incidentResponseService');
jest.mock('../../security/secureStorage');

describe('HIPAAComplianceService', () => {
  let hipaaService: HIPAAComplianceService;
  let mockConsentService: jest.Mocked<ConsentManagementService>;
  let mockAuditService: jest.Mocked<AuditLogService>;
  let mockRetentionService: jest.Mocked<DataRetentionService>;
  let mockIncidentService: jest.Mocked<IncidentResponseService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get service instance
    hipaaService = HIPAAComplianceService.getInstance();
    
    // Setup mocked services
    mockConsentService = ConsentManagementService.getInstance() as jest.Mocked<ConsentManagementService>;
    mockAuditService = AuditLogService.getInstance() as jest.Mocked<AuditLogService>;
    mockRetentionService = DataRetentionService.getInstance() as jest.Mocked<DataRetentionService>;
    mockIncidentService = IncidentResponseService.getInstance() as jest.Mocked<IncidentResponseService>;
  });

  describe('initializeUserCompliance', () => {
    it('should initialize HIPAA compliance for a user', async () => {
      const userId = 'test-user-123';
      
      mockAuditService.logDataAccess.mockResolvedValue();
      mockConsentService.initializeUserConsent.mockResolvedValue();
      mockRetentionService.scheduleUserDataRetention.mockResolvedValue();

      await hipaaService.initializeUserCompliance(userId);

      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'COMPLIANCE_INITIALIZATION',
          resourceType: 'USER_PROFILE',
          resourceId: userId
        })
      );
      expect(mockConsentService.initializeUserConsent).toHaveBeenCalledWith(userId);
      expect(mockRetentionService.scheduleUserDataRetention).toHaveBeenCalledWith(userId);
    });

    it('should handle initialization failure and report incident', async () => {
      const userId = 'test-user-123';
      const error = new Error('Initialization failed');
      
      mockConsentService.initializeUserConsent.mockRejectedValue(error);
      mockIncidentService.reportIncident.mockResolvedValue('incident-123');

      await expect(hipaaService.initializeUserCompliance(userId)).rejects.toThrow('Initialization failed');

      expect(mockIncidentService.reportIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COMPLIANCE_INITIALIZATION_FAILURE',
          severity: 'HIGH',
          userId,
          description: 'Failed to initialize HIPAA compliance for user',
          error
        })
      );
    });
  });

  describe('getComplianceStatus', () => {
    it('should return comprehensive compliance status', async () => {
      const userId = 'test-user-123';
      
      mockConsentService.getConsentStatus.mockResolvedValue({
        hasValidConsent: true,
        consentRecords: [],
        missingConsents: [],
        expiredConsents: []
      });
      mockAuditService.isAuditingActive.mockResolvedValue(true);
      mockRetentionService.isRetentionCompliant.mockResolvedValue(true);
      mockIncidentService.isResponseSystemReady.mockResolvedValue(true);

      const status = await hipaaService.getComplianceStatus(userId);

      expect(status).toEqual({
        consentObtained: true,
        auditingActive: true,
        dataRetentionCompliant: true,
        incidentResponseReady: true,
        lastComplianceCheck: expect.any(Date)
      });

      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'COMPLIANCE_STATUS_CHECK',
          resourceType: 'COMPLIANCE_STATUS'
        })
      );
    });

    it('should handle compliance status check failure', async () => {
      const userId = 'test-user-123';
      const error = new Error('Status check failed');
      
      mockConsentService.getConsentStatus.mockRejectedValue(error);

      await expect(hipaaService.getComplianceStatus(userId)).rejects.toThrow('Status check failed');
    });
  });

  describe('handleDataAccessRequest', () => {
    const mockRequest = {
      userId: 'test-user-123',
      requestType: 'view' as const,
      requestedData: ['profile', 'health_tips'],
      requestDate: new Date(),
      status: 'pending' as const
    };

    it('should handle data view request', async () => {
      mockAuditService.logDataAccess.mockResolvedValue();
      
      const requestId = await hipaaService.handleDataAccessRequest(mockRequest);

      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockRequest.userId,
          action: 'DATA_ACCESS_REQUEST',
          resourceType: 'USER_DATA'
        })
      );
    });

    it('should handle data export request', async () => {
      const exportRequest = { ...mockRequest, requestType: 'export' as const };
      mockAuditService.logDataAccess.mockResolvedValue();
      
      const requestId = await hipaaService.handleDataAccessRequest(exportRequest);

      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(mockAuditService.logDataAccess).toHaveBeenCalledTimes(2); // Request + processing
    });

    it('should handle data deletion request', async () => {
      const deleteRequest = { ...mockRequest, requestType: 'delete' as const };
      mockAuditService.logDataAccess.mockResolvedValue();
      mockRetentionService.scheduleDataDeletion.mockResolvedValue(['schedule-123']);
      
      const requestId = await hipaaService.handleDataAccessRequest(deleteRequest);

      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(mockRetentionService.scheduleDataDeletion).toHaveBeenCalledWith(
        mockRequest.userId,
        mockRequest.requestedData
      );
    });

    it('should handle unsupported request type', async () => {
      const invalidRequest = { ...mockRequest, requestType: 'invalid' as any };
      
      await expect(hipaaService.handleDataAccessRequest(invalidRequest)).rejects.toThrow(
        'Unsupported request type: invalid'
      );
    });

    it('should report incident on request failure', async () => {
      const error = new Error('Request processing failed');
      mockAuditService.logDataAccess.mockRejectedValue(error);
      mockIncidentService.reportIncident.mockResolvedValue('incident-123');

      await expect(hipaaService.handleDataAccessRequest(mockRequest)).rejects.toThrow(
        'Request processing failed'
      );

      expect(mockIncidentService.reportIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DATA_ACCESS_REQUEST_FAILURE',
          severity: 'HIGH',
          userId: mockRequest.userId,
          description: 'Failed to process user data access request',
          error
        })
      );
    });
  });

  describe('validateComplianceForOperation', () => {
    it('should validate compliant operation', async () => {
      const userId = 'test-user-123';
      const operation = 'READ';
      const resourceType = 'USER_PROFILE';
      
      mockConsentService.getConsentStatus.mockResolvedValue({
        hasValidConsent: true,
        consentRecords: [],
        missingConsents: [],
        expiredConsents: []
      });
      mockAuditService.logDataAccess.mockResolvedValue();

      const result = await hipaaService.validateComplianceForOperation(userId, operation, resourceType);

      expect(result).toBe(true);
      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'COMPLIANCE_VALIDATION',
          resourceType,
          details: expect.objectContaining({
            operation,
            validationResult: 'PASSED'
          })
        })
      );
    });

    it('should reject operation without valid consent', async () => {
      const userId = 'test-user-123';
      const operation = 'READ';
      const resourceType = 'USER_PROFILE';
      
      mockConsentService.getConsentStatus.mockResolvedValue({
        hasValidConsent: false,
        consentRecords: [],
        missingConsents: [],
        expiredConsents: []
      });
      mockAuditService.logDataAccess.mockResolvedValue();

      await expect(
        hipaaService.validateComplianceForOperation(userId, operation, resourceType)
      ).rejects.toThrow('User consent required for this operation');

      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'COMPLIANCE_VIOLATION',
          details: expect.objectContaining({
            validationResult: 'FAILED'
          })
        })
      );
    });
  });

  describe('handlePotentialBreach', () => {
    const mockIncident = {
      type: 'DATA_BREACH',
      affectedUsers: ['user1', 'user2'],
      description: 'Potential data breach detected',
      severity: 'HIGH' as const
    };

    it('should handle potential breach and initiate notification for high severity', async () => {
      mockIncidentService.reportIncident.mockResolvedValue('incident-123');
      mockAuditService.logDataAccess.mockResolvedValue();

      await hipaaService.handlePotentialBreach(mockIncident);

      expect(mockIncidentService.reportIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          type: mockIncident.type,
          severity: mockIncident.severity,
          description: mockIncident.description,
          affectedUsers: mockIncident.affectedUsers
        })
      );

      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'SYSTEM',
          action: 'BREACH_HANDLING',
          resourceType: 'SECURITY_INCIDENT'
        })
      );
    });

    it('should handle low severity incidents without breach notification', async () => {
      const lowSeverityIncident = { ...mockIncident, severity: 'LOW' as const };
      mockIncidentService.reportIncident.mockResolvedValue('incident-123');
      mockAuditService.logDataAccess.mockResolvedValue();

      await hipaaService.handlePotentialBreach(lowSeverityIncident);

      expect(mockIncidentService.reportIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'LOW'
        })
      );
    });

    it('should handle breach handling failure', async () => {
      const error = new Error('Breach handling failed');
      mockIncidentService.reportIncident.mockRejectedValue(error);

      await expect(hipaaService.handlePotentialBreach(mockIncident)).rejects.toThrow(
        'Breach handling failed'
      );
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = HIPAAComplianceService.getInstance();
      const instance2 = HIPAAComplianceService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('error handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      const userId = 'test-user-123';
      
      // Mock all services to throw errors
      mockConsentService.initializeUserConsent.mockRejectedValue(new Error('Consent service error'));
      mockIncidentService.reportIncident.mockResolvedValue('incident-123');

      await expect(hipaaService.initializeUserCompliance(userId)).rejects.toThrow();
      
      // Should still attempt to report the incident
      expect(mockIncidentService.reportIncident).toHaveBeenCalled();
    });
  });

  describe('data gathering', () => {
    it('should handle data gathering for different data types', async () => {
      const mockRequest = {
        userId: 'test-user-123',
        requestType: 'view' as const,
        requestedData: ['profile', 'health_tips', 'engagements', 'progress', 'audit_logs'],
        requestDate: new Date(),
        status: 'pending' as const
      };

      mockAuditService.logDataAccess.mockResolvedValue();
      mockAuditService.getUserAuditLogs.mockResolvedValue([]);

      const requestId = await hipaaService.handleDataAccessRequest(mockRequest);

      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(mockAuditService.getUserAuditLogs).toHaveBeenCalledWith(mockRequest.userId);
    });
  });
});