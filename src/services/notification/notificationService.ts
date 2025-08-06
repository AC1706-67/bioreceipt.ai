/**
 * Notification Service
 * Handles push notifications, scheduling, and user preferences
 */

import { 
  NotificationPayload, 
  ScheduledNotification, 
  NotificationSettings, 
  NotificationPermission,
  NotificationType,
  NotificationTemplate,
  MilestoneNotificationData,
  EncouragementNotificationData,
  DailyTipNotificationData,
  RecurringPattern
} from '../../types/notification';
import { UserProfile, HealthTip, StreakMilestone } from '../../types';
import { storeData, getData } from '../../utils/storage';
import { ProgressService } from '../progress/progressService';
import { ContentService } from '../content/contentService';

// Mock push notification library - in real app would use @react-native-firebase/messaging or similar
interface PushNotificationLibrary {
  requestPermission(): Promise<boolean>;
  scheduleNotification(payload: NotificationPayload, scheduledTime?: Date): Promise<string>;
  cancelNotification(notificationId: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;
  onNotificationReceived(callback: (notification: any) => void): void;
  onNotificationOpened(callback: (notification: any) => void): void;
}

// Mock implementation
const mockPushLibrary: PushNotificationLibrary = {
  async requestPermission(): Promise<boolean> {
    console.log('Mock: Requesting notification permission');
    return true;
  },
  async scheduleNotification(payload: NotificationPayload, scheduledTime?: Date): Promise<string> {
    console.log('Mock: Scheduling notification', { payload, scheduledTime });
    return `mock_notification_${Date.now()}`;
  },
  async cancelNotification(notificationId: string): Promise<void> {
    console.log('Mock: Cancelling notification', notificationId);
  },
  async cancelAllNotifications(): Promise<void> {
    console.log('Mock: Cancelling all notifications');
  },
  onNotificationReceived(callback: (notification: any) => void): void {
    console.log('Mock: Setting up notification received listener');
  },
  onNotificationOpened(callback: (notification: any) => void): void {
    console.log('Mock: Setting up notification opened listener');
  },
};

/**
 * Notification Service Class
 */
export class NotificationService {
  private static instance: NotificationService;
  private pushLibrary: PushNotificationLibrary;
  private progressService: ProgressService;
  private contentService: ContentService;

  // Notification templates
  private readonly templates: Record<NotificationType, NotificationTemplate> = {
    daily_tip: {
      type: 'daily_tip',
      title: '🌟 Your Daily Health Tip',
      body: 'Ready for today\'s wellness tip? {{tipTitle}}',
      variables: ['tipTitle', 'tipPreview'],
      priority: 'normal',
    },
    streak_reminder: {
      type: 'streak_reminder',
      title: '🔥 Keep Your Streak Going!',
      body: 'You\'re on a {{currentStreak}}-day streak! Don\'t break it now.',
      variables: ['currentStreak'],
      priority: 'normal',
    },
    milestone_celebration: {
      type: 'milestone_celebration',
      title: '🎉 Milestone Achieved!',
      body: 'Congratulations! You\'ve reached {{milestoneTitle}} - {{days}} days strong!',
      variables: ['milestoneTitle', 'days'],
      priority: 'high',
    },
    encouragement: {
      type: 'encouragement',
      title: '💪 We Miss You!',
      body: 'It\'s been {{daysMissed}} days. Ready to restart your wellness journey?',
      variables: ['daysMissed', 'motivationalMessage'],
      priority: 'normal',
    },
    general: {
      type: 'general',
      title: 'Healthy Tip App',
      body: 'Check out what\'s new in your wellness journey!',
      variables: [],
      priority: 'normal',
    },
  };

