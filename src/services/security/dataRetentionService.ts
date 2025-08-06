/**
 * Data Retention Service
 * HIPAA-compliant automated data retention and purging system
 * Manages data lifecycle according to legal and regulatory requirements
 */

import { SecureStorageService } from './secureStorage';
import { AuditService } from './auditService';
import { ConsentService } from './consentService';
import { LoggingService } from '../logging/loggingService';

export type DataCategory = 
  | 'user_profile'
  | 'health_data'
  | 'medical_history'
  | 'progress_data'
  | 'analytics_data'
  | 'audit_logs'
  | 'consent_records'
  | 'feedback_data'
  | 'system_logs'
  | 'cache_data';

export interface RetentionPolicy {
  category: DataCategory;
  retentionPeriodDays: number;
  description: string;
  legalBasis: string;
  autoDelete: boolean;
  requiresUserConsent: boolean;
  exceptions: string[];
}

export interface DataRecord {
  id: string;
  category: DataCategory;
  userId?: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt?: number;
  metadata: Record<string, any>;
  size: number; // in bytes
  encrypted: boolean;
}

export interface RetentionJob {
  id: string;
  category: DataCategory;
  scheduledAt: number;
  executedAt?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsDeleted: number;
  errors: string[];
  duration?: number;
}

export interface RetentionReport {
  generatedAt: number;
  totalRecords: number;
  recordsByCategory: Record<DataCategory, number>;
  expiredRecords: number;
  deletedRecords: number;
  totalDataSize: number;
  oldestRecord: number;
  newestRecord: number;
  complianceStatus: 'compliant' | 'non_compliant' | 'warning';
  issues: string[];
}

/**
 * Data Retention Service Class
 */
export class DataRetentionService {
  private static instance: DataRetentionService;
  private secureStorage: SecureStorageService;
  private auditService: AuditService;
  private consentService: ConsentService;
  private loggingService: LoggingService;

