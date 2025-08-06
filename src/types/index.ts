/**
 * Main types export file
 * Exports all TypeScript interfaces and types
 */

// User types
export type { 
  AuthMethod, 
  Gender, 
  SkillLevel, 
  HealthInterest, 
  UserProfile, 
  AuthCredentials, 
  UserRegistration 
} from './user';
export type { HealthCategory as UserHealthCategory } from './user';
export type { NotificationSettings as UserNotificationSettings } from './user';

// Health tip types
export type { HealthTip, UserHealthTipInteraction as TipInteraction, HealthTipEngagement as UserEngagement } from '../models/HealthTip';
export type { DifficultyLevel as TipDifficulty } from '../models/HealthTip';

// User action type for interactions
export type UserAction = 'view' | 'like' | 'bookmark' | 'complete' | 'share' | 'rate' | 'skip';

// Progress tracking types
export * from './progress';

// Analytics types
export * from './analytics';

// Notification types
export * from './notification';

// Feedback types
export type { 
  FeedbackCategory as FeedbackFeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  UserFeedback as FeedbackUserFeedback
} from './feedback';

// API types
export * from './api';

// Validation constraints
export const USER_PROFILE_CONSTRAINTS = {
  name: { minLength: 2, maxLength: 50 },
  age: { min: 13, max: 120 },
  bio: { maxLength: 500 }
};

export const CHECK_IN_CONSTRAINTS = {
  mood: { min: 1, max: 10 },
  energy: { min: 1, max: 10 },
  notes: { maxLength: 1000 }
};

// Error handling types
export enum ErrorCategory {
  // Network and API errors
  NETWORK = 'network',
  API = 'api',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  
  // Data and storage errors
  DATA_VALIDATION = 'data_validation',
  STORAGE = 'storage',
  CACHE = 'cache',
  SYNC = 'sync',
  
  // User interface errors
  UI_COMPONENT = 'ui_component',
  NAVIGATION = 'navigation',
  RENDERING = 'rendering',
  
  // Business logic errors
  BUSINESS_LOGIC = 'business_logic',
  CONTENT = 'content',
  PERSONALIZATION = 'personalization',
  
  // System and performance errors
  PERFORMANCE = 'performance',
  MEMORY = 'memory',
  DEVICE = 'device',
  PERMISSION = 'permission',
  
  // External service errors
  AI_SERVICE = 'ai_service',
  ANALYTICS = 'analytics',
  NOTIFICATION = 'notification',
  
  // Unknown or uncategorized
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',           // Minor issues, app continues normally
  MEDIUM = 'medium',     // Noticeable issues, some features affected
  HIGH = 'high',         // Significant issues, major features affected
  CRITICAL = 'critical'  // App-breaking issues, immediate attention needed
}

export enum ErrorRecoveryStrategy {
  RETRY = 'retry',                    // Automatic retry with backoff
  FALLBACK = 'fallback',             // Use fallback data/functionality
  REFRESH = 'refresh',               // Refresh the current screen/data
  REDIRECT = 'redirect',             // Navigate to a different screen
  OFFLINE_MODE = 'offline_mode',     // Switch to offline functionality
  USER_ACTION = 'user_action',       // Require user intervention
  RESTART = 'restart',               // Suggest app restart
  NONE = 'none'                      // No automatic recovery
}

export interface ErrorContext {
  // User context
  userId?: string;
  userAgent?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
  
  // App context
  appVersion: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  
  // Session context
  sessionId?: string;
  correlationId?: string;
  timestamp: Date;
  
  // Navigation context
  currentScreen?: string;
  previousScreen?: string;
  navigationStack?: string[];
  
  // Feature context
  feature?: string;
  action?: string;
  component?: string;
  
  // Performance context
  memoryUsage?: number;
  networkStatus?: 'online' | 'offline' | 'slow';
  batteryLevel?: number;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

export interface EnhancedError extends Error {
  // Error identification
  errorId: string;
  errorCode: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  
  // Error details
  originalError?: Error;
  context: ErrorContext;
  
  // Recovery information
  recoveryStrategy: ErrorRecoveryStrategy;
  retryCount?: number;
  maxRetries?: number;
  
  // User experience
  userMessage: string;
  actionableMessage?: string;
  recoveryActions?: ErrorRecoveryAction[];
  
  // Tracking
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
  reportedToUser?: boolean;
  reportedToAnalytics?: boolean;
}

export interface ErrorRecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  primary?: boolean;
  destructive?: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number; // errors per session
  criticalErrorRate: number;
  recoverySuccessRate: number;
  averageResolutionTime: number;
  topErrorCategories: CategoryMetric[];
  topErrorCodes: CodeMetric[];
  errorTrends: TrendData[];
  userImpactScore: number;
}

export interface CategoryMetric {
  category: ErrorCategory;
  count: number;
  percentage: number;
  averageSeverity: number;
  recoveryRate: number;
}

export interface CodeMetric {
  code: string;
  count: number;
  percentage: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  lastOccurrence: Date;
}

export interface TrendData {
  date: Date;
  errorCount: number;
  criticalCount: number;
  recoveredCount: number;
  categories: Record<ErrorCategory, number>;
}

export interface ErrorPattern {
  id: string;
  pattern: string;
  description: string;
  frequency: number;
  severity: ErrorSeverity;
  affectedUsers: number;
  firstSeen: Date;
  lastSeen: Date;
  suggestedActions: string[];
}

export interface UserErrorProfile {
  userId: string;
  totalErrors: number;
  errorFrequency: number; // errors per day
  mostCommonCategory: ErrorCategory;
  mostCommonSeverity: ErrorSeverity;
  recoverySuccessRate: number;
  lastErrorDate: Date;
  errorHistory: ErrorHistoryEntry[];
}

export interface ErrorHistoryEntry {
  date: Date;
  errorCode: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  resolved: boolean;
  resolutionTime?: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  minPatternFrequency: number;
  trendAnalysisDays: number;
  userProfileEnabled: boolean;
  realTimeAlertsEnabled: boolean;
}