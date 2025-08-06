/**
 * Feedback system TypeScript interfaces
 * Enhanced feedback and support system types
 */

export type FeedbackCategory = 'bug' | 'feature_request' | 'content_quality' | 'general_question';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackStatus = 'submitted' | 'in_review' | 'resolved' | 'closed';

export interface UserFeedback {
  id: string;
  userId: string;
  referenceNumber: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  deviceInfo?: DeviceInfo;
  appVersion?: string;
  attachments?: string[]; // URLs or file paths
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  adminResponse?: string;
  adminNotes?: string;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  osVersion: string;
  deviceModel?: string;
  appVersion: string;
  buildNumber?: string;
}

export interface FeedbackSubmission {
  category: FeedbackCategory;
  title: string;
  description: string;
  attachments?: string[];
}

export interface FeedbackStats {
  totalSubmissions: number;
  byCategory: Record<FeedbackCategory, number>;
  byStatus: Record<FeedbackStatus, number>;
  byPriority: Record<FeedbackPriority, number>;
  averageResponseTime: number; // in hours
  resolutionRate: number; // percentage
}

export interface FeedbackFilter {
  category?: FeedbackCategory;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export interface FeedbackTemplate {
  category: FeedbackCategory;
  title: string;
  placeholder: string;
  suggestedQuestions: string[];
  priority: FeedbackPriority;
}

export interface FeedbackResponse {
  success: boolean;
  feedback?: UserFeedback;
  referenceNumber?: string;
  estimatedResponseTime?: string;
  error?: string;
}