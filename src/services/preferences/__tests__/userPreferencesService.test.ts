/**
 * User Preferences Service Unit Tests
 * Tests for preferences storage, retrieval, and validation
 */
import { userPreferencesService } from '../userPreferencesService';
import { storage } from '../../../utils/storage';
import { cacheService } from '../../cache/cacheService';
import { analyticsService } from '../../analytics/analyticsService';
import { 
  UserPreferences, 
  DEFAULT_USER_PREFERENCES,
  UserPreferencesValidator,
  UserPreferencesHelper
} from '../../../models/UserPreferences';

// Mock dependencies
jest.mock('../../../utils/storage');
jest.mock('../../cache/cacheService');
jest.mock('../../analytics/analyticsService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('UserPreferencesService', () => {
  const mockUserId = 'user_123';
  const mockPreferences: UserPreferences = {
    id: 'pref_123',
    userId: mockUserId,
    notifications: {
      enabled: true,
      dailyTips: true,
      weeklyDigest: false,
      achievements: true,
      reminders: false,
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00'
      },
      frequency: 'medium'
    },
    content: {
      categories: {
        nutrition: true,
        fitness: true,
        mentalWellness: false,
        sleep: true,
        recovery: false,
        hygiene: true
      },
      difficulty: 'intermediate',
      readingTime: 'medium',
      language: 'en',
      personalizedContent: true,
      aiRecommendations: true
    },
    privacy: {
      dataCollection: true,
      analytics: false,
      personalization: true,
      dataSharing: false,
      crashReporting: true,
      locationTracking: false
    },
    display: {
      theme: 'dark',
      fontSize: 'large',
      highContrast: false,
      reduceMotion: true,
      compactMode: false
    },
    accessibility: {
      screenReader: false,
      voiceOver: false,
      largeText: true,
      buttonShapes: false,
      reduceTransparency: false
    },
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return cached preferences when available', async () => {
      mockCacheService.get.mockResolvedValue(mockPreferences);

      const result = await userPreferencesService.getUserPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user_prefs_${mockUserId}`);
      expect(mockStorage.getData).not.toHaveBeenCalled();
    });

    it('should load preferences from storage when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockStorage.getData.mockResolvedValue({
        [mockUserId]: mockPreferences
      });

      const result = await userPreferencesService.getUserPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(mockStorage.getData).toHaveBeenCalledWith('USER_PREFERENCES');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user_prefs_${mockUserId}`,
        mockPreferences,
        3600
      );
    });

    it('should create default preferences for new user', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockStorage.getData.mockResolvedValue({});

      const result = await userPreferencesService.getUserPreferences(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.notifications).toEqual(DEFAULT_USER_PREFERENCES.notifications);
      expect(result.content).toEqual(DEFAULT_USER_PREFERENCES.content);
      expect(mockStorage.storeData).toHaveBeenCalled();
    });

    it('should migrate preferences when version is outdated', async () => {
      const outdatedPrefs = { ...mockPreferences, version: 0 };
      mockCacheService.get.mockResolvedValue(null);
      mockStorage.getData.mockResolvedValue({
        [mockUserId]: outdatedPrefs
      });

      const result = await userPreferencesService.getUserPreferences(mockUserId);

      expect(result.version).toBe(DEFAULT_USER_PREFERENCES.version);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should return defaults on error', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockStorage.getData.mockRejectedValue(new Error('Storage error'));

      const result = await userPreferencesService.getUserPreferences(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.notifications).toEqual(DEFAULT_USER_PREFERENCES.notifications);
    });
  });

  describe('updateUserPreferences', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(mockPreferences);
    });

    it('should update preferences successfully', async () => {
      const updates = {
        notifications: {
          enabled: false,
          dailyTips: false
        }
      };

      const result = await userPreferencesService.updateUserPreferences(mockUserId, updates);

      expect(result.notifications.enabled).toBe(false);
      expect(result.notifications.dailyTips).toBe(false);
      expect(result.notifications.weeklyDigest).toBe(mockPreferences.notifications.weeklyDigest);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockStorage.storeData).toHaveBeenCalled();
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'preferences_updated',
        expect.any(Object)
      );
    });

    it('should validate preferences before updating', async () => {
      const invalidUpdates = {
        notifications: {
          quietHours: {
            enabled: true,
            startTime: 'invalid-time',
            endTime: '08:00'
          }
        }
      };

      await expect(
        userPreferencesService.updateUserPreferences(mockUserId, invalidUpdates)
      ).rejects.toThrow('Invalid preferences');
    });

    it('should merge nested objects correctly', async () => {
      const updates = {
        content: {
          difficulty: 'advanced' as const
        }
      };

      const result = await userPreferencesService.updateUserPreferences(mockUserId, updates);

      expect(result.content.difficulty).toBe('advanced');
      expect(result.content.categories).toEqual(mockPreferences.content.categories);
      expect(result.content.personalizedContent).toBe(mockPreferences.content.personalizedContent);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.storeData.mockRejectedValue(new Error('Storage error'));

      await expect(
        userPreferencesService.updateUserPreferences(mockUserId, {
          notifications: { enabled: false }
        })
      ).rejects.toThrow('Failed to update preferences');
    });
  });

  describe('resetPreferences', () => {
    it('should reset preferences to defaults', async () => {
      const result = await userPreferencesService.resetPreferences(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.notifications).toEqual(DEFAULT_USER_PREFERENCES.notifications);
      expect(result.content).toEqual(DEFAULT_USER_PREFERENCES.content);
      expect(result.privacy).toEqual(DEFAULT_USER_PREFERENCES.privacy);
      expect(mockStorage.storeData).toHaveBeenCalled();
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'preferences_reset',
        expect.objectContaining({ userId: mockUserId })
      );
    });
  });

  describe('exportPreferences', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(mockPreferences);
    });

    it('should export preferences as JSON string', async () => {
      const result = await userPreferencesService.exportPreferences(mockUserId);
      const parsed = JSON.parse(result);

      expect(parsed.notifications).toEqual(mockPreferences.notifications);
      expect(parsed.content).toEqual(mockPreferences.content);
      expect(parsed.id).toBeUndefined();
      expect(parsed.userId).toBeUndefined();
      expect(parsed.lastSyncedAt).toBeUndefined();
    });
  });

  describe('importPreferences', () => {
    it('should import valid preferences', async () => {
      const importData = {
        notifications: DEFAULT_USER_PREFERENCES.notifications,
        content: DEFAULT_USER_PREFERENCES.content,
        privacy: DEFAULT_USER_PREFERENCES.privacy,
        display: DEFAULT_USER_PREFERENCES.display,
        accessibility: DEFAULT_USER_PREFERENCES.accessibility,
        version: 1
      };

      const result = await userPreferencesService.importPreferences(
        mockUserId,
        JSON.stringify(importData)
      );

      expect(result.userId).toBe(mockUserId);
      expect(result.notifications).toEqual(importData.notifications);
      expect(mockStorage.storeData).toHaveBeenCalled();
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'preferences_imported',
        expect.objectContaining({ userId: mockUserId })
      );
    });

    it('should reject invalid imported preferences', async () => {
      const invalidData = {
        notifications: {
          quietHours: {
            startTime: 'invalid-time'
          }
        }
      };

      await expect(
        userPreferencesService.importPreferences(mockUserId, JSON.stringify(invalidData))
      ).rejects.toThrow('Invalid imported preferences');
    });

    it('should handle malformed JSON', async () => {
      await expect(
        userPreferencesService.importPreferences(mockUserId, 'invalid-json')
      ).rejects.toThrow('Failed to import preferences');
    });
  });

  describe('getContentFilter', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(mockPreferences);
    });

    it('should return content filter based on preferences', async () => {
      const result = await userPreferencesService.getContentFilter(mockUserId);

      expect(result.categories).toEqual(['nutrition', 'fitness', 'sleep', 'hygiene']);
      expect(result.difficulty).toBe('intermediate');
      expect(result.maxReadingTime).toBe(7);
      expect(result.personalizedContent).toBe(true);
      expect(result.aiRecommendations).toBe(true);
    });

    it('should return permissive defaults on error', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Error'));

      const result = await userPreferencesService.getContentFilter(mockUserId);

      expect(result.categories).toEqual([
        'nutrition', 'fitness', 'mentalWellness', 'sleep', 'recovery', 'hygiene'
      ]);
      expect(result.personalizedContent).toBe(true);
      expect(result.aiRecommendations).toBe(true);
    });
  });

  describe('canSendNotification', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(mockPreferences);
    });

    it('should return false when notifications are disabled', async () => {
      const disabledPrefs = {
        ...mockPreferences,
        notifications: { ...mockPreferences.notifications, enabled: false }
      };
      mockCacheService.get.mockResolvedValue(disabledPrefs);

      const result = await userPreferencesService.canSendNotification(mockUserId, 'daily_tips');

      expect(result).toBe(false);
    });

    it('should check specific notification types', async () => {
      const dailyTipsResult = await userPreferencesService.canSendNotification(mockUserId, 'daily_tips');
      const weeklyDigestResult = await userPreferencesService.canSendNotification(mockUserId, 'weekly_digest');

      expect(dailyTipsResult).toBe(true);
      expect(weeklyDigestResult).toBe(false);
    });

    it('should return true for unknown notification types', async () => {
      const result = await userPreferencesService.canSendNotification(mockUserId, 'unknown_type');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Error'));

      const result = await userPreferencesService.canSendNotification(mockUserId, 'daily_tips');

      expect(result).toBe(false);
    });
  });

  describe('getNotificationFrequency', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(mockPreferences);
    });

    it('should return notification frequency', async () => {
      const result = await userPreferencesService.getNotificationFrequency(mockUserId);

      expect(result).toBe('medium');
    });

    it('should return medium as default on error', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Error'));

      const result = await userPreferencesService.getNotificationFrequency(mockUserId);

      expect(result).toBe('medium');
    });
  });

  describe('syncWithCloud', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(mockPreferences);
    });

    it('should update lastSyncedAt timestamp', async () => {
      await userPreferencesService.syncWithCloud(mockUserId);

      expect(mockStorage.storeData).toHaveBeenCalled();
      // Verify that the stored preferences have lastSyncedAt updated
      const storedData = mockStorage.storeData.mock.calls[0][1];
      expect(storedData[mockUserId].lastSyncedAt).toBeInstanceOf(Date);
    });

    it('should not throw on sync errors', async () => {
      mockStorage.storeData.mockRejectedValue(new Error('Sync error'));

      await expect(
        userPreferencesService.syncWithCloud(mockUserId)
      ).resolves.not.toThrow();
    });
  });
});

