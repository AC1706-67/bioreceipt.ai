/**
 * Data Retention Service
 * Manages HIPAA-compliant data retention and automated purging
 */

import { SecureStorageService } from '../security/secureStorage';
import { AuditLogService } from './auditLogService';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataType: string;
  retentionPeriodDays: number;
  autoDelete: boolean;
  category: 'HIPAA' | 'PERSONAL' | 'ANALYTICS' | 'SYSTEM';
  createdDate: Date;
  lastUpdated: Date;
}

export interface RetentionSchedule {
  id: string;
  userId: string;
  dataType: string;
  policyId: string;
  scheduledDeletionDate: Date;
  status: 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdDate: Date;
  completedDate?: Date;
  details?: Record<string, any>;
}

export interface DataRetentionSummary {
  totalPolicies: number;
  activePolicies: number;
  scheduledDeletions: number;
  completedDeletions: number;
  failedDeletions: number;
  nextDeletionDate?: Date;
}

export interface DeletionRequest {
  userId: string;
  dataTypes: string[];
  reason: string;
  requestedBy: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
}

export class DataRetentionService {
  private static instance: DataRetentionService;
  private secureStorage: SecureStorageService;
  private auditLogService: AuditLogService;
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private processingInterval?: NodeJS.Timeout;

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    this.initializeDefaultPolicies();
    this.startRetentionProcessing();
  }

  public static getInstance(): DataRetentionService {
    if (!DataRetentionService.instance) {
      DataRetentionService.instance = new DataRetentionService();
    }
    return DataRetentionService.instance;
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: RetentionPolicy[] = [
      {
        id: 'hipaa_health_data',
        name: 'HIPAA Health Data',
        description: 'Protected health information retention as per HIPAA requirements',
        dataType: 'HEALTH_DATA',
        retentionPeriodDays: 2555, // 7 years
        autoDelete: true,
        category: 'HIPAA',
        createdDate: new Date(),
        lastUpdated: new Date()
      },
      {
        id: 'user_profile_data',
        name: 'User Profile Data',
        description: 'Personal user profile information',
        dataType: 'USER_PROFILE',
        retentionPeriodDays: 2555, // 7 years
        autoDelete: true,
        category: 'PERSONAL',
        createdDate: new Date(),
        lastUpdated: new Date()
      },
      {
        id: 'engagement_data',
        name: 'User Engagement Data',
        description: 'User interaction and engagement metrics',
        dataType: 'ENGAGEMENT_DATA',
        retentionPeriodDays: 1095, // 3 years
        autoDelete: true,
        category: 'ANALYTICS',
        createdDate: new Date(),
        lastUpdated: new Date()
      },
      {
        id: 'audit_logs',
        name: 'Audit Logs',
        description: 'System audit and access logs',
        dataType: 'AUDIT_LOGS',
        retentionPeriodDays: 2555, // 7 years
        autoDelete: true,
        category: 'SYSTEM',
        createdDate: new Date(),
        lastUpdated: new Date()
      },
      {
        id: 'session_data',
        name: 'Session Data',
        description: 'User session and temporary data',
        dataType: 'SESSION_DATA',
        retentionPeriodDays: 90, // 3 months
        autoDelete: true,
        category: 'SYSTEM',
        createdDate: new Date(),
        lastUpdated: new Date()
      },
      {
        id: 'error_logs',
        name: 'Error Logs',
        description: 'Application error and diagnostic logs',
        dataType: 'ERROR_LOGS',
        retentionPeriodDays: 365, // 1 year
        autoDelete: true,
        category: 'SYSTEM',
        createdDate: new Date(),
        lastUpdated: new Date()
      }
    ];

    defaultPolicies.forEach(policy => {
      this.retentionPolicies.set(policy.id, policy);
    });
  }

  /**
   * Schedule data retention for a user
   */
  public async scheduleUserDataRetention(userId: string): Promise<void> {
    try {
      const schedules: RetentionSchedule[] = [];
      const currentDate = new Date();

      for (const policy of this.retentionPolicies.values()) {
        const scheduledDeletionDate = new Date(currentDate);
        scheduledDeletionDate.setDate(
          scheduledDeletionDate.getDate() + policy.retentionPeriodDays
        );

        const schedule: RetentionSchedule = {
          id: this.generateScheduleId(),
          userId,
          dataType: policy.dataType,
          policyId: policy.id,
          scheduledDeletionDate,
          status: 'SCHEDULED',
          createdDate: currentDate,
          details: {
            policyName: policy.name,
            retentionPeriodDays: policy.retentionPeriodDays
          }
        };

        schedules.push(schedule);
      }

      // Store retention schedules
      await this.storeRetentionSchedules(userId, schedules);

      // Log retention scheduling
      await this.auditLogService.logDataAccess({
        userId,
        action: 'DATA_RETENTION_SCHEDULED',
        resourceType: 'DATA_RETENTION',
        resourceId: userId,
        timestamp: currentDate,
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: {
          scheduledPolicies: schedules.length,
          earliestDeletion: Math.min(...schedules.map(s => s.scheduledDeletionDate.getTime())),
          latestDeletion: Math.max(...schedules.map(s => s.scheduledDeletionDate.getTime()))
        }
      });

      console.log(`Data retention scheduled for user: ${userId}`);
    } catch (error) {
      console.error('Failed to schedule data retention:', error);
      throw error;
    }
  }

  /**
   * Schedule immediate data deletion
   */
  public async scheduleDataDeletion(
    userId: string,
    dataTypes: string[],
    reason: string = 'User request'
  ): Promise<string[]> {
    try {
      const scheduleIds: string[] = [];
      const currentDate = new Date();
      const immediateDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      for (const dataType of dataTypes) {
        const schedule: RetentionSchedule = {
          id: this.generateScheduleId(),
          userId,
          dataType,
          policyId: 'immediate_deletion',
          scheduledDeletionDate: immediateDate,
          status: 'SCHEDULED',
          createdDate: currentDate,
          details: {
            reason,
            urgency: 'HIGH',
            requestType: 'IMMEDIATE_DELETION'
          }
        };

        await this.storeRetentionSchedule(schedule);
        scheduleIds.push(schedule.id);
      }

      // Log immediate deletion scheduling
      await this.auditLogService.logDataAccess({
        userId,
        action: 'IMMEDIATE_DELETION_SCHEDULED',
        resourceType: 'DATA_RETENTION',
        resourceId: userId,
        timestamp: currentDate,
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: {
          dataTypes,
          reason,
          scheduleIds,
          scheduledDeletionDate: immediateDate.toISOString()
        }
      });

      return scheduleIds;
    } catch (error) {
      console.error('Failed to schedule data deletion:', error);
      throw error;
    }
  }

  /**
   * Process pending retention schedules
   */
  public async processRetentionSchedules(): Promise<void> {
    try {
      const currentDate = new Date();
      const allSchedules = await this.getAllRetentionSchedules();
      
      const dueSchedules = allSchedules.filter(schedule =>
        schedule.status === 'SCHEDULED' &&
        schedule.scheduledDeletionDate <= currentDate
      );

      console.log(`Processing ${dueSchedules.length} due retention schedules`);

      for (const schedule of dueSchedules) {
        await this.processRetentionSchedule(schedule);
      }

      // Log retention processing
      await this.auditLogService.logSystemEvent('RETENTION_PROCESSING_COMPLETED', {
        processedSchedules: dueSchedules.length,
        totalSchedules: allSchedules.length,
        processingDate: currentDate.toISOString()
      });
    } catch (error) {
      console.error('Failed to process retention schedules:', error);
      
      await this.auditLogService.logSystemEvent('RETENTION_PROCESSING_FAILED', {
        error: (error as Error).message,
        processingDate: new Date().toISOString()
      });
    }
  }

  /**
   * Process individual retention schedule
   */
  private async processRetentionSchedule(schedule: RetentionSchedule): Promise<void> {
    try {
      // Update status to processing
      schedule.status = 'PROCESSING';
      await this.updateRetentionSchedule(schedule);

      // Log processing start
      await this.auditLogService.logDataAccess({
        userId: schedule.userId,
        action: 'DATA_DELETION_PROCESSING',
        resourceType: 'DATA_RETENTION',
        resourceId: schedule.id,
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: {
          dataType: schedule.dataType,
          policyId: schedule.policyId,
          scheduledDate: schedule.scheduledDeletionDate.toISOString()
        }
      });

      // Perform actual data deletion based on data type
      const deletionResult = await this.deleteUserData(schedule.userId, schedule.dataType);

      // Update schedule status
      schedule.status = deletionResult.success ? 'COMPLETED' : 'FAILED';
      schedule.completedDate = new Date();
      schedule.details = {
        ...schedule.details,
        deletionResult,
        recordsDeleted: deletionResult.recordsDeleted || 0
      };

      await this.updateRetentionSchedule(schedule);

      // Log completion
      await this.auditLogService.logDataAccess({
        userId: schedule.userId,
        action: deletionResult.success ? 'DATA_DELETION_COMPLETED' : 'DATA_DELETION_FAILED',
        resourceType: 'DATA_RETENTION',
        resourceId: schedule.id,
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        success: deletionResult.success,
        details: {
          dataType: schedule.dataType,
          recordsDeleted: deletionResult.recordsDeleted || 0,
          error: deletionResult.error
        }
      });

    } catch (error) {
      console.error(`Failed to process retention schedule ${schedule.id}:`, error);
      
      // Update schedule status to failed
      schedule.status = 'FAILED';
      schedule.completedDate = new Date();
      schedule.details = {
        ...schedule.details,
        error: (error as Error).message
      };
      
      await this.updateRetentionSchedule(schedule);
    }
  }

  /**
   * Delete user data based on data type
   */
  private async deleteUserData(userId: string, dataType: string): Promise<{
    success: boolean;
    recordsDeleted?: number;
    error?: string;
  }> {
    try {
      let recordsDeleted = 0;

      switch (dataType) {
        case 'USER_PROFILE':
          recordsDeleted = await this.deleteUserProfile(userId);
          break;
        case 'HEALTH_DATA':
          recordsDeleted = await this.deleteHealthData(userId);
          break;
        case 'ENGAGEMENT_DATA':
          recordsDeleted = await this.deleteEngagementData(userId);
          break;
        case 'SESSION_DATA':
          recordsDeleted = await this.deleteSessionData(userId);
          break;
        case 'ERROR_LOGS':
          recordsDeleted = await this.deleteErrorLogs(userId);
          break;
        case 'AUDIT_LOGS':
          // Audit logs are handled separately due to compliance requirements
          recordsDeleted = await this.archiveAuditLogs(userId);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      return {
        success: true,
        recordsDeleted
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Check if retention is compliant for a user
   */
  public async isRetentionCompliant(userId: string): Promise<boolean> {
    try {
      const userSchedules = await this.getUserRetentionSchedules(userId);
      const currentDate = new Date();

      // Check if there are any overdue schedules
      const overdueSchedules = userSchedules.filter(schedule =>
        schedule.status === 'SCHEDULED' &&
        schedule.scheduledDeletionDate < currentDate
      );

      // Check if there are any failed schedules
      const failedSchedules = userSchedules.filter(schedule =>
        schedule.status === 'FAILED'
      );

      const isCompliant = overdueSchedules.length === 0 && failedSchedules.length === 0;

      // Log compliance check
      await this.auditLogService.logDataAccess({
        userId,
        action: 'RETENTION_COMPLIANCE_CHECK',
        resourceType: 'DATA_RETENTION',
        resourceId: userId,
        timestamp: currentDate,
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: {
          isCompliant,
          overdueSchedules: overdueSchedules.length,
          failedSchedules: failedSchedules.length,
          totalSchedules: userSchedules.length
        }
      });

      return isCompliant;
    } catch (error) {
      console.error('Failed to check retention compliance:', error);
      return false;
    }
  }

  /**
   * Get retention summary
   */
  public async getRetentionSummary(): Promise<DataRetentionSummary> {
    try {
      const allSchedules = await this.getAllRetentionSchedules();
      const currentDate = new Date();

      const scheduledDeletions = allSchedules.filter(s => s.status === 'SCHEDULED').length;
      const completedDeletions = allSchedules.filter(s => s.status === 'COMPLETED').length;
      const failedDeletions = allSchedules.filter(s => s.status === 'FAILED').length;

      const upcomingSchedules = allSchedules
        .filter(s => s.status === 'SCHEDULED' && s.scheduledDeletionDate > currentDate)
        .sort((a, b) => a.scheduledDeletionDate.getTime() - b.scheduledDeletionDate.getTime());

      const nextDeletionDate = upcomingSchedules.length > 0 
        ? upcomingSchedules[0].scheduledDeletionDate 
        : undefined;

      return {
        totalPolicies: this.retentionPolicies.size,
        activePolicies: Array.from(this.retentionPolicies.values())
          .filter(p => p.autoDelete).length,
        scheduledDeletions,
        completedDeletions,
        failedDeletions,
        nextDeletionDate
      };
    } catch (error) {
      console.error('Failed to get retention summary:', error);
      throw error;
    }
  }

  /**
   * Start automatic retention processing
   */
  private startRetentionProcessing(): void {
    // Process retention schedules every 24 hours
    this.processingInterval = setInterval(async () => {
      await this.processRetentionSchedules();
    }, 24 * 60 * 60 * 1000);

    console.log('Data retention processing started');
  }

  /**
   * Stop automatic retention processing
   */
  public stopRetentionProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  // Storage helper methods
  private async storeRetentionSchedules(userId: string, schedules: RetentionSchedule[]): Promise<void> {
    const existingSchedules = await this.getUserRetentionSchedules(userId);
    const allSchedules = [...existingSchedules, ...schedules];
    
    await this.secureStorage.setItem(
      `retention_schedules_${userId}`,
      JSON.stringify(allSchedules)
    );
  }

  private async storeRetentionSchedule(schedule: RetentionSchedule): Promise<void> {
    const existingSchedules = await this.getUserRetentionSchedules(schedule.userId);
    const updatedSchedules = [...existingSchedules, schedule];
    
    await this.secureStorage.setItem(
      `retention_schedules_${schedule.userId}`,
      JSON.stringify(updatedSchedules)
    );
  }

  private async updateRetentionSchedule(schedule: RetentionSchedule): Promise<void> {
    const existingSchedules = await this.getUserRetentionSchedules(schedule.userId);
    const updatedSchedules = existingSchedules.map(s => 
      s.id === schedule.id ? schedule : s
    );
    
    await this.secureStorage.setItem(
      `retention_schedules_${schedule.userId}`,
      JSON.stringify(updatedSchedules)
    );
  }

  private async getUserRetentionSchedules(userId: string): Promise<RetentionSchedule[]> {
    try {
      const stored = await this.secureStorage.getItem(`retention_schedules_${userId}`);
      if (!stored) return [];
      
      const schedules = JSON.parse(stored);
      return Array.isArray(schedules) ? schedules.map(schedule => ({
        ...schedule,
        scheduledDeletionDate: new Date(schedule.scheduledDeletionDate),
        createdDate: new Date(schedule.createdDate),
        completedDate: schedule.completedDate ? new Date(schedule.completedDate) : undefined
      })) : [];
    } catch (error) {
      console.error('Failed to get user retention schedules:', error);
      return [];
    }
  }

  private async getAllRetentionSchedules(): Promise<RetentionSchedule[]> {
    try {
      const allKeys = await this.secureStorage.getAllKeys();
      const scheduleKeys = allKeys.filter(key => key.startsWith('retention_schedules_'));
      
      const allSchedules: RetentionSchedule[] = [];
      
      for (const key of scheduleKeys) {
        const userId = key.replace('retention_schedules_', '');
        const userSchedules = await this.getUserRetentionSchedules(userId);
        allSchedules.push(...userSchedules);
      }
      
      return allSchedules;
    } catch (error) {
      console.error('Failed to get all retention schedules:', error);
      return [];
    }
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data deletion methods (simplified implementations)
  private async deleteUserProfile(userId: string): Promise<number> {
    // Implementation would delete user profile data
    console.log(`Deleting user profile for: ${userId}`);
    return 1;
  }

  private async deleteHealthData(userId: string): Promise<number> {
    // Implementation would delete health-related data
    console.log(`Deleting health data for: ${userId}`);
    return 1;
  }

  private async deleteEngagementData(userId: string): Promise<number> {
    // Implementation would delete engagement data
    console.log(`Deleting engagement data for: ${userId}`);
    return 1;
  }

  private async deleteSessionData(userId: string): Promise<number> {
    // Implementation would delete session data
    console.log(`Deleting session data for: ${userId}`);
    return 1;
  }

  private async deleteErrorLogs(userId: string): Promise<number> {
    // Implementation would delete error logs
    console.log(`Deleting error logs for: ${userId}`);
    return 1;
  }

  private async archiveAuditLogs(userId: string): Promise<number> {
    // Implementation would archive (not delete) audit logs for compliance
    console.log(`Archiving audit logs for: ${userId}`);
    return 1;
  }
}