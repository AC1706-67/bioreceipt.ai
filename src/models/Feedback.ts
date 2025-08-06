/**
 * Feedback Data Models
 * Comprehensive models for user feedback and support system
 */

export enum FeedbackCategory {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  CONTENT_QUALITY = 'content_quality',
  USABILITY = 'usability',
  PERFORMANCE = 'performance',
  ACCESSIBILITY = 'accessibility',
  GENERAL = 'general'
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FeedbackStatus {
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected'
}

export interface DeviceInfo {
  platform: string;
  osVersion: string;
  deviceModel: string;
  appVersion: string;
  buildNumber: string;
}

export interface UserFeedback {
  id: string;
  referenceNumber: string;
  userId: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  userEmail?: string;
  deviceInfo: DeviceInfo;
  appVersion: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  attachments?: FeedbackAttachment[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  adminResponse?: string;
  adminUserId?: string;
  internalNotes?: string[];
  relatedFeedbackIds?: string[];
  upvotes?: number;
  isPublic?: boolean;
}

export interface FeedbackAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  localPath?: string;
  uploadedAt: Date;
}

export interface FeedbackFormData {
  category: FeedbackCategory;
  title: string;
  description: string;
  userEmail?: string;
  attachments?: File[];
  isPublic?: boolean;
}

export interface FeedbackFilter {
  category?: FeedbackCategory;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  tags?: string[];
}

export interface FeedbackStats {
  totalSubmissions: number;
  byCategory: Record<FeedbackCategory, number>;
  byStatus: Record<FeedbackStatus, number>;
  byPriority: Record<FeedbackPriority, number>;
  averageResolutionTime: number; // in hours
  resolutionRate: number; // percentage
  userSatisfactionScore?: number;
  trendingIssues: Array<{
    category: FeedbackCategory;
    count: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
}

export interface SupportTicket extends UserFeedback {
  conversationHistory: SupportMessage[];
  assignedTo?: string;
  escalationLevel: number;
  lastResponseAt?: Date;
  customerSatisfactionRating?: number;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'admin' | 'system';
  message: string;
  attachments?: FeedbackAttachment[];
  timestamp: Date;
  isRead: boolean;
}

export interface FeedbackTemplate {
  id: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  suggestedQuestions: string[];
  requiredFields: string[];
  isActive: boolean;
}

// Validation schemas
export const FeedbackValidationSchema = {
  title: {
    required: true,
    minLength: 5,
    maxLength: 200
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  category: {
    required: true,
    enum: Object.values(FeedbackCategory)
  },
  userEmail: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};

export class FeedbackValidator {
  static validate(feedback: Partial<FeedbackFormData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate title
    if (!feedback.title || feedback.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters long');
    }
    if (feedback.title && feedback.title.length > 200) {
      errors.push('Title must not exceed 200 characters');
    }

    // Validate description
    if (!feedback.description || feedback.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }
    if (feedback.description && feedback.description.length > 2000) {
      errors.push('Description must not exceed 2000 characters');
    }

    // Validate category
    if (!feedback.category || !Object.values(FeedbackCategory).includes(feedback.category)) {
      errors.push('Please select a valid feedback category');
    }

    // Validate email if provided
    if (feedback.userEmail && !FeedbackValidationSchema.userEmail.pattern.test(feedback.userEmail)) {
      errors.push('Please enter a valid email address');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeInput(input: string): string {
    // Basic sanitization - remove potentially harmful content
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}

export interface FeedbackAnalytics {
  submissionTrends: Array<{
    date: string;
    count: number;
    category: FeedbackCategory;
  }>;
  resolutionMetrics: {
    averageResolutionTime: number;
    resolutionRate: number;
    firstResponseTime: number;
  };
  userSatisfaction: {
    averageRating: number;
    responseRate: number;
    npsScore?: number;
  };
  commonIssues: Array<{
    issue: string;
    frequency: number;
    category: FeedbackCategory;
    suggestedSolution?: string;
  }>;
}