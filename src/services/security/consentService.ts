/**
 * Consent Management Service
 * HIPAA-compliant consent tracking and management
 * Handles user consent for data collection, processing, and sharing
 */

import { SecureStorageService } from './secureStorage';
import { AuditService } from './auditService';
import { LoggingService } from '../logging/loggingService';

export type ConsentType = 
  | 'data_collection'
  | 'data_processing'
  | 'data_sharing'
  | 'marketing'
  | 'analytics'
  | 'push_notifications'
  | 'location_tracking'
  | 'health_data_processing'
  | 'third_party_integrations';

export type ConsentStatus = 'granted' | 'denied' | 'withdrawn' | 'expired';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  version: string;
  grantedAt?: number;
  withdrawnAt?: number;
  expiresAt?: number;
  ipAddress?: string;
  userAgent?: string;
  consentText: string;
  metadata: {
    method: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
    source: string;
    deviceId: string;
    appVersion: string;
  };
  history: ConsentHistoryEntry[];
}

export interface ConsentHistoryEntry {
  timestamp: number;
  action: 'granted' | 'denied' | 'withdrawn' | 'updated' | 'expired';
  status: ConsentStatus;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ConsentRequirement {
  type: ConsentType;
  required: boolean;
  title: string;
  description: string;
  detailedDescription: string;
  purposes: string[];
  dataTypes: string[];
  retentionPeriod?: number; // in days
  thirdParties?: string[];
  version: string;
}

export interface ConsentSummary {
  userId: string;
  totalConsents: number;
  grantedConsents: number;
  deniedConsents: number;
  withdrawnConsents: number;
  expiredConsents: number;
  lastUpdated: number;
  complianceStatus: 'compliant' | 'non_compliant' | 'partial';
  missingConsents: ConsentType[];
}

/**
 * Consent Service Class
 */
export class ConsentService {
  private static instance: ConsentService;
  private secureStorage: SecureStorageService;
  private auditService: AuditService;
  private loggingService: LoggingService;

  // Define consent requirements
  private consentRequirements: Record<ConsentType, ConsentRequirement> = {
    data_collection: {
      type: 'data_collection',
      required: true,
      title: 'Data Collection',
      description: 'Allow collection of your health and usage data',
      detailedDescription: 'We collect your health information, app usage patterns, and device information to provide personalized health tips and improve our services.',
      purposes: ['personalization', 'service_improvement', 'analytics'],
      dataTypes: ['health_data', 'usage_data', 'device_info'],
      retentionPeriod: 2555, // 7 years
      version: '1.0',
    },
    data_processing: {
      type: 'data_processing',
      required: true,
      title: 'Data Processing',
      description: 'Allow processing of your data for personalized recommendations',
      detailedDescription: 'We process your health data using AI algorithms to provide personalized health tips and track your progress.',
      purposes: ['personalization', 'ai_processing', 'recommendations'],
      dataTypes: ['health_data', 'preferences', 'progress_data'],
      retentionPeriod: 2555,
      version: '1.0',
    },
    data_sharing: {
      type: 'data_sharing',
      required: false,
      title: 'Data Sharing',
      description: 'Allow sharing anonymized data for research purposes',
      detailedDescription: 'We may share anonymized and aggregated data with research partners to advance health research. No personally identifiable information is shared.',
      purposes: ['research', 'public_health'],
      dataTypes: ['anonymized_health_data', 'aggregated_usage_data'],
      thirdParties: ['research_institutions', 'health_organizations'],
      retentionPeriod: 1825, // 5 years
      version: '1.0',
    },
    marketing: {
      type: 'marketing',
      required: false,
      title: 'Marketing Communications',
      description: 'Receive marketing communications and promotional content',
      detailedDescription: 'We may send you information about new features, health tips, and promotional offers via email or push notifications.',
      purposes: ['marketing', 'promotions', 'feature_announcements'],
      dataTypes: ['contact_info', 'preferences'],
      retentionPeriod: 1095, // 3 years
      version: '1.0',
    },
    analytics: {
      type: 'analytics',
      required: false,
      title: 'Analytics and Performance',
      description: 'Allow collection of analytics data to improve app performance',
      detailedDescription: 'We collect anonymous usage analytics to understand how you use the app and identify areas for improvement.',
      purposes: ['analytics', 'performance_monitoring', 'crash_reporting'],
      dataTypes: ['usage_analytics', 'performance_data', 'crash_logs'],
      retentionPeriod: 730, // 2 years
      version: '1.0',
    },
    push_notifications: {
      type: 'push_notifications',
      required: false,
      title: 'Push Notifications',
      description: 'Receive push notifications for health tips and reminders',
      detailedDescription: 'We send push notifications to remind you about daily health tips, streak milestones, and important updates.',
      purposes: ['notifications', 'reminders', 'engagement'],
      dataTypes: ['device_token', 'notification_preferences'],
      retentionPeriod: 365, // 1 year
      version: '1.0',
    },
    location_tracking: {
      type: 'location_tracking',
      required: false,
      title: 'Location Tracking',
      description: 'Allow location-based health recommendations',
      detailedDescription: 'We may use your location to provide location-specific health tips, such as air quality information or local health resources.',
      purposes: ['location_based_tips', 'local_resources'],
      dataTypes: ['location_data', 'geolocation'],
      retentionPeriod: 365,
      version: '1.0',
    },
    health_data_processing: {
      type: 'health_data_processing',
      required: true,
      title: 'Health Data Processing',
      description: 'Process your health information for personalized care',
      detailedDescription: 'We process your health information, including medical history and health goals, to provide personalized health recommendations and track your progress.',
      purposes: ['health_recommendations', 'progress_tracking', 'personalized_care'],
      dataTypes: ['medical_history', 'health_goals', 'progress_data'],
      retentionPeriod: 2555, // 7 years for medical data
      version: '1.0',
    },
    third_party_integrations: {
      type: 'third_party_integrations',
      required: false,
      title: 'Third-Party Integrations',
      description: 'Allow integration with third-party health apps and services',
      detailedDescription: 'We may integrate with third-party health apps and services to provide a more comprehensive health experience.',
      purposes: ['integration', 'data_sync', 'enhanced_features'],
      dataTypes: ['integration_data', 'sync_data'],
      thirdParties: ['health_apps', 'fitness_trackers', 'medical_services'],
      retentionPeriod: 1095,
      version: '1.0',
    },
  };

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.auditService = AuditService.getInstance();
    this.loggingService = LoggingService.getInstance();
  }

