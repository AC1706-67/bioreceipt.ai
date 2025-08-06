/**
 * Progress Service Tests
 * Unit tests for progress tracking and AI insights functionality
 */

import { progressService, UserProgress, Recommendation } from '../progressService';
import { storage } from '../../../utils/storage';
import { loggingService } from '../../logging/loggingService';
import { kiroAIService } from '../../ai/kiroAIService';

// Mock dependencies
jest.mock('../../../utils/storage');
jest.mock('../../logging/loggingService');
jest.mock('../../ai/kiroAIService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;
const mockKiroAIService = kiroAIService as jest.Mocked<typeof kiroAIService>;

describe('ProgressService', () => {
  const mockUserId = 'test-user-123';
  const mockTipId = 'tip-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default storage mock
    mockStorage.getData.mockResolvedValue({});
    mockStorage.storeData.mockResolvedValue(undefined);
    
    // Setup default logging mock
    mockLoggingService.info.mockImplementation(() => {});
    mockLoggingService.error.mockImplementation(() => {});
    mockLoggingService.warning.mockImplementation(() => {});
  });

  describe('getUserProgress', () => {
    it('should create initial progress for new user', async () => {
      const result = await progressService.getUserProgress(mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalTipsCompleted).toBe(0);
      expect(result.totalEngagementTime).toBe(0);
      expect(mockStorage.storeData).toHaveBeenCalled();
    });

    it('should return existing progress for returning user', async () => {
      const existingProgress: UserProgress = {
        id: 'progress-123',
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 10,
        totalTipsCompleted: 25,
        totalEngagementTime: 50,
        lastActivityDate: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      };

      mockStorage.getData.mockResolvedValue({
        [mockUserId]: existingProgress
      });

      const result = await progressService.getUserProgress(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.currentStreak).toBe(5);
      expect(result.totalTipsCompleted).toBe(25);
    });
  });

  describe('updateUserProgress', () => {
    it('should increment streak for consecutive day activity', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const existingProgress: UserProgress = {
        id: 'progress-123',
        userId: mockUserId,
        currentStreak: 3,
        longestStreak: 5,
        totalTipsCompleted: 10,
        totalEngagementTime: 20,
        lastActivityDate: yesterday,
        createdAt: new Date('2024-01-01'),
        updatedAt: yesterday
      };

      mockStorage.getData.mockResolvedValue({
        [mockUserId]: existingProgress
      });

      await progressService.updateUserProgress(mockUserId, mockTipId);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'USER_PROGRESS',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            currentStreak: 4,
            totalTipsCompleted: 11,
            totalEngagementTime: 22
          })
        })
      );
    });

    it('should reset streak for activity after gap', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const existingProgress: UserProgress = {
        id: 'progress-123',
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 10,
        totalTipsCompleted: 15,
        totalEngagementTime: 30,
        lastActivityDate: threeDaysAgo,
        createdAt: new Date('2024-01-01'),
        updatedAt: threeDaysAgo
      };

      mockStorage.getData.mockResolvedValue({
        [mockUserId]: existingProgress
      });

      await progressService.updateUserProgress(mockUserId, mockTipId);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'USER_PROGRESS',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            currentStreak: 1, // Reset to 1
            longestStreak: 10, // Unchanged
            totalTipsCompleted: 16
          })
        })
      );
    });
  });

  describe('resetStreak', () => {
    it('should reset user streak to 0', async () => {
      const existingProgress: UserProgress = {
        id: 'progress-123',
        userId: mockUserId,
        currentStreak: 7,
        longestStreak: 10,
        totalTipsCompleted: 20,
        totalEngagementTime: 40,
        lastActivityDate: new Date(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      };

      mockStorage.getData.mockResolvedValue({
        [mockUserId]: existingProgress
      });

      await progressService.resetStreak(mockUserId);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'USER_PROGRESS',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            currentStreak: 0,
            longestStreak: 10 // Unchanged
          })
        })
      );
    });
  });

  describe('getProgressInsights', () => {
    beforeEach(() => {
      const mockProgress: UserProgress = {
        id: 'progress-123',
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 10,
        totalTipsCompleted: 25,
        totalEngagementTime: 50,
        lastActivityDate: new Date(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      };

      mockStorage.getData.mockImplementation((key: string) => {
        if (key === 'USER_PROGRESS') {
          return Promise.resolve({ [mockUserId]: mockProgress });
        }
        if (key === 'USER_PROFILES') {
          return Promise.resolve({
            [mockUserId]: {
              healthGoals: ['fitness', 'nutrition'],
              interests: ['running', 'cooking'],
              fitnessLevel: 'intermediate'
            }
          });
        }
        return Promise.resolve({});
      });
    });

    it('should return AI-powered insights when AI service is available', async () => {
      const mockAIResponse = {
        recommendations: [
          {
            type: 'streak_motivation',
            title: 'Keep Your Streak Going!',
            description: 'You are doing great with your 5-day streak',
            actionText: 'Continue',
            priority: 'high',
            confidence: 0.9,
            reasoning: ['Strong streak performance'],
            metadata: { targetStreak: 10 }
          }
        ]
      };

      mockKiroAIService.getPersonalizedRecommendations.mockResolvedValue(mockAIResponse);

      const result = await progressService.getProgressInsights(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('streak_motivation');
      expect(result[0].title).toBe('Keep Your Streak Going!');
      expect(result[0].confidence).toBe(0.9);
      expect(mockKiroAIService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          progressData: expect.objectContaining({
            currentStreak: 5,
            totalTipsCompleted: 25
          })
        }),
        5
      );
    });

    it('should return fallback insights when AI service fails', async () => {
      mockKiroAIService.getPersonalizedRecommendations.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const result = await progressService.getProgressInsights(mockUserId);

      expect(result.length).toBeGreaterThan(0);
      expect(mockLoggingService.warning).toHaveBeenCalledWith(
        'AI service unavailable, using fallback insights',
        expect.objectContaining({
          userId: mockUserId
        })
      );
    });

    it('should filter out low-confidence recommendations', async () => {
      const mockAIResponse = {
        recommendations: [
          {
            type: 'streak_motivation',
            title: 'High Confidence Rec',
            description: 'Good recommendation',
            actionText: 'Do it',
            priority: 'high',
            confidence: 0.9,
            reasoning: ['Strong signal']
          },
          {
            type: 'engagement_boost',
            title: 'Low Confidence Rec',
            description: 'Uncertain recommendation',
            actionText: 'Maybe do it',
            priority: 'low',
            confidence: 0.3,
            reasoning: ['Weak signal']
          }
        ]
      };

      mockKiroAIService.getPersonalizedRecommendations.mockResolvedValue(mockAIResponse);

      const result = await progressService.getProgressInsights(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('High Confidence Rec');
      expect(result[0].confidence).toBe(0.9);
    });
  });

  describe('getProgressStatistics', () => {
    it('should calculate statistics for multiple users', async () => {
      const mockProgressData = {
        'user1': {
          currentStreak: 5,
          totalTipsCompleted: 20,
          totalEngagementTime: 40
        },
        'user2': {
          currentStreak: 3,
          totalTipsCompleted: 15,
          totalEngagementTime: 30
        }
      };

      mockStorage.getData.mockResolvedValue(mockProgressData);

      const result = await progressService.getProgressStatistics();

      expect(result.totalUsers).toBe(2);
      expect(result.averageStreak).toBe(4); // (5 + 3) / 2
      expect(result.totalTipsCompleted).toBe(35); // 20 + 15
      expect(result.averageEngagementTime).toBe(35); // (40 + 30) / 2
    });

    it('should handle empty data gracefully', async () => {
      mockStorage.getData.mockResolvedValue({});

      const result = await progressService.getProgressStatistics();

      expect(result.totalUsers).toBe(0);
      expect(result.averageStreak).toBe(0);
      expect(result.totalTipsCompleted).toBe(0);
      expect(result.averageEngagementTime).toBe(0);
    });
  });

  describe('getCategoryProgress', () => {
    beforeEach(() => {
      mockStorage.getData.mockImplementation((key: string) => {
        if (key === 'CATEGORY_PROGRESS') {
          return Promise.resolve({
            [mockUserId]: {
              'nutrition': {
                category: 'nutrition',
                tipsCompleted: 5,
                totalTimeSpent: 15,
                averageRating: 4.2,
                lastActivity: new Date('2024-01-15'),
                level: 1,
                experiencePoints: 50,
                streakCount: 3,
                longestStreak: 5,
                completionRate: 0.5,
                engagementScore: 0.7,
                preferenceScore: 0.8,
                milestones: [],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-15')
              }
            }
          });
        }
        return Promise.resolve({});
      });
    });

    it('should return category progress for all categories', async () => {
      const result = await progressService.getCategoryProgress(mockUserId);

      expect(result).toHaveLength(7); // All health categories
      expect(result[0].category).toBeDefined();
      expect(result[0].tipsCompleted).toBeGreaterThanOrEqual(0);
      expect(result[0].engagementScore).toBeGreaterThanOrEqual(0);
    });

    it('should create initial progress for new categories', async () => {
      mockStorage.getData.mockResolvedValue({});

      const result = await progressService.getCategoryProgress(mockUserId);

      expect(result).toHaveLength(7);
      expect(result.every(cat => cat.tipsCompleted === 0)).toBe(true);
      expect(result.every(cat => cat.level === 1)).toBe(true);
    });

    it('should sort categories by engagement score', async () => {
      mockStorage.getData.mockResolvedValue({
        [mockUserId]: {
          'nutrition': { engagementScore: 0.8, category: 'nutrition' },
          'fitness': { engagementScore: 0.6, category: 'fitness' },
          'sleep': { engagementScore: 0.9, category: 'sleep' }
        }
      });

      const result = await progressService.getCategoryProgress(mockUserId);

      // Should be sorted by engagement score (highest first)
      expect(result[0].engagementScore).toBeGreaterThanOrEqual(result[1].engagementScore);
    });
  });

  describe('updateUserProgress with categories', () => {
    beforeEach(() => {
      const mockProgress: UserProgress = {
        id: 'progress-123',
        userId: mockUserId,
        currentStreak: 2,
        longestStreak: 5,
        totalTipsCompleted: 10,
        totalEngagementTime: 20,
        lastActivityDate: new Date(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      };

      mockStorage.getData.mockImplementation((key: string) => {
        if (key === 'USER_PROGRESS') {
          return Promise.resolve({ [mockUserId]: mockProgress });
        }
        if (key === 'CATEGORY_PROGRESS') {
          return Promise.resolve({
            [mockUserId]: {
              'nutrition': {
                category: 'nutrition',
                tipsCompleted: 3,
                totalTimeSpent: 9,
                averageRating: 4.0,
                lastActivity: new Date('2024-01-14'),
                level: 1,
                experiencePoints: 30,
                streakCount: 2,
                longestStreak: 3,
                completionRate: 0.3,
                engagementScore: 0.6,
                preferenceScore: 0.7,
                milestones: [],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-14')
              }
            }
          });
        }
        return Promise.resolve({});
      });
    });

    it('should update category progress when tip metadata is provided', async () => {
      await progressService.updateUserProgress(mockUserId, mockTipId, {
        category: 'nutrition',
        readingTime: 3,
        rating: 5
      });

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'CATEGORY_PROGRESS',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            'nutrition': expect.objectContaining({
              tipsCompleted: 4, // Incremented from 3
              totalTimeSpent: 12, // 9 + 3
              experiencePoints: 40 // 30 + 10
            })
          })
        })
      );
    });

    it('should update user progress without category when no metadata provided', async () => {
      await progressService.updateUserProgress(mockUserId, mockTipId);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'USER_PROGRESS',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            totalTipsCompleted: 11,
            totalEngagementTime: 22 // 20 + 2 (default)
          })
        })
      );
    });

    it('should handle category streaks correctly', async () => {
      // Set last activity to yesterday to trigger streak increment
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockStorage.getData.mockImplementation((key: string) => {
        if (key === 'CATEGORY_PROGRESS') {
          return Promise.resolve({
            [mockUserId]: {
              'fitness': {
                category: 'fitness',
                tipsCompleted: 5,
                lastActivity: yesterday,
                streakCount: 3,
                longestStreak: 4,
                // ... other fields
              }
            }
          });
        }
        return Promise.resolve({ [mockUserId]: mockProgress });
      });

      await progressService.updateUserProgress(mockUserId, mockTipId, {
        category: 'fitness',
        readingTime: 2
      });

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'CATEGORY_PROGRESS',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            'fitness': expect.objectContaining({
              streakCount: 4, // Incremented
              longestStreak: 4 // Updated
            })
          })
        })
      );
    });
  });

  describe('Category Milestones', () => {
    it('should complete milestones when targets are reached', async () => {
      mockStorage.getData.mockImplementation((key: string) => {
        if (key === 'CATEGORY_PROGRESS') {
          return Promise.resolve({
            [mockUserId]: {
              'sleep': {
                category: 'sleep',
                tipsCompleted: 0, // Will be incremented to 1
                milestones: [
                  {
                    id: 'sleep_first_tip',
                    title: 'First Step',
                    targetValue: 1,
                    currentValue: 0,
                    isCompleted: false
                  }
                ],
                // ... other fields
              }
            }
          });
        }
        return Promise.resolve({});
      });

      await progressService.updateUserProgress(mockUserId, mockTipId, {
        category: 'sleep',
        readingTime: 2
      });

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'CATEGORY_PROGRESS',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            'sleep': expect.objectContaining({
              milestones: expect.arrayContaining([
                expect.objectContaining({
                  id: 'sleep_first_tip',
                  isCompleted: true,
                  completedAt: expect.any(Date)
                })
              ])
            })
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.getData.mockRejectedValue(new Error('Storage error'));

      await expect(progressService.getUserProgress(mockUserId))
        .rejects.toThrow('Failed to get user progress');

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Error getting user progress',
        expect.objectContaining({
          userId: mockUserId
        })
      );
    });

    it('should handle AI service errors in insights', async () => {
      mockStorage.getData.mockResolvedValue({
        [mockUserId]: {
          id: 'progress-123',
          userId: mockUserId,
          currentStreak: 0,
          longestStreak: 0,
          totalTipsCompleted: 0,
          totalEngagementTime: 0,
          lastActivityDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      mockKiroAIService.getPersonalizedRecommendations.mockRejectedValue(
        new Error('Network error')
      );

      const result = await progressService.getProgressInsights(mockUserId);

      // Should still return fallback recommendations
      expect(result.length).toBeGreaterThan(0);
      expect(mockLoggingService.warning).toHaveBeenCalled();
    });

    it('should handle category progress errors gracefully', async () => {
      mockStorage.getData.mockRejectedValue(new Error('Storage error'));

      await expect(progressService.getCategoryProgress(mockUserId))
        .rejects.toThrow('Failed to get category progress');
    });
  });
});