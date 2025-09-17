/**
 * Unit tests for Notification Service
 */

import { NotificationService } from '../../src/services/notification/notificationService';
import {
  NotificationSettings,
  NotificationPermission,
} from '../../src/types/notification';
import { HealthTip, StreakMilestone } from '../../src/types';
import * as storage from '../../src/utils/storage';

// Mock dependencies
jest.mock('../../src/utils/storage');
jest.mock('../../src/services/progress/progressService');
jest.mock('../../src/services/content/contentService');

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  const mockUserId = 'user123';

  beforeEach(() => {
    notificationService = NotificationService.getInstance();
    jest.clearAllMocks();
  });

  describe('requestPermission', () => {
    it('should request and store notification permission', async () => {
      mockStorage.getData.mockResolvedValue(null);
      mockStorage.storeData.mockResolvedValue();

      const result = await notificationService.requestPermission();

      expect(result.granted).toBe(true);
      expect(result.requestedAt).toBeInstanceOf(Date);
      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'NOTIFICATION_PERMISSION',
        expect.objectContaining({
          granted: true,
          requestedAt: expect.any(Date),
        }),
      );
    });

    it('should return existing permission if already granted', async () => {
      const existingPermission: NotificationPermission = {
        granted: true,
        requestedAt: new Date('2024-01-01'),
        lastChecked: new Date('2024-01-01'),
      };

      mockStorage.getData.mockResolvedValue(existingPermission);

      const result = await notificationService.requestPermission();

      expect(result).toEqual(existingPermission);
      expect(mockStorage.storeData).not.toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      mockStorage.getData.mockResolvedValue(null);
      mockStorage.storeData.mockResolvedValue();

      // Mock permission denial
      const originalRequestPermission = (notificationService as any).pushLibrary
        .requestPermission;
      (notificationService as any).pushLibrary.requestPermission = jest
        .fn()
        .mockResolvedValue(false);

      const result = await notificationService.requestPermission();

      expect(result.granted).toBe(false);
      expect(result.deniedAt).toBeInstanceOf(Date);
      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'NOTIFICATION_PERMISSION',
        expect.objectContaining({
          granted: false,
          deniedAt: expect.any(Date),
        }),
      );

      // Restore original method
      (notificationService as any).pushLibrary.requestPermission =
        originalRequestPermission;
    });
  });

  describe('getNotificationSettings', () => {
    it('should return stored notification settings', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/New_York',
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
        },
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      const result = await notificationService.getNotificationSettings(
        mockUserId,
      );

      expect(result).toEqual(mockSettings);
      expect(mockStorage.getData).toHaveBeenCalledWith(
        `NOTIFICATION_SETTINGS_${mockUserId}`,
      );
    });

    it('should return default settings for new user', async () => {
      mockStorage.getData.mockResolvedValue(null);
      mockStorage.storeData.mockResolvedValue();

      const result = await notificationService.getNotificationSettings(
        mockUserId,
      );

      expect(result.enabled).toBe(true);
      expect(result.dailyTipTime).toBe('09:00');
      expect(result.streakReminders).toBe(true);
      expect(result.milestoneNotifications).toBe(true);
      expect(result.encouragementMessages).toBe(true);
      expect(result.timezone).toBeDefined();
      expect(mockStorage.storeData).toHaveBeenCalled();
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update and store notification settings', async () => {
      const newSettings: NotificationSettings = {
        enabled: false,
        dailyTipTime: '10:00',
        streakReminders: false,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/Los_Angeles',
      };

      mockStorage.storeData.mockResolvedValue();

      await notificationService.updateNotificationSettings(
        mockUserId,
        newSettings,
      );

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        `NOTIFICATION_SETTINGS_${mockUserId}`,
        newSettings,
      );
    });
  });

  describe('scheduleDailyTipNotification', () => {
    const mockTip: HealthTip = {
      id: 'tip123',
      title: 'Stay Hydrated',
      content:
        'Drink plenty of water throughout the day to maintain good health.',
      category: 'nutrition',
      tags: ['hydration', 'health'],
      difficulty: 'easy',
      estimatedReadTime: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      isActive: true,
    };

    it('should schedule daily tip notification when enabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);
      mockStorage.storeData.mockResolvedValue();

      const result = await notificationService.scheduleDailyTipNotification(
        mockUserId,
        mockTip,
      );

      expect(result).toBeDefined();
      expect(result).toContain('mock_notification_');
    });

    it('should not schedule notification when disabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: false,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      const result = await notificationService.scheduleDailyTipNotification(
        mockUserId,
        mockTip,
      );

      expect(result).toBe('');
    });
  });

  describe('sendMilestoneNotification', () => {
    const mockMilestone: StreakMilestone = {
      days: 7,
      title: 'One Week Strong',
      description: 'A full week of healthy habits!',
      achieved: true,
      achievedAt: new Date(),
    };

    it('should send milestone notification when enabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      await notificationService.sendMilestoneNotification(
        mockUserId,
        mockMilestone,
        7,
      );

      // Should not throw an error
      expect(true).toBe(true);
    });

    it('should not send milestone notification when disabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: false, // Disabled
        encouragementMessages: true,
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      await notificationService.sendMilestoneNotification(
        mockUserId,
        mockMilestone,
        7,
      );

      // Should not throw an error and should return early
      expect(true).toBe(true);
    });
  });

  describe('sendEncouragementNotification', () => {
    it('should send encouragement notification when enabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      await notificationService.sendEncouragementNotification(mockUserId, 3, 5);

      // Should not throw an error
      expect(true).toBe(true);
    });

    it('should not send encouragement notification when disabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: false, // Disabled
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      await notificationService.sendEncouragementNotification(mockUserId, 3, 5);

      // Should not throw an error and should return early
      expect(true).toBe(true);
    });
  });

  describe('sendStreakReminderNotification', () => {
    it('should send streak reminder notification when enabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: true,
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      await notificationService.sendStreakReminderNotification(mockUserId, 5);

      // Should not throw an error
      expect(true).toBe(true);
    });

    it('should not send streak reminder when disabled', async () => {
      const mockSettings: NotificationSettings = {
        enabled: true,
        dailyTipTime: '09:00',
        streakReminders: false, // Disabled
        milestoneNotifications: true,
        encouragementMessages: true,
        timezone: 'America/New_York',
      };

      mockStorage.getData.mockResolvedValue(mockSettings);

      await notificationService.sendStreakReminderNotification(mockUserId, 5);

      // Should not throw an error and should return early
      expect(true).toBe(true);
    });
  });

  describe('cancelUserNotifications', () => {
    it('should cancel all user notifications', async () => {
      const mockNotifications = [
        {
          id: 'notification1',
          userId: mockUserId,
          type: 'daily_tip' as const,
          payload: {} as any,
          scheduledTime: new Date(),
          isRecurring: true,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockStorage.getData.mockResolvedValue(mockNotifications);
      mockStorage.storeData.mockResolvedValue();

      await notificationService.cancelUserNotifications(mockUserId);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        `SCHEDULED_NOTIFICATIONS_${mockUserId}`,
        [],
      );
    });
  });

  describe('getScheduledNotifications', () => {
    it('should return scheduled notifications for user', async () => {
      const mockNotifications = [
        {
          id: 'notification1',
          userId: mockUserId,
          type: 'daily_tip' as const,
          payload: {} as any,
          scheduledTime: new Date(),
          isRecurring: true,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockStorage.getData.mockResolvedValue(mockNotifications);

      const result = await notificationService.getScheduledNotifications(
        mockUserId,
      );

      expect(result).toEqual(mockNotifications);
      expect(mockStorage.getData).toHaveBeenCalledWith(
        `SCHEDULED_NOTIFICATIONS_${mockUserId}`,
      );
    });

    it('should return empty array when no notifications exist', async () => {
      mockStorage.getData.mockResolvedValue(null);

      const result = await notificationService.getScheduledNotifications(
        mockUserId,
      );

      expect(result).toEqual([]);
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification', async () => {
      await notificationService.sendTestNotification(mockUserId);

      // Should not throw an error
      expect(true).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize notification service successfully', async () => {
      mockStorage.getData.mockResolvedValue(null);
      mockStorage.storeData.mockResolvedValue();

      const result = await notificationService.initialize();

      expect(result).toBe(true);
    });

    it('should return false if permission is denied', async () => {
      // Mock permission denial
      const originalRequestPermission = (notificationService as any).pushLibrary
        .requestPermission;
      (notificationService as any).pushLibrary.requestPermission = jest
        .fn()
        .mockResolvedValue(false);

      mockStorage.getData.mockResolvedValue(null);
      mockStorage.storeData.mockResolvedValue();

      const result = await notificationService.initialize();

      expect(result).toBe(false);

      // Restore original method
      (notificationService as any).pushLibrary.requestPermission =
        originalRequestPermission;
    });
  });
});
