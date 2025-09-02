/**
 * Analytics Export Service
 * Handles data export and deletion for GDPR compliance
 */

import { AnalyticsService } from './analyticsService';
import { AnalyticsEvent } from '../../types/analytics';
import { storeData, getData } from '../../utils/storage';

export interface DataExportRequest {
  id: string;
  userId: string;
  requestType: 'export' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  errorMessage?: string;
}

export interface UserDataExport {
  userId: string;
  exportDate: Date;
  dataTypes: string[];
  analytics: {
    events: AnalyticsEvent[];
    summary: {
      totalEvents: number;
      dateRange: {
        from: Date;
        to: Date;
      };
      eventTypes: Record<string, number>;
      sessionsCount: number;
    };
  };
  metadata: {
    exportVersion: string;
    dataRetentionPolicy: string;
    contactInfo: string;
  };
}

/**
 * Analytics Export Service Class
 */
export class AnalyticsExportService {
  private static instance: AnalyticsExportService;
  private analyticsService: AnalyticsService;

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
  }

  public static getInstance(): AnalyticsExportService {
    if (!AnalyticsExportService.instance) {
      AnalyticsExportService.instance = new AnalyticsExportService();
    }
    return AnalyticsExportService.instance;
  }

  /**
   * Request user data export
   */
  public async requestDataExport(userId: string): Promise<DataExportRequest> {
    try {
      const request: DataExportRequest = {
        id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        requestType: 'export',
        status: 'pending',
        requestedAt: new Date(),
      };

      // Store the request
      await this.storeExportRequest(request);

      // Process the export asynchronously
      this.processDataExport(request.id);

      console.log(`Data export requested for user: ${userId}`);
      return request;
    } catch (error) {
      console.error('Error requesting data export:', error);
      throw new Error('Failed to request data export');
    }
  }

  /**
   * Request user data deletion
   */
  public async requestDataDeletion(userId: string): Promise<DataExportRequest> {
    try {
      const request: DataExportRequest = {
        id: `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        requestType: 'delete',
        status: 'pending',
        requestedAt: new Date(),
      };

      // Store the request
      await this.storeExportRequest(request);

      // Process the deletion asynchronously
      this.processDataDeletion(request.id);

      console.log(`Data deletion requested for user: ${userId}`);
      return request;
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      throw new Error('Failed to request data deletion');
    }
  }

  /**
   * Get export request status
   */
  public async getExportRequestStatus(requestId: string): Promise<DataExportRequest | null> {
    try {
      const requests = await this.getAllExportRequests();
      return requests.find(r => r.id === requestId) || null;
    } catch (error) {
      console.error('Error getting export request status:', error);
      return null;
    }
  }

  /**
   * Get user's export requests
   */
  public async getUserExportRequests(userId: string): Promise<DataExportRequest[]> {
    try {
      const requests = await this.getAllExportRequests();
      return requests.filter(r => r.userId === userId);
    } catch (error) {
      console.error('Error getting user export requests:', error);
      return [];
    }
  }

  /**
   * Generate user data export
   */
  public async generateUserDataExport(userId: string): Promise<UserDataExport> {
    try {
      const analyticsEvents = await this.analyticsService.exportUserData(userId);
      
      const eventTypes: Record<string, number> = {};
      const sessions = new Set<string>();
      
      analyticsEvents.forEach(event => {
        eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
        sessions.add(event.sessionId);
      });

      const dateRange = analyticsEvents.length > 0 ? {
        from: new Date(Math.min(...analyticsEvents.map(e => e.timestamp.getTime()))),
        to: new Date(Math.max(...analyticsEvents.map(e => e.timestamp.getTime()))),
      } : {
        from: new Date(),
        to: new Date(),
      };

      const dataExport: UserDataExport = {
        userId,
        exportDate: new Date(),
        dataTypes: ['analytics_events', 'user_sessions', 'engagement_metrics'],
        analytics: {
          events: analyticsEvents,
          summary: {
            totalEvents: analyticsEvents.length,
            dateRange,
            eventTypes,
            sessionsCount: sessions.size,
          },
        },
        metadata: {
          exportVersion: '1.0',
          dataRetentionPolicy: 'Data is retained for 90 days by default',
          contactInfo: 'privacy@BioReceipt.com',
        },
      };

      return dataExport;
    } catch (error) {
      console.error('Error generating user data export:', error);
      throw new Error('Failed to generate data export');
    }
  }

  /**
   * Delete all user data
   */
  public async deleteAllUserData(userId: string): Promise<void> {
    try {
      // Delete analytics data
      await this.analyticsService.deleteUserData(userId);

      // Delete export requests for this user
      const requests = await this.getAllExportRequests();
      const filteredRequests = requests.filter(r => r.userId !== userId);
      await this.storeAllExportRequests(filteredRequests);

      console.log(`All data deleted for user: ${userId}`);
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Get data retention summary
   */
  public async getDataRetentionSummary(userId: string): Promise<{
    dataTypes: string[];
    retentionPeriod: number;
    oldestData: Date | null;
    newestData: Date | null;
    totalEvents: number;
  }> {
    try {
      const analyticsEvents = await this.analyticsService.exportUserData(userId);
      
      const oldestData = analyticsEvents.length > 0 
        ? new Date(Math.min(...analyticsEvents.map(e => e.timestamp.getTime())))
        : null;
      
      const newestData = analyticsEvents.length > 0
        ? new Date(Math.max(...analyticsEvents.map(e => e.timestamp.getTime())))
        : null;

      return {
        dataTypes: ['Analytics Events', 'User Sessions', 'Engagement Metrics'],
        retentionPeriod: 90, // days
        oldestData,
        newestData,
        totalEvents: analyticsEvents.length,
      };
    } catch (error) {
      console.error('Error getting data retention summary:', error);
      throw new Error('Failed to get data retention summary');
    }
  }

  // Private helper methods

  private async processDataExport(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await this.updateExportRequestStatus(requestId, 'processing');

      const request = await this.getExportRequestStatus(requestId);
      if (!request) {
        throw new Error('Export request not found');
      }

      // Generate the export
      const dataExport = await this.generateUserDataExport(request.userId);
      
      // In a real app, you'd upload this to a secure location and provide a download URL
      const downloadUrl = await this.uploadDataExport(dataExport);

      // Update status to completed
      await this.updateExportRequestStatus(requestId, 'completed', downloadUrl);

      console.log(`Data export completed for request: ${requestId}`);
    } catch (error) {
      console.error('Error processing data export:', error);
      await this.updateExportRequestStatus(requestId, 'failed', undefined, error.message);
    }
  }

  private async processDataDeletion(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await this.updateExportRequestStatus(requestId, 'processing');

      const request = await this.getExportRequestStatus(requestId);
      if (!request) {
        throw new Error('Deletion request not found');
      }

      // Delete all user data
      await this.deleteAllUserData(request.userId);

      // Update status to completed
      await this.updateExportRequestStatus(requestId, 'completed');

      console.log(`Data deletion completed for request: ${requestId}`);
    } catch (error) {
      console.error('Error processing data deletion:', error);
      await this.updateExportRequestStatus(requestId, 'failed', undefined, error.message);
    }
  }

  private async uploadDataExport(dataExport: UserDataExport): Promise<string> {
    // In a real app, you'd upload to a secure cloud storage and return the URL
    // For now, we'll just store it locally and return a mock URL
    const exportId = `export_${dataExport.userId}_${Date.now()}`;
    await storeData(`DATA_EXPORT_${exportId}`, dataExport);
    
    return `https://secure.BioReceipt.com/exports/${exportId}`;
  }

  private async storeExportRequest(request: DataExportRequest): Promise<void> {
    const requests = await this.getAllExportRequests();
    requests.push(request);
    await this.storeAllExportRequests(requests);
  }

  private async getAllExportRequests(): Promise<DataExportRequest[]> {
    try {
      const requests = await getData<DataExportRequest[]>('EXPORT_REQUESTS');
      return requests || [];
    } catch (error) {
      console.error('Error getting export requests:', error);
      return [];
    }
  }

  private async storeAllExportRequests(requests: DataExportRequest[]): Promise<void> {
    await storeData('EXPORT_REQUESTS', requests);
  }

  private async updateExportRequestStatus(
    requestId: string,
    status: DataExportRequest['status'],
    downloadUrl?: string,
    errorMessage?: string
  ): Promise<void> {
    const requests = await this.getAllExportRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      throw new Error('Export request not found');
    }

    requests[requestIndex].status = status;
    requests[requestIndex].completedAt = new Date();
    
    if (downloadUrl) {
      requests[requestIndex].downloadUrl = downloadUrl;
    }
    
    if (errorMessage) {
      requests[requestIndex].errorMessage = errorMessage;
    }

    await this.storeAllExportRequests(requests);
  }
}