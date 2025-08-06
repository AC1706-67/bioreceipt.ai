/**
 * Health Tip Types
 * Types related to health tips and user engagement
 */

export interface UserEngagement {
  id: string;
  userId: string;
  tipId: string;
  action: 'view' | 'like' | 'bookmark' | 'complete' | 'share' | 'rate' | 'skip';
  timestamp: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface HealthTipEngagement extends UserEngagement {
  // Additional properties specific to health tip engagement
  rating?: number;
  timeSpent?: number;
  completionPercentage?: number;
}

export type EngagementAction = UserEngagement['action'];

export interface EngagementMetrics {
  totalViews: number;
  totalLikes: number;
  totalBookmarks: number;
  totalCompletions: number;
  totalShares: number;
  averageRating: number;
  averageTimeSpent: number;
  completionRate: number;
}

export interface UserEngagementSummary {
  userId: string;
  totalEngagements: number;
  favoriteCategories: string[];
  averageSessionTime: number;
  streakDays: number;
  lastEngagement: Date;
}