  // HIPAA and regulatory retention policies
  private retentionPolicies: Record<DataCategory, RetentionPolicy> = {
    user_profile: {
      category: 'user_profile',
      retentionPeriodDays: 2555, // 7 years - HIPAA requirement
      description: 'User profile and account information',
      legalBasis: 'HIPAA - 45 CFR 164.316(b)(2)(i)',
      autoDelete: false, // Requires manual review
      requiresUserConsent: true,
      exceptions: ['active_account', 'legal_hold'],
    },
    health_data: {
      category: 'health_data',
      retentionPeriodDays: 2555, // 7 years - HIPAA requirement
      description: 'Protected Health Information (PHI)',
      legalBasis: 'HIPAA - 45 CFR 164.316(b)(2)(i)',
      autoDelete: false, // Requires manual review
      requiresUserConsent: true,
      exceptions: ['ongoing_treatment', 'legal_hold', 'research_consent'],
    },
    medical_history: {
      category: 'medical_history',
      retentionPeriodDays: 2555, // 7 years - HIPAA requirement
      description: 'Medical history and health records',
      legalBasis: 'HIPAA - 45 CFR 164.316(b)(2)(i)',
      autoDelete: false,
      requiresUserConsent: true,
      exceptions: ['ongoing_treatment', 'legal_hold'],
    },
    progress_data: {
      category: 'progress_data',
      retentionPeriodDays: 1825, // 5 years
      description: 'User progress and engagement data',
      legalBasis: 'Business requirement with user consent',
      autoDelete: true,
      requiresUserConsent: true,
      exceptions: ['active_user', 'research_consent'],
    },
    analytics_data: {
      category: 'analytics_data',
      retentionPeriodDays: 730, // 2 years
      description: 'Anonymized analytics and usage data',
      legalBasis: 'Legitimate business interest',
      autoDelete: true,
      requiresUserConsent: false,
      exceptions: ['research_consent'],
    },
    audit_logs: {
      category: 'audit_logs',
      retentionPeriodDays: 2555, // 7 years - HIPAA requirement
      description: 'Security and access audit logs',
      legalBasis: 'HIPAA - 45 CFR 164.312(b)',
      autoDelete: false, // Critical for compliance
      requiresUserConsent: false,
      exceptions: ['legal_hold', 'ongoing_investigation'],
    },
    consent_records: {
      category: 'consent_records',
      retentionPeriodDays: 2555, // 7 years - HIPAA requirement
      description: 'User consent and authorization records',
      legalBasis: 'HIPAA - 45 CFR 164.508',
      autoDelete: false,
      requiresUserConsent: false,
      exceptions: ['legal_hold'],
    },
    feedback_data: {
      category: 'feedback_data',
      retentionPeriodDays: 1095, // 3 years
      description: 'User feedback and support communications',
      legalBasis: 'Business requirement with user consent',
      autoDelete: true,
      requiresUserConsent: true,
      exceptions: ['ongoing_support', 'legal_hold'],
    },
    system_logs: {
      category: 'system_logs',
      retentionPeriodDays: 365, // 1 year
      description: 'System operation and error logs',
      legalBasis: 'Operational requirement',
      autoDelete: true,
      requiresUserConsent: false,
      exceptions: ['security_incident', 'ongoing_investigation'],
    },
    cache_data: {
      category: 'cache_data',
      retentionPeriodDays: 30, // 30 days
      description: 'Temporary cached data',
      legalBasis: 'Operational requirement',
      autoDelete: true,
      requiresUserConsent: false,
      exceptions: [],
    },
  };

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.auditService = AuditService.getInstance();
    this.consentService = ConsentService.getInstance();
    this.loggingService = LoggingService.getInstance();
  }

  public static getInstance(): DataRetentionService {
    if (!DataRetentionService.instance) {
      DataRetentionService.instance = new DataRetentionService();
    }
    return DataRetentionService.instance;
  }

  /**
   * Schedule retention job for a data category
   */
  public async scheduleRetentionJob(category: DataCategory): Promise<string> {
    try {
      const jobId = this.generateJobId(category);
      const policy = this.retentionPolicies[category];
      
      if (!policy) {
        throw new Error(`No retention policy found for category: ${category}`);
      }

      const job: RetentionJob = {
        id: jobId,
        category,
        scheduledAt: Date.now(),
        status: 'pending',
        recordsProcessed: 0,
        recordsDeleted: 0,
        errors: [],
      };

      // Store job record
      await this.secureStorage.setItem(`retention_job_${jobId}`, job, {
        encrypt: true,
        dataType: 'system_logs',
        expirationTime: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      });

      await this.loggingService.logInfo(`Retention job scheduled: ${category}`, {
        module: 'DataRetentionService',
        method: 'scheduleRetentionJob',
        jobId,
        category,
      });

      return jobId;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Failed to schedule retention job'),
        {
          module: 'DataRetentionService',
          method: 'scheduleRetentionJob',
          category,
        }
      );
      
      throw error;
    }
  }

  /**
   * Execute retention job
   */
  public async executeRetentionJob(jobId: string): Promise<RetentionJob> {
    try {
      const job = await this.secureStorage.getItem<RetentionJob>(`retention_job_${jobId}`, {
        dataType: 'system_logs',
      });

      if (!job) {
        throw new Error(`Retention job not found: ${jobId}`);
      }

      if (job.status !== 'pending') {
        throw new Error(`Job ${jobId} is not in pending status: ${job.status}`);
      }

      // Update job status
      job.status = 'running';
      job.executedAt = Date.now();
      await this.updateJob(job);

      const startTime = Date.now();
      const policy = this.retentionPolicies[job.category];

      try {
        // Find expired records
        const expiredRecords = await this.findExpiredRecords(job.category);
        job.recordsProcessed = expiredRecords.length;

        // Process each expired record
        for (const record of expiredRecords) {
          try {
            const canDelete = await this.canDeleteRecord(record, policy);
            
            if (canDelete) {
              await this.deleteRecord(record);
              job.recordsDeleted++;
              
              // Audit the deletion
              await this.auditService.logEvent(
                'data_delete',
                'RETENTION_DELETE',
                'success',
                {
                  recordId: record.id,
                  category: record.category,
                  retentionJobId: jobId,
                  dataSize: record.size,
                },
                {
                  userId: record.userId,
                  severity: 'medium',
                }
              );
            } else {
              await this.loggingService.logWarn(`Record ${record.id} skipped due to exceptions`, {
                module: 'DataRetentionService',
                method: 'executeRetentionJob',
                recordId: record.id,
                category: record.category,
                jobId,
              });
            }
          } catch (recordError) {
            const errorMessage = recordError instanceof Error ? recordError.message : 'Unknown error';
            job.errors.push(`Record ${record.id}: ${errorMessage}`);
            
            await this.loggingService.logError(
              recordError instanceof Error ? recordError : new Error('Record deletion failed'),
              {
                module: 'DataRetentionService',
                method: 'executeRetentionJob',
                recordId: record.id,
                jobId,
              }
            );
          }
        }

        job.status = 'completed';
        job.duration = Date.now() - startTime;

        await this.loggingService.logInfo(`Retention job completed: ${jobId}`, {
          module: 'DataRetentionService',
          method: 'executeRetentionJob',
          jobId,
          category: job.category,
          recordsProcessed: job.recordsProcessed,
          recordsDeleted: job.recordsDeleted,
          duration: job.duration,
          errors: job.errors.length,
        });

      } catch (executionError) {
        job.status = 'failed';
        job.duration = Date.now() - startTime;
        const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown error';
        job.errors.push(`Execution failed: ${errorMessage}`);
        
        await this.loggingService.logError(
          executionError instanceof Error ? executionError : new Error('Retention job execution failed'),
          {
            module: 'DataRetentionService',
            method: 'executeRetentionJob',
            jobId,
            category: job.category,
          }
        );
      }

      // Update final job status
      await this.updateJob(job);

      // Audit the job completion
      await this.auditService.logEvent(
        'system_event',
        'RETENTION_JOB_COMPLETED',
        job.status === 'completed' ? 'success' : 'failure',
        {
          jobId,
          category: job.category,
          recordsProcessed: job.recordsProcessed,
          recordsDeleted: job.recordsDeleted,
          duration: job.duration,
          errorCount: job.errors.length,
        },
        {
          severity: job.status === 'completed' ? 'medium' : 'high',
        }
      );

      return job;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Retention job execution failed'),
        {
          module: 'DataRetentionService',
          method: 'executeRetentionJob',
          jobId,
        }
      );
      
      throw error;
    }
  }

  /**
   * Run retention for all categories
   */
  public async runFullRetention(): Promise<RetentionJob[]> {
    try {
      const jobs: RetentionJob[] = [];
      
      for (const category of Object.keys(this.retentionPolicies) as DataCategory[]) {
        const policy = this.retentionPolicies[category];
        
        if (policy.autoDelete) {
          try {
            const jobId = await this.scheduleRetentionJob(category);
            const job = await this.executeRetentionJob(jobId);
            jobs.push(job);
          } catch (error) {
            await this.loggingService.logError(
              error instanceof Error ? error : new Error(`Failed to run retention for ${category}`),
              {
                module: 'DataRetentionService',
                method: 'runFullRetention',
                category,
              }
            );
          }
        }
      }

      await this.loggingService.logInfo(`Full retention completed`, {
        module: 'DataRetentionService',
        method: 'runFullRetention',
        jobsExecuted: jobs.length,
        totalDeleted: jobs.reduce((sum, job) => sum + job.recordsDeleted, 0),
      });

      return jobs;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Full retention failed'),
        {
          module: 'DataRetentionService',
          method: 'runFullRetention',
        }
      );
      
      throw error;
    }
  }

  /**
   * Generate retention report
   */
  public async generateRetentionReport(): Promise<RetentionReport> {
    try {
      const allKeys = await this.secureStorage.getAllKeys();
      const records: DataRecord[] = [];
      let totalDataSize = 0;

      // Analyze all stored data
      for (const key of allKeys) {
        try {
          // Skip system keys
          if (key.startsWith('retention_job_') || key.startsWith('audit_')) {
            continue;
          }

          const data = await this.secureStorage.getItem(key);
          if (data) {
            const record = this.analyzeDataRecord(key, data);
            records.push(record);
            totalDataSize += record.size;
          }
        } catch (error) {
          // Skip records we can't analyze
          continue;
        }
      }

      const now = Date.now();
      const expiredRecords = records.filter(record => 
        record.expiresAt && record.expiresAt < now
      );

      const recordsByCategory: Record<DataCategory, number> = {} as any;
      for (const category of Object.keys(this.retentionPolicies) as DataCategory[]) {
        recordsByCategory[category] = records.filter(r => r.category === category).length;
      }

      // Check compliance
      const issues: string[] = [];
      let complianceStatus: 'compliant' | 'non_compliant' | 'warning' = 'compliant';

      // Check for overdue deletions
      const overdueRecords = expiredRecords.filter(record => {
        const policy = this.retentionPolicies[record.category];
        return policy && policy.autoDelete && record.expiresAt! < (now - 7 * 24 * 60 * 60 * 1000); // 7 days overdue
      });

      if (overdueRecords.length > 0) {
        issues.push(`${overdueRecords.length} records are overdue for deletion`);
        complianceStatus = 'warning';
      }

      // Check for very old records
      const veryOldRecords = records.filter(record => {
        const age = now - record.createdAt;
        const maxAge = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
        return age > maxAge;
      });

      if (veryOldRecords.length > 0) {
        issues.push(`${veryOldRecords.length} records are older than 10 years`);
        if (complianceStatus === 'compliant') {
          complianceStatus = 'warning';
        }
      }

      const report: RetentionReport = {
        generatedAt: now,
        totalRecords: records.length,
        recordsByCategory,
        expiredRecords: expiredRecords.length,
        deletedRecords: 0, // This would be tracked separately
        totalDataSize,
        oldestRecord: records.length > 0 ? Math.min(...records.map(r => r.createdAt)) : 0,
        newestRecord: records.length > 0 ? Math.max(...records.map(r => r.createdAt)) : 0,
        complianceStatus,
        issues,
      };

      // Audit report generation
      await this.auditService.logEvent(
        'system_event',
        'RETENTION_REPORT_GENERATED',
        'success',
        {
          totalRecords: report.totalRecords,
          expiredRecords: report.expiredRecords,
          complianceStatus: report.complianceStatus,
          issueCount: report.issues.length,
        },
        {
          severity: 'low',
        }
      );

      return report;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Retention report generation failed'),
        {
          module: 'DataRetentionService',
          method: 'generateRetentionReport',
        }
      );
      
      throw error;
    }
  }

  /**
   * Delete user data (for account deletion)
   */
  public async deleteUserData(userId: string): Promise<{
    deletedRecords: number;
    totalSize: number;
    categories: DataCategory[];
  }> {
    try {
      const allKeys = await this.secureStorage.getAllKeys();
      let deletedRecords = 0;
      let totalSize = 0;
      const categories = new Set<DataCategory>();

      for (const key of allKeys) {
        try {
          const data = await this.secureStorage.getItem(key, { userId });
          if (data && this.isUserData(data, userId)) {
            const record = this.analyzeDataRecord(key, data);
            
            await this.secureStorage.removeItem(key, {
              userId,
              dataType: record.category,
            });
            
            deletedRecords++;
            totalSize += record.size;
            categories.add(record.category);

            // Audit each deletion
            await this.auditService.logEvent(
              'data_delete',
              'USER_DATA_DELETE',
              'success',
              {
                recordId: record.id,
                category: record.category,
                dataSize: record.size,
                reason: 'account_deletion',
              },
              {
                userId,
                severity: 'high',
              }
            );
          }
        } catch (error) {
          // Log but continue with other records
          await this.loggingService.logWarn(`Failed to delete record ${key} for user ${userId}`, {
            module: 'DataRetentionService',
            method: 'deleteUserData',
            userId,
            key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const result = {
        deletedRecords,
        totalSize,
        categories: Array.from(categories),
      };

      await this.loggingService.logInfo(`User data deletion completed for ${userId}`, {
        module: 'DataRetentionService',
        method: 'deleteUserData',
        userId,
        ...result,
      });

      return result;
    } catch (error) {
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('User data deletion failed'),
        {
          module: 'DataRetentionService',
          method: 'deleteUserData',
          userId,
        }
      );
      
      throw error;
    }
  }

  /**
   * Get retention policies
   */
  public getRetentionPolicies(): Record<DataCategory, RetentionPolicy> {
    return { ...this.retentionPolicies };
  }

  /**
   * Get retention policy for specific category
   */
  public getRetentionPolicy(category: DataCategory): RetentionPolicy | null {
    return this.retentionPolicies[category] || null;
  }

  // Private helper methods

  private generateJobId(category: DataCategory): string {
    return `retention_${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async updateJob(job: RetentionJob): Promise<void> {
    await this.secureStorage.setItem(`retention_job_${job.id}`, job, {
      encrypt: true,
      dataType: 'system_logs',
      expirationTime: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    });
  }

  private async findExpiredRecords(category: DataCategory): Promise<DataRecord[]> {
    const allKeys = await this.secureStorage.getAllKeys();
    const expiredRecords: DataRecord[] = [];
    const now = Date.now();

    for (const key of allKeys) {
      try {
        const data = await this.secureStorage.getItem(key);
        if (data) {
          const record = this.analyzeDataRecord(key, data);
          
          if (record.category === category && record.expiresAt && record.expiresAt < now) {
            expiredRecords.push(record);
          }
        }
      } catch (error) {
        // Skip records we can't analyze
        continue;
      }
    }

    return expiredRecords;
  }

  private async canDeleteRecord(record: DataRecord, policy: RetentionPolicy): Promise<boolean> {
    // Check if record has exceptions
    if (policy.exceptions.includes('active_account') && record.userId) {
      // Check if user account is still active (this would need integration with user service)
      // For now, assume active if recent access
      const recentAccess = Date.now() - record.lastAccessedAt < (30 * 24 * 60 * 60 * 1000); // 30 days
      if (recentAccess) {
        return false;
      }
    }

    if (policy.exceptions.includes('legal_hold')) {
      // Check for legal hold (this would need integration with legal system)
      // For now, assume no legal hold
    }

    if (policy.exceptions.includes('ongoing_treatment') && record.category === 'health_data') {
      // Check for ongoing treatment (this would need integration with medical system)
      // For now, assume no ongoing treatment for expired records
    }

    if (policy.exceptions.includes('research_consent') && record.userId) {
      // Check if user has granted research consent
      const hasResearchConsent = await this.consentService.hasConsent(record.userId, 'data_sharing');
      if (hasResearchConsent) {
        return false;
      }
    }

    return true;
  }

  private async deleteRecord(record: DataRecord): Promise<void> {
    // The actual deletion would depend on how the record is stored
    // This is a simplified implementation
    await this.secureStorage.removeItem(record.id, {
      userId: record.userId,
      dataType: record.category,
    });
  }

  private analyzeDataRecord(key: string, data: any): DataRecord {
    // This is a simplified analysis - in reality, you'd have more sophisticated logic
    const category = this.inferCategoryFromKey(key);
    const size = JSON.stringify(data).length;
    const now = Date.now();
    
    // Try to extract metadata from the data
    let userId: string | undefined;
    let createdAt = now;
    let lastAccessedAt = now;
    
    if (typeof data === 'object' && data !== null) {
      userId = data.userId || data.user_id;
      createdAt = data.createdAt || data.created_at || data.timestamp || now;
      lastAccessedAt = data.lastAccessedAt || data.last_accessed_at || data.updatedAt || createdAt;
    }

    const policy = this.retentionPolicies[category];
    const expiresAt = policy ? createdAt + (policy.retentionPeriodDays * 24 * 60 * 60 * 1000) : undefined;

    return {
      id: key,
      category,
      userId,
      createdAt,
      lastAccessedAt,
      expiresAt,
      metadata: typeof data === 'object' ? data : {},
      size,
      encrypted: true, // Assume encrypted since we're using secure storage
    };
  }

  private inferCategoryFromKey(key: string): DataCategory {
    // Infer category from key patterns
    if (key.includes('user_') || key.includes('profile_')) return 'user_profile';
    if (key.includes('health_') || key.includes('medical_')) return 'health_data';
    if (key.includes('progress_')) return 'progress_data';
    if (key.includes('analytics_')) return 'analytics_data';
    if (key.includes('audit_')) return 'audit_logs';
    if (key.includes('consent_')) return 'consent_records';
    if (key.includes('feedback_')) return 'feedback_data';
    if (key.includes('cache_')) return 'cache_data';
    if (key.includes('log_') || key.includes('system_')) return 'system_logs';
    
    // Default to user_profile for unknown patterns
    return 'user_profile';
  }

  private isUserData(data: any, userId: string): boolean {
    if (typeof data === 'object' && data !== null) {
      return data.userId === userId || data.user_id === userId;
    }
    return false;
  }
}

// Convenience functions for common retention operations

/**
 * Schedule retention job for a category
 */
export async function scheduleDataRetention(category: DataCategory): Promise<string> {
  const retentionService = DataRetentionService.getInstance();
  return retentionService.scheduleRetentionJob(category);
}

/**
 * Run full data retention
 */
export async function runDataRetention(): Promise<RetentionJob[]> {
  const retentionService = DataRetentionService.getInstance();
  return retentionService.runFullRetention();
}

/**
 * Generate retention compliance report
 */
export async function generateRetentionReport(): Promise<RetentionReport> {
  const retentionService = DataRetentionService.getInstance();
  return retentionService.generateRetentionReport();
}

/**
 * Delete all user data
 */
export async function deleteAllUserData(userId: string): Promise<{
  deletedRecords: number;
  totalSize: number;
  categories: DataCategory[];
}> {
  const retentionService = DataRetentionService.getInstance();
  return retentionService.deleteUserData(userId);
}