describe('UserPreferencesValidator', () => {
  it('should validate correct preferences', () => {
    const validPrefs = {
      notifications: {
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00'
        }
      },
      content: {
        difficulty: 'intermediate' as const,
        readingTime: 'medium' as const
      },
      display: {
        theme: 'dark' as const,
        fontSize: 'large' as const
      }
    };

    const result = UserPreferencesValidator.validate(validPrefs);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid time formats', () => {
    const invalidPrefs = {
      notifications: {
        quietHours: {
          enabled: true,
          startTime: '25:00',
          endTime: 'invalid'
        }
      }
    };

    const result = UserPreferencesValidator.validate(invalidPrefs);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid quiet hours start time format');
    expect(result.errors).toContain('Invalid quiet hours end time format');
  });

  it('should reject invalid enum values', () => {
    const invalidPrefs = {
      content: {
        difficulty: 'invalid' as any,
        readingTime: 'invalid' as any
      },
      display: {
        theme: 'invalid' as any,
        fontSize: 'invalid' as any
      }
    };

    const result = UserPreferencesValidator.validate(invalidPrefs);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid difficulty level');
    expect(result.errors).toContain('Invalid reading time preference');
    expect(result.errors).toContain('Invalid theme selection');
    expect(result.errors).toContain('Invalid font size selection');
  });
});

