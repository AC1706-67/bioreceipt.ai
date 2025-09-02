/**
 * Conflict Resolution Service
 * Handles data conflicts between offline and online states
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuditLogService } from '../compliance/auditLogService';

// Conflict Types
export type ConflictType = 'data_mismatch' | 'version_conflict' | 'deletion_conflict' | 'creation_conflict';

// Conflict Resolution Strategy
export type ResolutionStrategy = 'client_wins' | 'server_wins' | 'merge' | 'manual' | 'timestamp_based';

// Data Conflict Interface
export interface DataConflict<T = any> {
  id: string;
  resourceType: string;
  resourceId: string;
  conflictType: ConflictType;
  clientData: T;
  serverData: T;
  clientTimestamp: Date;
  serverTimestamp: Date;
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: {
    strategy: ResolutionStrategy;
    resolvedData: T;
    resolvedBy: 'system' | 'user';
    reason: string;
  };
  metadata?: {
    userId?: string;
    conflictScore: number; // 0-1, how severe the conflict is
    affectedFields: string[];
    canAutoResolve: boolean;
  };
}

// Resolution Rule Interface
export interface ResolutionRule {
  resourceType: string;
  conflictType: ConflictType;
  strategy: ResolutionStrategy;
  priority: number;
  conditions?: {
    fieldPatterns?: string[];
    userRoles?: string[];
    dataAge?: number; // milliseconds
  };
  customResolver?: (conflict: DataConflict) => Promise<any>;
}

export class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private auditLogService: AuditLogService;
  private conflicts: Map<string, DataConflict> = new Map();
  private resolutionRules: ResolutionRule[] = [];
  private listeners: Set<(conflict: DataConflict) => void> = new Set();

  private constructor() {
    this.auditLogService = AuditLogService.getInstance();
    this.initializeDefaultRules();
  }

  public static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  /**
   * Initialize service
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadConflicts();
      await this.loadResolutionRules();
      
      console.log('Conflict resolution service initialized');
    } catch (error) {
      console.error('Failed to initialize conflict resolution service:', error);
      throw error;
    }
  }  /**

   * Detect conflicts between client and server data
   */
  public async detectConflict<T>(
    resourceType: string,
    resourceId: string,
    clientData: T,
    serverData: T,
    userId?: string
  ): Promise<DataConflict<T> | null> {
    try {
      // Skip if data is identical
      if (JSON.stringify(clientData) === JSON.stringify(serverData)) {
        return null;
      }

      const conflictType = this.determineConflictType(clientData, serverData);
      const conflictScore = this.calculateConflictScore(clientData, serverData);
      const affectedFields = this.getAffectedFields(clientData, serverData);

      const conflict: DataConflict<T> = {
        id: this.generateConflictId(),
        resourceType,
        resourceId,
        conflictType,
        clientData,
        serverData,
        clientTimestamp: this.extractTimestamp(clientData) || new Date(),
        serverTimestamp: this.extractTimestamp(serverData) || new Date(),
        detectedAt: new Date(),
        resolved: false,
        metadata: {
          userId,
          conflictScore,
          affectedFields,
          canAutoResolve: conflictScore < 0.5 && affectedFields.length < 3
        }
      };

      // Store conflict
      this.conflicts.set(conflict.id, conflict);
      await this.saveConflicts();

      // Notify listeners
      this.notifyListeners(conflict);

      // Log conflict detection
      await this.auditLogService.logDataAccess({
        userId: userId || 'system',
        action: 'CONFLICT_DETECTED',
        resourceType: 'DATA_CONFLICT',
        resourceId: conflict.id,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          conflictType,
          resourceType,
          resourceId,
          conflictScore,
          affectedFields: affectedFields.length,
          canAutoResolve: conflict.metadata?.canAutoResolve
        }
      });

      return conflict;
    } catch (error) {
      console.error('Failed to detect conflict:', error);
      throw error;
    }
  }

  /**
   * Resolve conflict using appropriate strategy
   */
  public async resolveConflict<T>(
    conflictId: string,
    strategy?: ResolutionStrategy,
    customData?: T
  ): Promise<T> {
    try {
      const conflict = this.conflicts.get(conflictId);
      if (!conflict) {
        throw new Error(`Conflict ${conflictId} not found`);
      }

      if (conflict.resolved) {
        return conflict.resolution!.resolvedData;
      }

      // Determine resolution strategy
      const resolutionStrategy = strategy || this.getResolutionStrategy(conflict);
      
      // Resolve based on strategy
      let resolvedData: T;
      let resolvedBy: 'system' | 'user' = 'system';
      let reason: string;

      switch (resolutionStrategy) {
        case 'client_wins':
          resolvedData = conflict.clientData;
          reason = 'Client data takes precedence';
          break;

        case 'server_wins':
          resolvedData = conflict.serverData;
          reason = 'Server data takes precedence';
          break;

        case 'timestamp_based':
          if (conflict.clientTimestamp > conflict.serverTimestamp) {
            resolvedData = conflict.clientData;
            reason = 'Client data is newer';
          } else {
            resolvedData = conflict.serverData;
            reason = 'Server data is newer';
          }
          break;

        case 'merge':
          resolvedData = await this.mergeData(conflict.clientData, conflict.serverData);
          reason = 'Data merged automatically';
          break;

        case 'manual':
          if (!customData) {
            throw new Error('Manual resolution requires custom data');
          }
          resolvedData = customData;
          resolvedBy = 'user';
          reason = 'Manually resolved by user';
          break;

        default:
          throw new Error(`Unknown resolution strategy: ${resolutionStrategy}`);
      }

      // Update conflict with resolution
      conflict.resolved = true;
      conflict.resolvedAt = new Date();
      conflict.resolution = {
        strategy: resolutionStrategy,
        resolvedData,
        resolvedBy,
        reason
      };

      // Save updated conflict
      this.conflicts.set(conflictId, conflict);
      await this.saveConflicts();

      // Log resolution
      await this.auditLogService.logDataAccess({
        userId: conflict.metadata?.userId || 'system',
        action: 'CONFLICT_RESOLVED',
        resourceType: 'DATA_CONFLICT',
        resourceId: conflictId,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          strategy: resolutionStrategy,
          resolvedBy,
          reason,
          conflictType: conflict.conflictType,
          resourceType: conflict.resourceType
        }
      });

      return resolvedData;
    } catch (error) {
      console.error(`Failed to resolve conflict ${conflictId}:`, error);
      throw error;
    }
  }

  /**
   * Get all unresolved conflicts
   */
  public getUnresolvedConflicts(): DataConflict[] {
    return Array.from(this.conflicts.values()).filter(conflict => !conflict.resolved);
  }

  /**
   * Get conflicts by resource type
   */
  public getConflictsByResourceType(resourceType: string): DataConflict[] {
    return Array.from(this.conflicts.values()).filter(
      conflict => conflict.resourceType === resourceType
    );
  }

  /**
   * Add conflict listener
   */
  public addConflictListener(listener: (conflict: DataConflict) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Add custom resolution rule
   */
  public addResolutionRule(rule: ResolutionRule): void {
    this.resolutionRules.push(rule);
    this.resolutionRules.sort((a, b) => b.priority - a.priority);
  }

  // Private helper methods

  private initializeDefaultRules(): void {
    // Default rules for common scenarios
    this.resolutionRules = [
      {
        resourceType: 'user_profile',
        conflictType: 'data_mismatch',
        strategy: 'timestamp_based',
        priority: 100
      },
      {
        resourceType: 'health_tip',
        conflictType: 'data_mismatch',
        strategy: 'server_wins',
        priority: 90
      },
      {
        resourceType: 'user_progress',
        conflictType: 'data_mismatch',
        strategy: 'merge',
        priority: 80
      },
      {
        resourceType: '*',
        conflictType: 'deletion_conflict',
        strategy: 'manual',
        priority: 70
      },
      {
        resourceType: '*',
        conflictType: 'creation_conflict',
        strategy: 'client_wins',
        priority: 60
      }
    ];
  }

  private determineConflictType<T>(clientData: T, serverData: T): ConflictType {
    if (clientData === null && serverData !== null) {
      return 'deletion_conflict';
    }
    if (clientData !== null && serverData === null) {
      return 'creation_conflict';
    }
    
    // Check for version conflicts
    const clientVersion = this.extractVersion(clientData);
    const serverVersion = this.extractVersion(serverData);
    
    if (clientVersion && serverVersion && clientVersion !== serverVersion) {
      return 'version_conflict';
    }
    
    return 'data_mismatch';
  }

  private calculateConflictScore<T>(clientData: T, serverData: T): number {
    try {
      const clientStr = JSON.stringify(clientData);
      const serverStr = JSON.stringify(serverData);
      
      // Simple similarity calculation
      const maxLength = Math.max(clientStr.length, serverStr.length);
      const minLength = Math.min(clientStr.length, serverStr.length);
      
      let differences = Math.abs(clientStr.length - serverStr.length);
      
      // Count character differences
      for (let i = 0; i < minLength; i++) {
        if (clientStr[i] !== serverStr[i]) {
          differences++;
        }
      }
      
      return Math.min(differences / maxLength, 1.0);
    } catch (error) {
      return 1.0; // Maximum conflict if comparison fails
    }
  }

  private getAffectedFields<T>(clientData: T, serverData: T): string[] {
    const affectedFields: string[] = [];
    
    try {
      const clientObj = clientData as Record<string, any>;
      const serverObj = serverData as Record<string, any>;
      
      const allKeys = new Set([
        ...Object.keys(clientObj || {}),
        ...Object.keys(serverObj || {})
      ]);
      
      for (const key of allKeys) {
        if (JSON.stringify(clientObj?.[key]) !== JSON.stringify(serverObj?.[key])) {
          affectedFields.push(key);
        }
      }
    } catch (error) {
      // If comparison fails, assume all fields are affected
      affectedFields.push('*');
    }
    
    return affectedFields;
  }

  private getResolutionStrategy(conflict: DataConflict): ResolutionStrategy {
    // Find matching rule
    for (const rule of this.resolutionRules) {
      if (this.ruleMatches(rule, conflict)) {
        return rule.strategy;
      }
    }
    
    // Default strategy
    return 'timestamp_based';
  }

  private ruleMatches(rule: ResolutionRule, conflict: DataConflict): boolean {
    // Check resource type
    if (rule.resourceType !== '*' && rule.resourceType !== conflict.resourceType) {
      return false;
    }
    
    // Check conflict type
    if (rule.conflictType !== conflict.conflictType) {
      return false;
    }
    
    // Check conditions if present
    if (rule.conditions) {
      // Check field patterns
      if (rule.conditions.fieldPatterns) {
        const hasMatchingField = rule.conditions.fieldPatterns.some(pattern =>
          conflict.metadata?.affectedFields.some(field => 
            field.match(new RegExp(pattern))
          )
        );
        if (!hasMatchingField) return false;
      }
      
      // Check data age
      if (rule.conditions.dataAge) {
        const dataAge = Date.now() - conflict.clientTimestamp.getTime();
        if (dataAge > rule.conditions.dataAge) return false;
      }
    }
    
    return true;
  }

  private async mergeData<T>(clientData: T, serverData: T): Promise<T> {
    try {
      // Simple merge strategy - server data takes precedence for conflicts
      const merged = { ...clientData, ...serverData };
      
      // Handle timestamps specially - use the latest
      const clientTimestamp = this.extractTimestamp(clientData);
      const serverTimestamp = this.extractTimestamp(serverData);
      
      if (clientTimestamp && serverTimestamp) {
        (merged as any).updatedAt = clientTimestamp > serverTimestamp ? clientTimestamp : serverTimestamp;
      }
      
      return merged;
    } catch (error) {
      console.error('Failed to merge data:', error);
      // Fallback to server data
      return serverData;
    }
  }

  private extractTimestamp<T>(data: T): Date | null {
    try {
      const obj = data as Record<string, any>;
      const timestampFields = ['updatedAt', 'modifiedAt', 'timestamp', 'lastModified'];
      
      for (const field of timestampFields) {
        if (obj?.[field]) {
          return new Date(obj[field]);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractVersion<T>(data: T): string | number | null {
    try {
      const obj = data as Record<string, any>;
      return obj?.version || obj?.v || obj?._version || null;
    } catch (error) {
      return null;
    }
  }

  private notifyListeners(conflict: DataConflict): void {
    this.listeners.forEach(listener => {
      try {
        listener(conflict);
      } catch (error) {
        console.error('Conflict listener error:', error);
      }
    });
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async loadConflicts(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('data_conflicts');
      if (stored) {
        const conflicts = JSON.parse(stored);
        this.conflicts.clear();
        
        for (const conflict of conflicts) {
          this.conflicts.set(conflict.id, {
            ...conflict,
            clientTimestamp: new Date(conflict.clientTimestamp),
            serverTimestamp: new Date(conflict.serverTimestamp),
            detectedAt: new Date(conflict.detectedAt),
            resolvedAt: conflict.resolvedAt ? new Date(conflict.resolvedAt) : undefined
          });
        }
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  }

  private async saveConflicts(): Promise<void> {
    try {
      const conflicts = Array.from(this.conflicts.values());
      await AsyncStorage.setItem('data_conflicts', JSON.stringify(conflicts));
    } catch (error) {
      console.error('Failed to save conflicts:', error);
    }
  }

  private async loadResolutionRules(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('resolution_rules');
      if (stored) {
        const customRules = JSON.parse(stored);
        this.resolutionRules.push(...customRules);
        this.resolutionRules.sort((a, b) => b.priority - a.priority);
      }
    } catch (error) {
      console.error('Failed to load resolution rules:', error);
    }
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  public async cleanupResolvedConflicts(olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      let cleanedCount = 0;
      
      for (const [id, conflict] of this.conflicts.entries()) {
        if (conflict.resolved && conflict.resolvedAt && conflict.resolvedAt < cutoffDate) {
          this.conflicts.delete(id);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        await this.saveConflicts();
        console.log(`Cleaned up ${cleanedCount} resolved conflicts`);
      }
    } catch (error) {
      console.error('Failed to cleanup resolved conflicts:', error);
    }
  }

  /**
   * Get conflict statistics
   */
  public getConflictStatistics(): {
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<ConflictType, number>;
    byStrategy: Record<ResolutionStrategy, number>;
  } {
    const conflicts = Array.from(this.conflicts.values());
    
    const stats = {
      total: conflicts.length,
      resolved: conflicts.filter(c => c.resolved).length,
      unresolved: conflicts.filter(c => !c.resolved).length,
      byType: {} as Record<ConflictType, number>,
      byStrategy: {} as Record<ResolutionStrategy, number>
    };
    
    // Count by type
    for (const conflict of conflicts) {
      stats.byType[conflict.conflictType] = (stats.byType[conflict.conflictType] || 0) + 1;
      
      if (conflict.resolution) {
        stats.byStrategy[conflict.resolution.strategy] = 
          (stats.byStrategy[conflict.resolution.strategy] || 0) + 1;
      }
    }
    
    return stats;
  }
}