  private constructor() {
    this.pushLibrary = mockPushLibrary;
    this.progressService = ProgressService.getInstance();
    this.contentService = ContentService.getInstance();
    this.setupNotificationHandlers();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service and request permissions
   */
  public async initialize(): Promise<boolean> {
    try {
      const permission = await this.requestPermission();
      if (permission.granted) {
        await this.setupDefaultNotifications();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  /**
   * Request notification permissions from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    try {
      const existingPermission = await this.getNotificationPermission();
      
      if (existingPermission?.granted) {
        return existingPermission;
      }

      const granted = await this.pushLibrary.requestPermission();
      
      const permission: NotificationPermission = {
        granted,
        requestedAt: new Date(),
        deniedAt: granted ? undefined : new Date(),
        lastChecked: new Date(),
      };

      await storeData('NOTIFICATION_PERMISSION', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      const permission: NotificationPermission = {
        granted: false,
        deniedAt: new Date(),
        lastChecked: new Date(),
      };
      await storeData('NOTIFICATION_PERMISSION', permission);
      return permission;
    }
  }

  /**
   * Get current notification permission status
   */
  public async getNotificationPermission(): Promise<NotificationPermission | null> {
    try {
      return await getData<NotificationPermission>('NOTIFICATION_PERMISSION');
    } catch (error) {
      console.error('Error getting notification permission:', error);
      return null;
    }
  }

  /**
   * Get user's notification settings
   */
  public async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const settings = await getData<NotificationSettings>(`NOTIFICATION_SETTINGS_${userId}`);
      
      if (settings) {
        return settings;
      }

      // Return default settings
      const defaultSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
        },
      };

      await this.updateNotificationSettings(userId, defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw new Error('Failed to get notification settings');
    }
  }

  /**
   * Update user's notification settings
   */
  public async updateNotificationSettings(
    userId: string, 
    settings: NotificationSettings
  ): Promise<void> {
    try {
      await storeData(`NOTIFICATION_SETTINGS_${userId}`, settings);
      
      // Reschedule notifications based on new settings
      await this.rescheduleUserNotifications(userId);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw new Error('Failed to update notification settings');
    }
  }

  /**
   * Schedule daily tip notification
   */
  public async scheduleDailyTipNotification(
    userId: string,
    tip: HealthTip
  ): Promise<string> {
    try {
      const settings = await this.getNotificationSettings(userId);
      
      if (!settings.enabled) {
        return '';
      }

      const data: DailyTipNotificationData = {
        tipId: tip.id,
        tipTitle: tip.title,
        tipPreview: tip.content.substring(0, 100) + '...',
        category: tip.category,
        difficulty: tip.difficulty,
      };

      const payload: NotificationPayload = {
        id: `daily_tip_${userId}_${Date.now()}`,
        type: 'daily_tip',
        title: this.templates.daily_tip.title,
        body: this.replaceVariables(this.templates.daily_tip.body, {
          tipTitle: tip.title,
          tipPreview: data.tipPreview,
        }),
        data,
        priority: 'normal',
        userId,
        actionUrl: `app://tip/${tip.id}`,
      };

      const scheduledTime = this.getNextScheduledTime(settings.dailyTipTime, settings.timezone);
      const notificationId = await this.pushLibrary.scheduleNotification(payload, scheduledTime);

      // Store scheduled notification
      await this.storeScheduledNotification({
        id: payload.id,
        userId,
        type: 'daily_tip',
        payload,
        scheduledTime,
        isRecurring: true,
        recurringPattern: {
          frequency: 'daily',
          time: settings.dailyTipTime,
          timezone: settings.timezone,
        },
        isActive: true,
        createdAt: new Date(),
        nextSendTime: scheduledTime,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling daily tip notification:', error);
      throw new Error('Failed to schedule daily tip notification');
    }
  }

  /**
   * Send milestone celebration notification
   */
  public async sendMilestoneNotification(
    userId: string,
    milestone: StreakMilestone,
    currentStreak: number
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings(userId);
      
      if (!settings.enabled || !settings.milestoneNotifications) {
        return;
      }

      const data: MilestoneNotificationData = {
        milestoneTitle: milestone.title,
        days: milestone.days,
        currentStreak,
        encouragementMessage: milestone.description,
      };

      const payload: NotificationPayload = {
        id: `milestone_${userId}_${milestone.days}_${Date.now()}`,
        type: 'milestone_celebration',
        title: this.templates.milestone_celebration.title,
        body: this.replaceVariables(this.templates.milestone_celebration.body, {
          milestoneTitle: milestone.title,
          days: milestone.days.toString(),
        }),
        data,
        priority: 'high',
        userId,
        actionUrl: 'app://progress',
      };

      await this.pushLibrary.scheduleNotification(payload);
      await this.recordNotificationSent(payload);
    } catch (error) {
      console.error('Error sending milestone notification:', error);
    }
  }

  /**
   * Send encouragement notification for inactive users
   */
  public async sendEncouragementNotification(
    userId: string,
    daysMissed: number,
    lastStreak: number
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings(userId);
      
      if (!settings.enabled || !settings.encouragementMessages) {
        return;
      }

      const motivationalMessages = [
        'Every expert was once a beginner. Start again today!',
        'Your wellness journey is waiting for you.',
        'Small steps lead to big changes. Ready to take one?',
        'Your future self will thank you for starting today.',
        'Progress, not perfection. Let\'s get back on track!',
      ];

      const motivationalMessage = motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];

      const data: EncouragementNotificationData = {
        daysMissed,
        lastStreak,
        motivationalMessage,
      };

      const payload: NotificationPayload = {
        id: `encouragement_${userId}_${Date.now()}`,
        type: 'encouragement',
        title: this.templates.encouragement.title,
        body: this.replaceVariables(this.templates.encouragement.body, {
          daysMissed: daysMissed.toString(),
          motivationalMessage,
        }),
        data,
        priority: 'normal',
        userId,
        actionUrl: 'app://tips',
      };

      await this.pushLibrary.scheduleNotification(payload);
      await this.recordNotificationSent(payload);
    } catch (error) {
      console.error('Error sending encouragement notification:', error);
    }
  }

