/**
 * Notification Scheduler
 * Handles automatic scheduling and triggering of notifications
 */

import { NotificationService } from './notificationService';
import { ProgressService } from '../progress/progressService';
import { ContentService } from '../content/contentService';
import { UserProfile } from '../../types';

export interface SchedulerConfig {
  checkInterval: number; // in milliseconds
  inactiveThreshold: number; // days before sending encouragement
  streakReminderHour: number; // hour of day to send streak reminders
}

/**
 * Notification Scheduler Class
 */
export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private notificationService: NotificationService;
  private progressService: ProgressService;
  private contentService: ContentService;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private readonly config: SchedulerConfig = {
    checkInterval: 60 * 60 * 1000, // Check every hour
    inactiveThreshold: 2, // Send encouragement after 2 days of inactivity
    streakReminderHour: 20, // 8 PM
  };

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    this.progressService = ProgressService.getInstance();
    this.contentService = ContentService.getInstance();
  }

  public static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  /**
   * Start the notification scheduler
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Notification scheduler is already running');
      return;
    }

    console.log('Starting notification scheduler...');
    this.isRunning = true;

    // Run initial check
    this.runSchedulerCheck();

    // Set up recurring checks
    this.schedulerInterval = setInterval(() => {
      this.runSchedulerCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop the notification scheduler
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('Notification scheduler is not running');
      return;
    }

    console.log('Stopping notification scheduler...');
    this.isRunning = false;

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Schedule daily tip notification for a user
   */
  public async scheduleDailyTipForUser(user: UserProfile): Promise<void> {
    try {
      // Get personalized tip for the user
      const tips = await this.contentService.getDailyTips(user.id, 1);
      
      if (tips.length > 0) {
        await this.notificationService.scheduleDailyTipNotification(user.id, tips[0]);
        console.log(`Scheduled daily tip notification for user ${user.id}`);
      }
    } catch (error) {
      console.error(`Error scheduling daily tip for user ${user.id}:`, error);
    }
  }

  /**
   * Check and handle milestone achievements
   */
  public async checkMilestoneAchievements(userId: string): Promise<void> {
    try {
      const progress = await this.progressService.getUserProgress(userId);
      const milestones = await this.progressService.getUserMilestones(userId);

      if (!progress) return;

      // Check for newly achieved milestones
      const recentlyAchieved = milestones.filter(milestone => {
        return milestone.achieved && 
               milestone.days === progress.currentStreak &&
               milestone.achievedAt &&
               this.isRecentlyAchieved(milestone.achievedAt);
      });

      // Send celebration notifications for recently achieved milestones
      for (const milestone of recentlyAchieved) {
        await this.notificationService.sendMilestoneNotification(
          userId,
          milestone,
          progress.currentStreak
        );
        console.log(`Sent milestone notification for ${milestone.title} to user ${userId}`);
      }
    } catch (error) {
      console.error(`Error checking milestone achievements for user ${userId}:`, error);
    }
  }

  /**
   * Check and send encouragement notifications for inactive users
   */
  public async checkInactiveUsers(userId: string): Promise<void> {
    try {
      const encouragementCheck = await this.progressService.checkForEncouragement(userId);

      if (encouragementCheck.needsEncouragement && 
          encouragementCheck.daysMissed >= this.config.inactiveThreshold) {
        
        const progress = await this.progressService.getUserProgress(userId);
        const lastStreak = progress?.longestStreak || 0;

        await this.notificationService.sendEncouragementNotification(
          userId,
          encouragementCheck.daysMissed,
          lastStreak
        );

        console.log(`Sent encouragement notification to inactive user ${userId} (${encouragementCheck.daysMissed} days missed)`);
      }
    } catch (error) {
      console.error(`Error checking inactive user ${userId}:`, error);
    }
  }

  /**
   * Check and send streak reminder notifications
   */
  public async checkStreakReminders(userId: string): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Only send streak reminders at the configured hour
      if (currentHour !== this.config.streakReminderHour) {
        return;
      }

      const progress = await this.progressService.getUserProgress(userId);
      if (!progress || progress.currentStreak === 0) {
        return;
      }

      // Check if user has already engaged today
      const today = new Date();
      const lastActivity = new Date(progress.lastActivityDate);
      const isToday = today.toDateString() === lastActivity.toDateString();

      // If user hasn't engaged today and has an active streak, send reminder
      if (!isToday && progress.currentStreak > 0) {
        await this.notificationService.sendStreakReminderNotification(
          userId,
          progress.currentStreak
        );
        console.log(`Sent streak reminder to user ${userId} (${progress.currentStreak}-day streak)`);
      }
    } catch (error) {
      console.error(`Error checking streak reminders for user ${userId}:`, error);
    }
  }

  /**
   * Handle progress update and trigger relevant notifications
   */
  public async handleProgressUpdate(
    userId: string,
    tipId: string,
    action: 'view' | 'complete'
  ): Promise<void> {
    try {
      if (action === 'complete') {
        // Update progress first
        const result = await this.progressService.updateProgress({
          userId,
          tipId,
          action: 'complete',
          timestamp: new Date(),
        });

        // Check for milestone achievements
        if (result.newMilestone) {
          await this.notificationService.sendMilestoneNotification(
            userId,
            result.newMilestone,
            result.currentStreak
          );
          console.log(`Sent milestone notification for ${result.newMilestone.title} to user ${userId}`);
        }

        // If streak was broken, we might want to send a different type of notification
        if (result.streakBroken && result.currentStreak === 1) {
          console.log(`User ${userId} restarted their streak after a break`);
          // Could send a "welcome back" notification here
        }
      }
    } catch (error) {
      console.error(`Error handling progress update for user ${userId}:`, error);
    }
  }

  /**
   * Schedule notifications for a new user
   */
  public async setupNotificationsForNewUser(user: UserProfile): Promise<void> {
    try {
      console.log(`Setting up notifications for new user ${user.id}`);

      // Initialize notification service for the user
      await this.notificationService.initialize();

      // Schedule their first daily tip
      await this.scheduleDailyTipForUser(user);

      // Send a welcome notification
      await this.sendWelcomeNotification(user);
    } catch (error) {
      console.error(`Error setting up notifications for new user ${user.id}:`, error);
    }
  }

  /**
   * Send welcome notification to new users
   */
  private async sendWelcomeNotification(user: UserProfile): Promise<void> {
    try {
      // Wait a few minutes before sending welcome notification
      setTimeout(async () => {
        const welcomePayload = {
          id: `welcome_${user.id}_${Date.now()}`,
          type: 'general' as const,
          title: '🎉 Welcome to BioReceipt!',
          body: `Hi ${user.name}! Ready to start your wellness journey? Your first daily tip is waiting for you.`,
          data: { welcome: true, userId: user.id },
          priority: 'normal' as const,
          userId: user.id,
          actionUrl: 'app://tips',
        };

        // Use the notification service's test method for now
        // In a real implementation, this would use a proper welcome notification method
        console.log('Sending welcome notification:', welcomePayload);
      }, 5 * 60 * 1000); // 5 minutes delay
    } catch (error) {
      console.error(`Error sending welcome notification to user ${user.id}:`, error);
    }
  }

  /**
   * Run the main scheduler check
   */
  private async runSchedulerCheck(): Promise<void> {
    try {
      console.log('Running notification scheduler check...');

      // In a real implementation, this would:
      // 1. Get all active users from the database
      // 2. Check each user's notification needs
      // 3. Send appropriate notifications

      // For now, we'll log that the scheduler is running
      console.log('Scheduler check completed');
    } catch (error) {
      console.error('Error in scheduler check:', error);
    }
  }

  /**
   * Check if a milestone was recently achieved (within the last hour)
   */
  private isRecentlyAchieved(achievedAt: Date): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - achievedAt.getTime();
    const oneHour = 60 * 60 * 1000;
    return timeDiff <= oneHour;
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    nextCheck?: Date;
  } {
    const nextCheck = this.schedulerInterval 
      ? new Date(Date.now() + this.config.checkInterval)
      : undefined;

    return {
      isRunning: this.isRunning,
      config: this.config,
      nextCheck,
    };
  }

  /**
   * Update scheduler configuration
   */
  public updateConfig(newConfig: Partial<SchedulerConfig>): void {
    Object.assign(this.config, newConfig);
    console.log('Scheduler configuration updated:', this.config);

    // Restart scheduler with new config if it's running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}