describe('UserPreferencesHelper', () => {
  const mockUserId = 'user_123';
  const mockPreferences: UserPreferences = {
    id: 'pref_123',
    userId: mockUserId,
    notifications: {
      enabled: true,
      dailyTips: true,
      weeklyDigest: false,
      achievements: true,
      reminders: false,
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00'
      },
      frequency: 'medium'
    },
    content: {
      categories: {
        nutrition: true,
        fitness: true,
        mentalWellness: false,
        sleep: true,
        recovery: false,
        hygiene: true
      },
      difficulty: 'intermediate',
      readingTime: 'medium',
      language: 'en',
      personalizedContent: true,
      aiRecommendations: true
    },
    privacy: {
      dataCollection: true,
      analytics: false,
      personalization: true,
      dataSharing: false,
      crashReporting: true,
      locationTracking: false
    },
    display: {
      theme: 'dark',
      fontSize: 'large',
      highContrast: false,
      reduceMotion: true,
      compactMode: false
    },
    accessibility: {
      screenReader: false,
      voiceOver: false,
      largeText: true,
      buttonShapes: false,
      reduceTransparency: false
    },
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02')
  };
  
  it('should merge preferences with defaults', () => {
    const partialPrefs = {
      id: 'test_id',
      userId: mockUserId,
      notifications: {
        enabled: false
      },
      content: {
        difficulty: 'advanced' as const
      }
    };

    const result = UserPreferencesHelper.mergeWithDefaults(partialPrefs);
    
    expect(result.id).toBe('test_id');
    expect(result.userId).toBe(mockUserId);
    expect(result.notifications.enabled).toBe(false);
    expect(result.notifications.dailyTips).toBe(DEFAULT_USER_PREFERENCES.notifications.dailyTips);
    expect(result.content.difficulty).toBe('advanced');
    expect(result.content.categories).toEqual(DEFAULT_USER_PREFERENCES.content.categories);
  });

  it('should detect when migration is needed', () => {
    const oldPrefs = { ...mockPreferences, version: 0 };
    const currentPrefs = { ...mockPreferences, version: 1 };
    
    expect(UserPreferencesHelper.needsMigration(oldPrefs)).toBe(true);
    expect(UserPreferencesHelper.needsMigration(currentPrefs)).toBe(false);
  });

  it('should migrate preferences to latest version', () => {
    const oldPrefs = { ...mockPreferences, version: 0 };
    const migrated = UserPreferencesHelper.migrate(oldPrefs);
    
    expect(migrated.version).toBe(DEFAULT_USER_PREFERENCES.version);
    expect(migrated.updatedAt).toBeInstanceOf(Date);
  });

  it('should get content filter from preferences', () => {
    const filter = UserPreferencesHelper.getContentFilter(mockPreferences);
    
    expect(filter.categories).toEqual(['nutrition', 'fitness', 'sleep', 'hygiene']);
    expect(filter.difficulty).toBe('intermediate');
    expect(filter.maxReadingTime).toBe(7);
  });

  it('should handle mixed difficulty correctly', () => {
    const mixedPrefs = {
      ...mockPreferences,
      content: { ...mockPreferences.content, difficulty: 'mixed' as const }
    };
    
    const filter = UserPreferencesHelper.getContentFilter(mixedPrefs);
    expect(filter.difficulty).toBeUndefined();
  });

  it('should handle any reading time correctly', () => {
    const anyTimePrefs = {
      ...mockPreferences,
      content: { ...mockPreferences.content, readingTime: 'any' as const }
    };
    
    const filter = UserPreferencesHelper.getContentFilter(anyTimePrefs);
    expect(filter.maxReadingTime).toBeUndefined();
  });

  it('should check notification permissions correctly', () => {
    // Test during quiet hours (assuming current time is 23:00)
    const mockDate = new Date('2024-01-01T23:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    
    const result = UserPreferencesHelper.canSendNotification(mockPreferences);
    expect(result).toBe(false); // Should be false during quiet hours
    
    jest.restoreAllMocks();
  });

  it('should allow notifications outside quiet hours', () => {
    // Test outside quiet hours (assuming current time is 10:00)
    const mockDate = new Date('2024-01-01T10:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    
    const result = UserPreferencesHelper.canSendNotification(mockPreferences);
    expect(result).toBe(true); // Should be true outside quiet hours
    
    jest.restoreAllMocks();
  });

  it('should handle quiet hours disabled', () => {
    const noQuietHoursPrefs = {
      ...mockPreferences,
      notifications: {
        ...mockPreferences.notifications,
        quietHours: { ...mockPreferences.notifications.quietHours, enabled: false }
      }
    };
    
    const result = UserPreferencesHelper.canSendNotification(noQuietHoursPrefs);
    expect(result).toBe(true);
  });

  it('should handle notifications disabled', () => {
    const disabledNotificationsPrefs = {
      ...mockPreferences,
      notifications: { ...mockPreferences.notifications, enabled: false }
    };
    
    const result = UserPreferencesHelper.canSendNotification(disabledNotificationsPrefs);
    expect(result).toBe(false);
  });
});