  /**
   * Send streak reminder notification
   */
  public async sendStreakReminderNotification(
    userId: string,
    currentStreak: number
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings(userId);
      
      if (!settings.enabled || !settings.streakReminders) {
        return;
      }

      const payload: NotificationPayload = {
        id: `streak_reminder_${userId}_${Date.now()}`,
        type: 'streak_reminder',
        title: this.templates.streak_reminder.title,
        body: this.replaceVariables(this.templates.streak_reminder.body, {
          currentStreak: currentStreak.toString(),
        }),
        data: { currentStreak },
        priority: 'normal',
        userId,
        actionUrl: 'app://tips',
      };

      // Schedule for evening if user hasn't engaged today
      const scheduledTime = new Date();
      scheduledTime.setHours(20, 0, 0, 0); // 8 PM

      await this.pushLibrary.scheduleNotification(payload, scheduledTime);
      await this.recordNotificationSent(payload);
    } catch (error) {
      console.error('Error sending streak reminder notification:', error);
    }
  }

  /**
   * Check and send notifications for inactive users
   */
  public async checkInactiveUsers(): Promise<void> {
    try {
      // This would typically iterate through all users
      // For now, we'll implement the logic for a single user
      console.log('Checking for inactive users...');
      
      // In a real implementation, this would:
      // 1. Query all users from database
      // 2. Check their last activity
      // 3. Send encouragement notifications as needed
    } catch (error) {
      console.error('Error checking inactive users:', error);
    }
  }

  /**
   * Cancel all notifications for a user
   */
  public async cancelUserNotifications(userId: string): Promise<void> {
    try {
      const scheduledNotifications = await this.getScheduledNotifications(userId);
      
      for (const notification of scheduledNotifications) {
        await this.pushLibrary.cancelNotification(notification.id);
      }

      // Clear stored notifications
      await storeData(`SCHEDULED_NOTIFICATIONS_${userId}`, []);
    } catch (error) {
      console.error('Error cancelling user notifications:', error);
      throw new Error('Failed to cancel notifications');
    }
  }

  /**
   * Get scheduled notifications for a user
   */
  public async getScheduledNotifications(userId: string): Promise<ScheduledNotification[]> {
    try {
      const notifications = await getData<ScheduledNotification[]>(`SCHEDULED_NOTIFICATIONS_${userId}`);
      return notifications || [];
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Private helper methods

  private setupNotificationHandlers(): void {
    this.pushLibrary.onNotificationReceived((notification) => {
      console.log('Notification received:', notification);
      // Handle notification received while app is in foreground
    });

    this.pushLibrary.onNotificationOpened((notification) => {
      console.log('Notification opened:', notification);
      // Handle notification tap - navigate to appropriate screen
      this.handleNotificationTap(notification);
    });
  }

  private async setupDefaultNotifications(): Promise<void> {
    try {
      // Set up any default recurring notifications
      console.log('Setting up default notifications');
    } catch (error) {
      console.error('Error setting up default notifications:', error);
    }
  }

  private async rescheduleUserNotifications(userId: string): Promise<void> {
    try {
      // Cancel existing notifications
      await this.cancelUserNotifications(userId);
      
      // Reschedule based on new settings
      const settings = await this.getNotificationSettings(userId);
      
      if (settings.enabled) {
        // Schedule daily tip notifications
        // This would typically get the next tip and schedule it
        console.log('Rescheduling notifications for user:', userId);
      }
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
    }
  }

  private getNextScheduledTime(time: string, timezone: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    return scheduledTime;
  }

  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    
    return result;
  }

  private async storeScheduledNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const existing = await this.getScheduledNotifications(notification.userId);
      const updated = [...existing, notification];
      await storeData(`SCHEDULED_NOTIFICATIONS_${notification.userId}`, updated);
    } catch (error) {
      console.error('Error storing scheduled notification:', error);
    }
  }

  private async recordNotificationSent(payload: NotificationPayload): Promise<void> {
    try {
      // Record notification analytics
      console.log('Recording notification sent:', payload.id);
      
      // In a real implementation, this would store analytics data
      // for tracking delivery rates, open rates, etc.
    } catch (error) {
      console.error('Error recording notification sent:', error);
    }
  }

  private handleNotificationTap(notification: any): void {
    try {
      // Handle navigation based on notification action URL
      const actionUrl = notification.data?.actionUrl;
      
      if (actionUrl) {
        console.log('Navigating to:', actionUrl);
        // In a real implementation, this would use navigation service
        // to navigate to the appropriate screen
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }

  /**
   * Test notification (for development)
   */
  public async sendTestNotification(userId: string): Promise<void> {
    try {
      const payload: NotificationPayload = {
        id: `test_${userId}_${Date.now()}`,
        type: 'general',
        title: '🧪 Test Notification',
        body: 'This is a test notification from Healthy Tip App!',
        data: { test: true },
        priority: 'normal',
        userId,
      };

      await this.pushLibrary.scheduleNotification(payload);
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}