  public static getInstance(): ConsentService {
    if (!ConsentService.instance) {
      ConsentService.instance = new ConsentService();
    }
    return ConsentService.instance;
  }

  /**
   * Grant consent for a specific type
   */
  public async grantConsent(
    userId: string,
    consentType: ConsentType,
    metadata: {
      method: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
      source: string;
      deviceId: string;
      appVersion: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<string> {
    try {
      const requirement = this.consentRequirements[consentType];
      if (!requirement) {
        throw new Error(`Unknown consent type: ${consentType}`);
      }

      const consentId = this.generateConsentId(userId, consentType);
      const now = Date.now();
      
      // Check if consent already exists
      const existingConsent = await this.getConsent(userId, consentType);
      
      const historyEntry: ConsentHistoryEntry = {
        timestamp: now,
        action: 'granted',
        status: 'granted',
        metadata: { ...metadata },
      };

      let consentRecord: ConsentRecord;

      if (existingConsent) {
        // Update existing consent
        consentRecord = {
          ...existingConsent,
          status: 'granted',
          grantedAt: now,
          withdrawnAt: undefined,
          expiresAt: requirement.retentionPeriod ? 
            now + (requirement.retentionPeriod * 24 * 60 * 60 * 1000) : undefined,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          version: requirement.version,
          consentText: this.generateConsentText(requirement),
          metadata,
          history: [...existingConsent.history, historyEntry],
        };
      } else {
        // Create new consent record
        consentRecord = {
          id: consentId,
          userId,
          consentType,
          status: 'granted',
          version: requirement.version,
          grantedAt: now,
          expiresAt: requirement.retentionPeriod ? 
            now + (requirement.retentionPeriod * 24 * 60 * 60 * 1000) : undefined,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          consentText: this.generateConsentText(requirement),
          metadata,
          history: [historyEntry],
        };
      }

      // Store consent record
      await this.storeConsent(consentRecord);

      // Audit the consent grant
      await this.auditService.logConsentEvent(
        'given',
        userId,
        consentType,
        {
          consentId,
          method: metadata.method,
          source: metadata.source,
          version: requirement.version,
        }
      );

      await this.loggingService.logInfo(`Consent granted: ${consentType}`, {
        module: 'ConsentService',
        method: 'grantConsent',
        userId,
        consentType,
        consentId,
        method: metadata.method,
      });

      return consentId;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Consent grant failed'),
        {
          module: 'ConsentService',
          method: 'grantConsent',
          userId,
          consentType,
        }
      );
      
      throw error;
    }
  }

  /**
   * Withdraw consent
   */
  public async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string
  ): Promise<void> {
    try {
      const existingConsent = await this.getConsent(userId, consentType);
      if (!existingConsent) {
        throw new Error(`No consent record found for ${consentType}`);
      }

      const now = Date.now();
      const historyEntry: ConsentHistoryEntry = {
        timestamp: now,
        action: 'withdrawn',
        status: 'withdrawn',
        reason,
      };

      const updatedConsent: ConsentRecord = {
        ...existingConsent,
        status: 'withdrawn',
        withdrawnAt: now,
        history: [...existingConsent.history, historyEntry],
      };

      await this.storeConsent(updatedConsent);

      // Audit the consent withdrawal
      await this.auditService.logConsentEvent(
        'withdrawn',
        userId,
        consentType,
        {
          consentId: existingConsent.id,
          reason,
          withdrawnAt: now,
        }
      );

      await this.loggingService.logInfo(`Consent withdrawn: ${consentType}`, {
        module: 'ConsentService',
        method: 'withdrawConsent',
        userId,
        consentType,
        consentId: existingConsent.id,
        reason,
      });
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Consent withdrawal failed'),
        {
          module: 'ConsentService',
          method: 'withdrawConsent',
          userId,
          consentType,
        }
      );
      
      throw error;
    }
  }

  /**
   * Check if user has granted consent for a specific type
   */
  public async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    try {
      const consent = await this.getConsent(userId, consentType);
      
      if (!consent || consent.status !== 'granted') {
        return false;
      }

      // Check if consent has expired
      if (consent.expiresAt && Date.now() > consent.expiresAt) {
        await this.expireConsent(userId, consentType);
        return false;
      }

      return true;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Consent check failed'),
        {
          module: 'ConsentService',
          method: 'hasConsent',
          userId,
          consentType,
        }
      );
      
      return false;
    }
  }

  /**
   * Get consent record
   */
  public async getConsent(userId: string, consentType: ConsentType): Promise<ConsentRecord | null> {
    try {
      const key = this.getConsentKey(userId, consentType);
      return await this.secureStorage.getItem<ConsentRecord>(key, {
        userId,
        dataType: 'consent_records',
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all consents for a user
   */
  public async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const consents: ConsentRecord[] = [];
      
      for (const consentType of Object.keys(this.consentRequirements) as ConsentType[]) {
        const consent = await this.getConsent(userId, consentType);
        if (consent) {
          consents.push(consent);
        }
      }

      return consents;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Get user consents failed'),
        {
          module: 'ConsentService',
          method: 'getUserConsents',
          userId,
        }
      );
      
      return [];
    }
  }

  /**
   * Get consent summary for a user
   */
  public async getConsentSummary(userId: string): Promise<ConsentSummary> {
    try {
      const consents = await this.getUserConsents(userId);
      const requiredConsents = Object.values(this.consentRequirements)
        .filter(req => req.required)
        .map(req => req.type);

      const grantedConsents = consents.filter(c => c.status === 'granted').length;
      const deniedConsents = consents.filter(c => c.status === 'denied').length;
      const withdrawnConsents = consents.filter(c => c.status === 'withdrawn').length;
      const expiredConsents = consents.filter(c => c.status === 'expired').length;

      const grantedTypes = new Set(
        consents.filter(c => c.status === 'granted').map(c => c.consentType)
      );
      const missingConsents = requiredConsents.filter(type => !grantedTypes.has(type));

      const complianceStatus: 'compliant' | 'non_compliant' | 'partial' = 
        missingConsents.length === 0 ? 'compliant' :
        grantedConsents === 0 ? 'non_compliant' : 'partial';

      return {
        userId,
        totalConsents: consents.length,
        grantedConsents,
        deniedConsents,
        withdrawnConsents,
        expiredConsents,
        lastUpdated: Math.max(...consents.map(c => 
          Math.max(c.grantedAt || 0, c.withdrawnAt || 0)
        ), 0),
        complianceStatus,
        missingConsents,
      };
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Get consent summary failed'),
        {
          module: 'ConsentService',
          method: 'getConsentSummary',
          userId,
        }
      );
      
      throw error;
    }
  }

  /**
   * Get consent requirements
   */
  public getConsentRequirements(): Record<ConsentType, ConsentRequirement> {
    return { ...this.consentRequirements };
  }

  /**
   * Get specific consent requirement
   */
  public getConsentRequirement(consentType: ConsentType): ConsentRequirement | null {
    return this.consentRequirements[consentType] || null;
  }

  /**
   * Export user consent data for GDPR/HIPAA compliance
   */
  public async exportUserConsentData(userId: string): Promise<{
    consents: ConsentRecord[];
    summary: ConsentSummary;
    exportedAt: number;
  }> {
    try {
      const consents = await this.getUserConsents(userId);
      const summary = await this.getConsentSummary(userId);

      const exportData = {
        consents,
        summary,
        exportedAt: Date.now(),
      };

      // Audit the data export
      await this.auditService.logEvent(
        'data_export',
        'CONSENT_DATA_EXPORT',
        'success',
        {
          exportType: 'consent_data',
          recordCount: consents.length,
        },
        {
          userId,
          severity: 'medium',
        }
      );

      return exportData;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Consent data export failed'),
        {
          module: 'ConsentService',
          method: 'exportUserConsentData',
          userId,
        }
      );
      
      throw error;
    }
  }

  /**
   * Delete all consent data for a user (for account deletion)
   */
  public async deleteUserConsentData(userId: string): Promise<void> {
    try {
      const consents = await this.getUserConsents(userId);
      
      for (const consent of consents) {
        const key = this.getConsentKey(userId, consent.consentType);
        await this.secureStorage.removeItem(key, {
          userId,
          dataType: 'consent_records',
        });
      }

      // Audit the data deletion
      await this.auditService.logEvent(
        'data_delete',
        'CONSENT_DATA_DELETE',
        'success',
        {
          deletedRecords: consents.length,
        },
        {
          userId,
          severity: 'high',
        }
      );

      await this.loggingService.logInfo(`Deleted consent data for user ${userId}`, {
        module: 'ConsentService',
        method: 'deleteUserConsentData',
        userId,
        deletedRecords: consents.length,
      });
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Consent data deletion failed'),
        {
          module: 'ConsentService',
          method: 'deleteUserConsentData',
          userId,
        }
      );
      
      throw error;
    }
  }

  // Private helper methods

  private generateConsentId(userId: string, consentType: ConsentType): string {
    return `consent_${userId}_${consentType}_${Date.now()}`;
  }

  private getConsentKey(userId: string, consentType: ConsentType): string {
    return `consent_${userId}_${consentType}`;
  }

  private generateConsentText(requirement: ConsentRequirement): string {
    return `${requirement.title}: ${requirement.detailedDescription} ` +
           `Purposes: ${requirement.purposes.join(', ')}. ` +
           `Data types: ${requirement.dataTypes.join(', ')}. ` +
           `${requirement.retentionPeriod ? `Retention: ${requirement.retentionPeriod} days. ` : ''}` +
           `${requirement.thirdParties ? `Third parties: ${requirement.thirdParties.join(', ')}. ` : ''}` +
           `Version: ${requirement.version}`;
  }

  private async storeConsent(consent: ConsentRecord): Promise<void> {
    const key = this.getConsentKey(consent.userId, consent.consentType);
    
    await this.secureStorage.setItem(key, consent, {
      encrypt: true,
      userId: consent.userId,
      dataType: 'consent_records',
      expirationTime: consent.expiresAt,
    });
  }

  private async expireConsent(userId: string, consentType: ConsentType): Promise<void> {
    const consent = await this.getConsent(userId, consentType);
    if (!consent) return;

    const now = Date.now();
    const historyEntry: ConsentHistoryEntry = {
      timestamp: now,
      action: 'expired',
      status: 'expired',
      reason: 'Consent expired based on retention period',
    };

    const updatedConsent: ConsentRecord = {
      ...consent,
      status: 'expired',
      history: [...consent.history, historyEntry],
    };

    await this.storeConsent(updatedConsent);

    // Audit the consent expiration
    await this.auditService.logEvent(
      'system_event',
      'CONSENT_EXPIRED',
      'success',
      {
        consentType,
        consentId: consent.id,
        expiredAt: now,
      },
      {
        userId,
        severity: 'medium',
      }
    );
  }
}

// Convenience functions for common consent operations

/**
 * Check if user has granted specific consent
 */
export async function hasUserConsent(userId: string, consentType: ConsentType): Promise<boolean> {
  const consentService = ConsentService.getInstance();
  return consentService.hasConsent(userId, consentType);
}

/**
 * Grant consent for a user
 */
export async function grantUserConsent(
  userId: string,
  consentType: ConsentType,
  metadata: {
    method: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
    source: string;
    deviceId: string;
    appVersion: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<string> {
  const consentService = ConsentService.getInstance();
  return consentService.grantConsent(userId, consentType, metadata);
}

/**
 * Withdraw consent for a user
 */
export async function withdrawUserConsent(
  userId: string,
  consentType: ConsentType,
  reason?: string
): Promise<void> {
  const consentService = ConsentService.getInstance();
  return consentService.withdrawConsent(userId, consentType, reason);
}