/**
 * Incident Response Service
 * Handles HIPAA-compliant incident detection, reporting, and response
 */

import { SecureStorageService } from '../security/secureStorage';
import { AuditLogService } from './auditLogService';

export interface SecurityIncident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detectedDate: Date;
  reportedDate?: Date;
  resolvedDate?: Date;
  affectedUsers?: string[];
  affectedSystems?: string[];
  detectionMethod: DetectionMethod;
  reporter?: string;
  assignedTo?: string;
  containmentActions?: string[];
  remediationActions?: string[];
  lessonsLearned?: string;
  riskAssessment?: RiskAssessment;
  notificationRequired: boolean;
  notificationSent?: boolean;
  notificationDate?: Date;
  details?: Record<string, any>;
}

export type IncidentType = 
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_BREACH'
  | 'SYSTEM_COMPROMISE'
  | 'MALWARE_DETECTION'
  | 'PHISHING_ATTEMPT'
  | 'INSIDER_THREAT'
  | 'DATA_LOSS'
  | 'COMPLIANCE_VIOLATION'
  | 'AUTHENTICATION_FAILURE'
  | 'SYSTEM_FAILURE'
  | 'NETWORK_INTRUSION'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 
  | 'DETECTED'
  | 'REPORTED'
  | 'INVESTIGATING'
  | 'CONTAINED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'FALSE_POSITIVE';

export type DetectionMethod = 
  | 'AUTOMATED_MONITORING'
  | 'USER_REPORT'
  | 'AUDIT_REVIEW'
  | 'EXTERNAL_NOTIFICATION'
  | 'ROUTINE_CHECK'
  | 'THIRD_PARTY_ALERT';

export interface RiskAssessment {
  dataConfidentialityImpact: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  dataIntegrityImpact: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  dataAvailabilityImpact: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  potentialDamage: string;
  mitigatingFactors?: string[];
}

export interface IncidentReport {
  type: string;
  severity: IncidentSeverity;
  description: string;
  userId?: string;
  affectedUsers?: string[];
  error?: Error;
  details?: Record<string, any>;
}

export interface IncidentMetrics {
  totalIncidents: number;
  incidentsByType: Record<IncidentType, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  incidentsByStatus: Record<IncidentStatus, number>;
  averageResolutionTime: number;
  openIncidents: number;
  criticalIncidents: number;
  breachNotifications: number;
}

