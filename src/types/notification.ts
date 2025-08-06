/**
 * Notification related TypeScript interfaces
 * Based on design document requirements
 */

export type NotificationType = 
  | 'daily_tip' 
  | 'streak_reminder' 
  | 'milestone_celebration' 
  | 'encouragement' 
  | 'general';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  priority: NotificationPriority;
  scheduledTime?: Date;
  userId: string;
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  scheduledTime: Date;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  isActive: boolean;
  createdAt: Date;
  lastSent?: Date;
  nextSendTime?: Date;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  time: string; // HH:MM format
  timezone: string;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyTipTime: string; // HH:MM format
  streakReminders: boolean;
  milestoneNotifications: boolean;
  encouragementMessages: boolean;
  timezone: string;
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
}

export interface NotificationPermission {
  granted: boolean;
  requestedAt?: Date;
  deniedAt?: Date;
  lastChecked: Date;
}

export interface NotificationAnalytics {
  id: string;
  notificationId: string;
  userId: string;
  type: NotificationType;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  dismissed?: boolean;
  error?: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  body: string;
  variables?: string[]; // Variables that can be replaced in title/body
  priority: NotificationPriority;
  imageUrl?: string;
}

export interface MilestoneNotificationData {
  milestoneTitle: string;
  days: number;
  currentStreak: number;
  encouragementMessage: string;
}

export interface EncouragementNotificationData {
  daysMissed: number;
  lastStreak: number;
  motivationalMessage: string;
}

export interface DailyTipNotificationData {
  tipId: string;
  tipTitle: string;
  tipPreview: string;
  category: string;
  difficulty: string;
}