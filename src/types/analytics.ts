/**
 * Analytics and feedback related TypeScript interfaces
 * Based on design document requirements
 */

export type FeedbackCategory = 'bug' | 'suggestion' | 'content_quality' | 'feature_request';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface UserFeedback {
  id: string;
  userId: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  referenceNumber: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'in_review' | 'resolved' | 'closed';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
}

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  correlationId: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, any>;
}