export class IncidentResponseService {
  private static instance: IncidentResponseService;
  private secureStorage: SecureStorageService;
  private auditLogService: AuditLogService;
  private monitoringActive = true;
  private alertThresholds: Map<string, number> = new Map();

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    this.initializeAlertThresholds();
  }

  public static getInstance(): IncidentResponseService {
    if (!IncidentResponseService.instance) {
      IncidentResponseService.instance = new IncidentResponseService();
    }
    return IncidentResponseService.instance;
  }

  /**
   * Initialize alert thresholds for automated detection
   */
  private initializeAlertThresholds(): void {
    this.alertThresholds.set('FAILED_LOGIN_ATTEMPTS', 5);
    this.alertThresholds.set('RAPID_DATA_ACCESS', 100);
    this.alertThresholds.set('UNUSUAL_ACCESS_PATTERN', 10);
    this.alertThresholds.set('DATA_EXPORT_VOLUME', 1000);
    this.alertThresholds.set('SYSTEM_ERROR_RATE', 50);
  }

  /**
   * Report a security incident
   */
  public async reportIncident(report: IncidentReport): Promise<string> {
    try {
      const incident: SecurityIncident = {
        id: this.generateIncidentId(),
        type: this.classifyIncidentType(report.type),
        severity: report.severity,
        status: 'DETECTED',
        title: this.generateIncidentTitle(report.type, report.severity),
        description: report.description,
        detectedDate: new Date(),
        affectedUsers: report.affectedUsers || (report.userId ? [report.userId] : []),
        detectionMethod: 'AUTOMATED_MONITORING',
        notificationRequired: this.requiresNotification(report.severity, report.type),
        details: {
          ...report.details,
          error: report.error ? {
            message: report.error.message,
            stack: report.error.stack,
            name: report.error.name
          } : undefined
        }
      };

      // Perform initial risk assessment
      incident.riskAssessment = await this.performRiskAssessment(incident);

      // Store the incident
      await this.storeIncident(incident);

      // Log incident creation
      await this.auditLogService.logDataAccess({
        userId: report.userId || 'SYSTEM',
        action: 'SECURITY_INCIDENT_REPORTED',
        resourceType: 'SECURITY_INCIDENT',
        resourceId: incident.id,
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: {
          incidentType: incident.type,
          severity: incident.severity,
          affectedUsers: incident.affectedUsers?.length || 0
        }
      });

      // Trigger immediate response for critical incidents
      if (incident.severity === 'CRITICAL') {
        await this.triggerEmergencyResponse(incident);
      }

      // Send notifications if required
      if (incident.notificationRequired) {
        await this.sendIncidentNotification(incident);
      }

      console.log(`Security incident reported: ${incident.id} (${incident.type})`);
      return incident.id;
    } catch (error) {
      console.error('Failed to report security incident:', error);
      throw error;
    }
  }

  /**
   * Update incident status
   */
  public async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    notes?: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const previousStatus = incident.status;
      incident.status = status;

      // Set resolution date if incident is resolved
      if (status === 'RESOLVED' || status === 'CLOSED') {
        incident.resolvedDate = new Date();
      }

      // Update details
      if (notes) {
        incident.details = {
          ...incident.details,
          statusUpdates: [
            ...(incident.details?.statusUpdates || []),
            {
              previousStatus,
              newStatus: status,
              timestamp: new Date(),
              notes,
              updatedBy
            }
          ]
        };
      }

      await this.updateIncident(incident);

      // Log status update
      await this.auditLogService.logDataAccess({
        userId: updatedBy || 'SYSTEM',
        action: 'INCIDENT_STATUS_UPDATED',
        resourceType: 'SECURITY_INCIDENT',
        resourceId: incidentId,
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: {
          previousStatus,
          newStatus: status,
          notes
        }
      });

      console.log(`Incident ${incidentId} status updated: ${previousStatus} -> ${status}`);
    } catch (error) {
      console.error('Failed to update incident status:', error);
      throw error;
    }
  }

  /**
   * Add containment action to incident
   */
  public async addContainmentAction(
    incidentId: string,
    action: string,
    performedBy?: string
  ): Promise<void> {
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      incident.containmentActions = [
        ...(incident.containmentActions || []),
        action
      ];

      // Update status to contained if not already
      if (incident.status === 'DETECTED' || incident.status === 'INVESTIGATING') {
        incident.status = 'CONTAINED';
      }

      await this.updateIncident(incident);

      // Log containment action
      await this.auditLogService.logDataAccess({
        userId: performedBy || 'SYSTEM',
        action: 'INCIDENT_CONTAINMENT_ACTION',
        resourceType: 'SECURITY_INCIDENT',
        resourceId: incidentId,
        timestamp: new Date(),
        ipAddress: 'localhost',
        userAgent: 'SYSTEM',
        details: { action }
      });

      console.log(`Containment action added to incident ${incidentId}: ${action}`);
    } catch (error) {
      console.error('Failed to add containment action:', error);
      throw error;
    }
  }

  /**
   * Get incident by ID
   */
  public async getIncident(incidentId: string): Promise<SecurityIncident | null> {
    try {
      const stored = await this.secureStorage.getItem(`incident_${incidentId}`);
      if (!stored) return null;

      const incident = JSON.parse(stored);
      return {
        ...incident,
        detectedDate: new Date(incident.detectedDate),
        reportedDate: incident.reportedDate ? new Date(incident.reportedDate) : undefined,
        resolvedDate: incident.resolvedDate ? new Date(incident.resolvedDate) : undefined,
        notificationDate: incident.notificationDate ? new Date(incident.notificationDate) : undefined
      };
    } catch (error) {
      console.error('Failed to get incident:', error);
      return null;
    }
  }

  /**
   * Get all incidents with optional filtering
   */
  public async getIncidents(filter?: {
    type?: IncidentType;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SecurityIncident[]> {
    try {
      const allIncidentIds = await this.getAllIncidentIds();
      const incidents: SecurityIncident[] = [];

      for (const incidentId of allIncidentIds) {
        const incident = await this.getIncident(incidentId);
        if (incident) {
          incidents.push(incident);
        }
      }

      let filteredIncidents = incidents;

      // Apply filters
      if (filter?.type) {
        filteredIncidents = filteredIncidents.filter(i => i.type === filter.type);
      }
      if (filter?.severity) {
        filteredIncidents = filteredIncidents.filter(i => i.severity === filter.severity);
      }
      if (filter?.status) {
        filteredIncidents = filteredIncidents.filter(i => i.status === filter.status);
      }
      if (filter?.startDate) {
        filteredIncidents = filteredIncidents.filter(i => i.detectedDate >= filter.startDate!);
      }
      if (filter?.endDate) {
        filteredIncidents = filteredIncidents.filter(i => i.detectedDate <= filter.endDate!);
      }

      // Sort by detection date (newest first)
      filteredIncidents.sort((a, b) => b.detectedDate.getTime() - a.detectedDate.getTime());

      // Apply limit
      if (filter?.limit) {
        filteredIncidents = filteredIncidents.slice(0, filter.limit);
      }

      return filteredIncidents;
    } catch (error) {
      console.error('Failed to get incidents:', error);
      return [];
    }
  }

  /**
   * Get incident metrics
   */
  public async getIncidentMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<IncidentMetrics> {
    try {
      const incidents = await this.getIncidents({
        startDate,
        endDate
      });

      const incidentsByType: Record<IncidentType, number> = {} as any;
      const incidentsBySeverity: Record<IncidentSeverity, number> = {} as any;
      const incidentsByStatus: Record<IncidentStatus, number> = {} as any;

      let totalResolutionTime = 0;
      let resolvedIncidents = 0;
      let breachNotifications = 0;

      incidents.forEach(incident => {
        // Count by type
        incidentsByType[incident.type] = (incidentsByType[incident.type] || 0) + 1;
        
        // Count by severity
        incidentsBySeverity[incident.severity] = (incidentsBySeverity[incident.severity] || 0) + 1;
        
        // Count by status
        incidentsByStatus[incident.status] = (incidentsByStatus[incident.status] || 0) + 1;

        // Calculate resolution time
        if (incident.resolvedDate) {
          const resolutionTime = incident.resolvedDate.getTime() - incident.detectedDate.getTime();
          totalResolutionTime += resolutionTime;
          resolvedIncidents++;
        }

        // Count breach notifications
        if (incident.notificationSent) {
          breachNotifications++;
        }
      });

      const averageResolutionTime = resolvedIncidents > 0 
        ? totalResolutionTime / resolvedIncidents / (1000 * 60 * 60) // Convert to hours
        : 0;

      const openIncidents = incidents.filter(i => 
        !['RESOLVED', 'CLOSED', 'FALSE_POSITIVE'].includes(i.status)
      ).length;

      const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL').length;

      return {
        totalIncidents: incidents.length,
        incidentsByType,
        incidentsBySeverity,
        incidentsByStatus,
        averageResolutionTime,
        openIncidents,
        criticalIncidents,
        breachNotifications
      };
    } catch (error) {
      console.error('Failed to get incident metrics:', error);
      throw error;
    }
  }

  /**
   * Check if incident response system is ready
   */
  public async isResponseSystemReady(): Promise<boolean> {
    try {
      // Check if monitoring is active
      if (!this.monitoringActive) return false;

      // Check if we can create and retrieve incidents
      const testIncident: SecurityIncident = {
        id: 'test_incident',
        type: 'OTHER',
        severity: 'LOW',
        status: 'DETECTED',
        title: 'System Test',
        description: 'Testing incident response system',
        detectedDate: new Date(),
        detectionMethod: 'ROUTINE_CHECK',
        notificationRequired: false
      };

      await this.storeIncident(testIncident);
      const retrieved = await this.getIncident('test_incident');
      
      // Clean up test incident
      await this.secureStorage.removeItem('incident_test_incident');

      return retrieved !== null;
    } catch (error) {
      console.error('Incident response system check failed:', error);
      return false;
    }
  }

  /**
   * Perform risk assessment for incident
   */
  private async performRiskAssessment(incident: SecurityIncident): Promise<RiskAssessment> {
    // Simplified risk assessment logic
    let dataConfidentialityImpact: RiskAssessment['dataConfidentialityImpact'] = 'NONE';
    let dataIntegrityImpact: RiskAssessment['dataIntegrityImpact'] = 'NONE';
    let dataAvailabilityImpact: RiskAssessment['dataAvailabilityImpact'] = 'NONE';

    // Assess impact based on incident type
    switch (incident.type) {
      case 'DATA_BREACH':
      case 'UNAUTHORIZED_ACCESS':
        dataConfidentialityImpact = incident.severity === 'CRITICAL' ? 'HIGH' : 'MODERATE';
        break;
      case 'SYSTEM_COMPROMISE':
        dataIntegrityImpact = 'HIGH';
        dataAvailabilityImpact = 'MODERATE';
        break;
      case 'SYSTEM_FAILURE':
        dataAvailabilityImpact = 'HIGH';
        break;
      case 'DATA_LOSS':
        dataIntegrityImpact = 'HIGH';
        dataAvailabilityImpact = 'MODERATE';
        break;
    }

    // Determine overall risk level
    const impacts = [dataConfidentialityImpact, dataIntegrityImpact, dataAvailabilityImpact];
    let overallRiskLevel: RiskAssessment['overallRiskLevel'] = 'LOW';

    if (impacts.includes('HIGH')) {
      overallRiskLevel = 'CRITICAL';
    } else if (impacts.includes('MODERATE')) {
      overallRiskLevel = 'HIGH';
    } else if (impacts.includes('LOW')) {
      overallRiskLevel = 'MODERATE';
    }

    return {
      dataConfidentialityImpact,
      dataIntegrityImpact,
      dataAvailabilityImpact,
      overallRiskLevel,
      potentialDamage: this.assessPotentialDamage(incident),
      mitigatingFactors: this.identifyMitigatingFactors(incident)
    };
  }

  /**
   * Classify incident type from string
   */
  private classifyIncidentType(type: string): IncidentType {
    const typeMap: Record<string, IncidentType> = {
      'UNAUTHORIZED_ACCESS': 'UNAUTHORIZED_ACCESS',
      'DATA_BREACH': 'DATA_BREACH',
      'SYSTEM_COMPROMISE': 'SYSTEM_COMPROMISE',
      'MALWARE_DETECTION': 'MALWARE_DETECTION',
      'PHISHING_ATTEMPT': 'PHISHING_ATTEMPT',
      'INSIDER_THREAT': 'INSIDER_THREAT',
      'DATA_LOSS': 'DATA_LOSS',
      'COMPLIANCE_VIOLATION': 'COMPLIANCE_VIOLATION',
      'AUTHENTICATION_FAILURE': 'AUTHENTICATION_FAILURE',
      'SYSTEM_FAILURE': 'SYSTEM_FAILURE',
      'NETWORK_INTRUSION': 'NETWORK_INTRUSION'
    };

    return typeMap[type] || 'OTHER';
  }

  /**
   * Generate incident title
   */
  private generateIncidentTitle(type: string, severity: IncidentSeverity): string {
    return `${severity} ${type.replace(/_/g, ' ')} Incident`;
  }

  /**
   * Check if incident requires notification
   */
  private requiresNotification(severity: IncidentSeverity, type: string): boolean {
    // HIPAA requires notification for breaches affecting 500+ individuals
    // For this implementation, we'll require notification for HIGH and CRITICAL incidents
    return severity === 'HIGH' || severity === 'CRITICAL' || type === 'DATA_BREACH';
  }

  /**
   * Trigger emergency response for critical incidents
   */
  private async triggerEmergencyResponse(incident: SecurityIncident): Promise<void> {
    console.log(`EMERGENCY RESPONSE TRIGGERED for incident: ${incident.id}`);
    
    // In a real implementation, this would:
    // - Alert security team
    // - Initiate containment procedures
    // - Escalate to management
    // - Begin breach notification process if required
    
    await this.auditLogService.logSystemEvent('EMERGENCY_RESPONSE_TRIGGERED', {
      incidentId: incident.id,
      incidentType: incident.type,
      severity: incident.severity
    });
  }

  /**
   * Send incident notification
   */
  private async sendIncidentNotification(incident: SecurityIncident): Promise<void> {
    try {
      // In a real implementation, this would send notifications to:
      // - Security team
      // - Management
      // - Affected users (if required)
      // - Regulatory authorities (if required)
      
      incident.notificationSent = true;
      incident.notificationDate = new Date();
      
      await this.updateIncident(incident);
      
      console.log(`Incident notification sent for: ${incident.id}`);
    } catch (error) {
      console.error('Failed to send incident notification:', error);
    }
  }

  /**
   * Assess potential damage from incident
   */
  private assessPotentialDamage(incident: SecurityIncident): string {
    const affectedUserCount = incident.affectedUsers?.length || 0;
    
    if (affectedUserCount > 500) {
      return 'Large-scale data exposure affecting 500+ individuals - requires regulatory notification';
    } else if (affectedUserCount > 50) {
      return 'Moderate data exposure affecting 50+ individuals';
    } else if (affectedUserCount > 0) {
      return `Limited data exposure affecting ${affectedUserCount} individual(s)`;
    } else {
      return 'System-level incident with potential operational impact';
    }
  }

  /**
   * Identify mitigating factors
   */
  private identifyMitigatingFactors(incident: SecurityIncident): string[] {
    const factors: string[] = [];
    
    if (incident.detectionMethod === 'AUTOMATED_MONITORING') {
      factors.push('Rapid automated detection');
    }
    
    if (incident.severity === 'LOW') {
      factors.push('Low severity classification');
    }
    
    factors.push('Comprehensive audit logging in place');
    factors.push('Incident response procedures activated');
    
    return factors;
  }

  // Storage helper methods
  private async storeIncident(incident: SecurityIncident): Promise<void> {
    await this.secureStorage.setItem(`incident_${incident.id}`, JSON.stringify(incident));
    
    // Also maintain an index of incident IDs
    const existingIds = await this.getAllIncidentIds();
    const updatedIds = [...existingIds, incident.id];
    await this.secureStorage.setItem('incident_ids', JSON.stringify(updatedIds));
  }

  private async updateIncident(incident: SecurityIncident): Promise<void> {
    await this.secureStorage.setItem(`incident_${incident.id}`, JSON.stringify(incident));
  }

  private async getAllIncidentIds(): Promise<string[]> {
    try {
      const stored = await this.secureStorage.getItem('incident_ids');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get incident IDs:', error);
      return [];
    }
  }

  private generateIncidentId(): string {
    return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}