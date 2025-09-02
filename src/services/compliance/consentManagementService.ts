/**
 * Consent Management Service
 * Handles HIPAA-compliant consent collection, storage, and management
 */

import { SecureStorageService } from '../security/secureStorage';
import { AuditLogService } from './auditLogService';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  version: string;
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  expirationDate?: Date;
  withdrawalDate?: Date;
  details?: Record<string, any>;
}

export interface ConsentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  category: 'HIPAA' | 'PRIVACY' | 'MARKETING' | 'ANALYTICS' | 'RESEARCH';
  version: string;
}

export interface ConsentStatus {
  hasValidConsent: boolean;
  consentRecords: ConsentRecord[];
  missingConsents: ConsentType[];
  expiredConsents: ConsentRecord[];
  lastConsentDate?: Date;
}

export interface ConsentRequest {
  userId: string;
  consentTypes: string[];
  ipAddress: string;
  userAgent: string;
  granted: boolean;
  details?: Record<string, any>;
}

export class ConsentManagementService {
  private static instance: ConsentManagementService;
  private secureStorage: SecureStorageService;
  private auditLogService: AuditLogService;
  private consentTypes: Map<string, ConsentType> = new Map();

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    this.initializeConsentTypes();
  }

  public static getInstance(): ConsentManagementService {
    if (!ConsentManagementService.instance) {
      ConsentManagementService.instance = new ConsentManagementService();
    }
    return ConsentManagementService.instance;
  }

  /**
   * Initialize default consent types
   */
  private initializeConsentTypes(): void {
    const defaultConsentTypes: ConsentType[] = [
      {
        id: 'hipaa_authorization',
        name: 'HIPAA Authorization',
        description: 'Authorization to use and disclose protected health information for treatment, payment, and healthcare operations',
        required: true,
        category: 'HIPAA',
        version: '1.0'
      },
      {
        id: 'data_processing',
        name: 'Data Processing Consent',
        description: 'Consent to process personal health information for app functionality',
        required: true,
        category: 'PRIVACY',
        version: '1.0'
      },
      {
        id: 'analytics_consent',
        name: 'Analytics Consent',
        description: 'Consent to collect anonymized usage analytics for app improvement',
        required: false,
        category: 'ANALYTICS',
        version: '1.0'
      },
      {
        id: 'marketing_consent',
        name: 'Marketing Communications',
        description: 'Consent to receive marketing communications and promotional materials',
        required: false,
        category: 'MARKETING',
        version: '1.0'
      },
      {
        id: 'research_consent',
        name: 'Research Participation',
        description: 'Consent to participate in health research studies using anonymized data',
        required: false,
        category: 'RESEARCH',
        version: '1.0'
      }
    ];

    defaultConsentTypes.forEach(consentType => {
      this.consentTypes.set(consentType.id, consentType);
    });
  }

  /**
   * Initialize consent for a new user
   */
  public async initializeUserConsent(userId: string): Promise<void> {
    try {
      // Create empty consent record for the user
      const userConsents: ConsentRecord[] = [];
      await this.secureStorage.setItem(
        `user_consents_${userId}`,
        JSON.stringify(userConsents)
      );

      // Log consent initialization
      await this.auditLogService.logDataAccess({
        userId,
        action: 'CONSENT_INITIALIZATION',
        resourceType: 'CONSENT',
        resourceId: userId,
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: { consentTypesAvailable: Array.from(this.consentTypes.keys()) }
      });

      console.log(`Consent management initialized for user: ${userId}`);
    } catch (error) {
      console.error('Failed to initialize user consent:', error);
      throw error;
    }
  }

  /**
   * Record user consent
   */
  public async recordConsent(request: ConsentRequest): Promise<ConsentRecord[]> {
    try {
      const consentRecords: ConsentRecord[] = [];
      const timestamp = new Date();

      for (const consentTypeId of request.consentTypes) {
        const consentType = this.consentTypes.get(consentTypeId);
        if (!consentType) {
          throw new Error(`Unknown consent type: ${consentTypeId}`);
        }

        const consentRecord: ConsentRecord = {
          id: this.generateConsentId(),
          userId: request.userId,
          consentType,
          version: consentType.version,
          granted: request.granted,
          timestamp,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          details: request.details
        };

        // Set expiration date if applicable (HIPAA authorizations typically expire after 1 year)
        if (consentType.category === 'HIPAA') {
          const expirationDate = new Date(timestamp);
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          consentRecord.expirationDate = expirationDate;
        }

        consentRecords.push(consentRecord);
      }

      // Store consent records
      await this.storeConsentRecords(request.userId, consentRecords);

      // Log consent recording
      await this.auditLogService.logDataAccess({
        userId: request.userId,
        action: 'CONSENT_RECORDED',
        resourceType: 'CONSENT',
        resourceId: request.userId,
        timestamp,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: {
          consentTypes: request.consentTypes,
          granted: request.granted,
          recordCount: consentRecords.length
        }
      });

      return consentRecords;
    } catch (error) {
      console.error('Failed to record consent:', error);
      
      // Log consent recording failure
      await this.auditLogService.logDataAccess({
        userId: request.userId,
        action: 'CONSENT_RECORDING_FAILED',
        resourceType: 'CONSENT',
        resourceId: request.userId,
        timestamp: new Date(),
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        success: false,
        errorMessage: (error as Error).message,
        details: { consentTypes: request.consentTypes }
      });

      throw error;
    }
  }

  /**
   * Withdraw consent
   */
  public async withdrawConsent(
    userId: string,
    consentTypeIds: string[],
    ipAddress: string,
    userAgent: string,
    reason?: string
  ): Promise<void> {
    try {
      const existingConsents = await this.getUserConsents(userId);
      const timestamp = new Date();

      // Mark specified consents as withdrawn
      const updatedConsents = existingConsents.map(consent => {
        if (consentTypeIds.includes(consent.consentType.id) && consent.granted && !consent.withdrawalDate) {
          return {
            ...consent,
            granted: false,
            withdrawalDate: timestamp
          };
        }
        return consent;
      });

      // Store updated consents
      await this.secureStorage.setItem(
        `user_consents_${userId}`,
        JSON.stringify(updatedConsents)
      );

      // Log consent withdrawal
      await this.auditLogService.logDataAccess({
        userId,
        action: 'CONSENT_WITHDRAWN',
        resourceType: 'CONSENT',
        resourceId: userId,
        timestamp,
        ipAddress,
        userAgent,
        details: {
          withdrawnConsentTypes: consentTypeIds,
          reason,
          withdrawalDate: timestamp.toISOString()
        }
      });

      console.log(`Consent withdrawn for user ${userId}:`, consentTypeIds);
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      throw error;
    }
  }

  /**
   * Get consent status for a user
   */
  public async getConsentStatus(userId: string): Promise<ConsentStatus> {
    try {
      const userConsents = await this.getUserConsents(userId);
      const requiredConsentTypes = Array.from(this.consentTypes.values())
        .filter(type => type.required);

      const validConsents = userConsents.filter(consent => 
        consent.granted && 
        !consent.withdrawalDate &&
        (!consent.expirationDate || consent.expirationDate > new Date())
      );

      const expiredConsents = userConsents.filter(consent =>
        consent.granted &&
        !consent.withdrawalDate &&
        consent.expirationDate &&
        consent.expirationDate <= new Date()
      );

      const grantedConsentTypeIds = new Set(
        validConsents.map(consent => consent.consentType.id)
      );

      const missingConsents = requiredConsentTypes.filter(type =>
        !grantedConsentTypeIds.has(type.id)
      );

      const hasValidConsent = missingConsents.length === 0;

      const lastConsentDate = userConsents.length > 0 
        ? new Date(Math.max(...userConsents.map(c => c.timestamp.getTime())))
        : undefined;

      const status: ConsentStatus = {
        hasValidConsent,
        consentRecords: userConsents,
        missingConsents,
        expiredConsents,
        lastConsentDate
      };

      // Log consent status check
      await this.auditLogService.logDataAccess({
        userId,
        action: 'CONSENT_STATUS_CHECK',
        resourceType: 'CONSENT',
        resourceId: userId,
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: {
          hasValidConsent,
          missingConsentCount: missingConsents.length,
          expiredConsentCount: expiredConsents.length
        }
      });

      return status;
    } catch (error) {
      console.error('Failed to get consent status:', error);
      throw error;
    }
  }

  /**
   * Get all available consent types
   */
  public getAvailableConsentTypes(): ConsentType[] {
    return Array.from(this.consentTypes.values());
  }

  /**
   * Get required consent types
   */
  public getRequiredConsentTypes(): ConsentType[] {
    return Array.from(this.consentTypes.values()).filter(type => type.required);
  }

  /**
   * Check if specific consent is granted and valid
   */
  public async hasValidConsent(userId: string, consentTypeId: string): Promise<boolean> {
    try {
      const userConsents = await this.getUserConsents(userId);
      const relevantConsent = userConsents.find(consent => 
        consent.consentType.id === consentTypeId
      );

      if (!relevantConsent || !relevantConsent.granted || relevantConsent.withdrawalDate) {
        return false;
      }

      // Check if consent has expired
      if (relevantConsent.expirationDate && relevantConsent.expirationDate <= new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check consent validity:', error);
      return false;
    }
  }

  /**
   * Get consent history for a user
   */
  public async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
    try {
      const consents = await this.getUserConsents(userId);
      
      // Sort by timestamp (newest first)
      return consents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to get consent history:', error);
      return [];
    }
  }

  /**
   * Export consent records for compliance reporting
   */
  public async exportConsentRecords(
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const consents = await this.getConsentHistory(userId);
      
      if (format === 'csv') {
        return this.convertConsentsToCSV(consents);
      } else {
        return JSON.stringify(consents, null, 2);
      }
    } catch (error) {
      console.error('Failed to export consent records:', error);
      throw error;
    }
  }

  /**
   * Check for expiring consents and send notifications
   */
  public async checkExpiringConsents(daysBeforeExpiration: number = 30): Promise<{
    userId: string;
    expiringConsents: ConsentRecord[];
  }[]> {
    try {
      const expirationThreshold = new Date();
      expirationThreshold.setDate(expirationThreshold.getDate() + daysBeforeExpiration);

      const allUserIds = await this.getAllUserIds();
      const expiringConsentsByUser: {
        userId: string;
        expiringConsents: ConsentRecord[];
      }[] = [];

      for (const userId of allUserIds) {
        const userConsents = await this.getUserConsents(userId);
        const expiringConsents = userConsents.filter(consent =>
          consent.granted &&
          !consent.withdrawalDate &&
          consent.expirationDate &&
          consent.expirationDate <= expirationThreshold &&
          consent.expirationDate > new Date()
        );

        if (expiringConsents.length > 0) {
          expiringConsentsByUser.push({
            userId,
            expiringConsents
          });
        }
      }

      // Log expiring consent check
      await this.auditLogService.logSystemEvent('EXPIRING_CONSENTS_CHECK', {
        daysBeforeExpiration,
        usersWithExpiringConsents: expiringConsentsByUser.length,
        totalExpiringConsents: expiringConsentsByUser.reduce(
          (sum, user) => sum + user.expiringConsents.length, 0
        )
      });

      return expiringConsentsByUser;
    } catch (error) {
      console.error('Failed to check expiring consents:', error);
      return [];
    }
  }

  /**
   * Store consent records for a user
   */
  private async storeConsentRecords(userId: string, newRecords: ConsentRecord[]): Promise<void> {
    const existingConsents = await this.getUserConsents(userId);
    const allConsents = [...existingConsents, ...newRecords];
    
    await this.secureStorage.setItem(
      `user_consents_${userId}`,
      JSON.stringify(allConsents)
    );
  }

  /**
   * Get consent records for a user
   */
  private async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const stored = await this.secureStorage.getItem(`user_consents_${userId}`);
      if (!stored) return [];
      
      const consents = JSON.parse(stored);
      return Array.isArray(consents) ? consents.map(consent => ({
        ...consent,
        timestamp: new Date(consent.timestamp),
        expirationDate: consent.expirationDate ? new Date(consent.expirationDate) : undefined,
        withdrawalDate: consent.withdrawalDate ? new Date(consent.withdrawalDate) : undefined
      })) : [];
    } catch (error) {
      console.error('Failed to get user consents:', error);
      return [];
    }
  }

  /**
   * Get all user IDs that have consent records
   */
  private async getAllUserIds(): Promise<string[]> {
    try {
      const allKeys = await this.secureStorage.getAllKeys();
      const consentKeys = allKeys.filter(key => key.startsWith('user_consents_'));
      return consentKeys.map(key => key.replace('user_consents_', ''));
    } catch (error) {
      console.error('Failed to get all user IDs:', error);
      return [];
    }
  }

  /**
   * Generate unique consent ID
   */
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert consent records to CSV format
   */
  private convertConsentsToCSV(consents: ConsentRecord[]): string {
    if (consents.length === 0) return '';

    const headers = [
      'ID', 'User ID', 'Consent Type', 'Version', 'Granted',
      'Timestamp', 'IP Address', 'User Agent', 'Expiration Date',
      'Withdrawal Date', 'Details'
    ];

    const csvRows = [headers.join(',')];

    consents.forEach(consent => {
      const row = [
        consent.id,
        consent.userId,
        consent.consentType.name,
        consent.version,
        consent.granted.toString(),
        consent.timestamp.toISOString(),
        consent.ipAddress,
        consent.userAgent,
        consent.expirationDate?.toISOString() || '',
        consent.withdrawalDate?.toISOString() || '',
        JSON.stringify(consent.details || {}).replace(/"/g, '""')
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}