import { streakCalculationService } from '../../../src/services/progress/streakCalculationService';
import { storage } from '../../../src/utils/storage';
import { cacheService } from '../../../src/services/cache/cacheService';
import { kiroAIService } from '../../../src/services/ai/kiroAIService';

// Mock dependencies
jest.mock('../../../src/utils/storage');
jest.mock('../../../src/services/cache/cacheService');
jest.mock('../../../src/services/ai/kiroAIService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockKiroAIService = kiroAIService as jest.Mocked<typeof kiroAIService>;

describe('StreakCalculationService', () => {
  const mockUserId = 'test-user-123';
  const mockEngagement = {
    tipId: 'tip-123',
    userId: mockUserId,
    action: 'view' as const,
    timestamp: new Date(),
  };
  const mockQuality = {
    readingTime: 180, // 3 minutes
    interactionCount: 5,
    completionRate: 1,
    retentionScore: 0.8,
    applicationAttempted: true,
    feedbackProvided: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockKiroAIService.generateInsights.mockResolvedValue({});
  });

  describe('calculateStreakMetrics', () => {
    it('should calculate streak metrics for new user', async () => {
      const result = await streakCalculationService.calculateStreakMetrics(
        mockUserId,
        'daily',
        mockEngagement,
        mockQuality,
      );

      expect(result).toMatchObject({
        userId: mockUserId,
        streakType: 'daily',
        currentCount: 1,
        longestCount: 1,
        isActive: true,
        freezeCount: 0,
      });

      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.streakHistory).toHaveLength(1);
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should update existing streak data', async () => {
      const existingStreakData = {
        id: `streak_${mockUserId}_daily`,
        userId: mockUserId,
        streakType: 'daily' as const,
        currentCount: 5,
        longestCount: 10,
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isActive: true,
        freezeCount: 0,
        streakHistory: [
          {
            date: new Date(Date.now() - 24 * 60 * 60 * 1000),
            engaged: true,
            engagementScore: 0.8,
            tipIds: ['tip-prev'],
            totalTimeSpent: 120,
            qualityMetrics: {
              readingTime: 120,
              interactionCount: 3,
              completionRate: 1,
              retentionScore: 0.8,
              applicationAttempted: true,
              feedbackProvided: false,
            },
          },
        ],
        qualityScore: 0.7,
        consistencyScore: 0.6,
        metadata: {
          averageEngagementTime: 120,
          preferredEngagementTime: '09:00',
          categoryDistribution: {},
          difficultyDistribution: {},
          seasonalPatterns: [],
        },
      };

      mockStorage.getItem.mockResolvedValue(JSON.stringify(existingStreakData));

      const result = await streakCalculationService.calculateStreakMetrics(
        mockUserId,
        'daily',
        mockEngagement,
        mockQuality,
      );

      expect(result.currentCount).toBe(6); // Incremented from 5
      expect(result.streakHistory).toHaveLength(2);
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should handle quality score calculation correctly', async () => {
      const highQualityEngagement = {
        readingTime: 300, // 5 minutes
        interactionCount: 10,
        completionRate: 1,
        retentionScore: 0.9,
        applicationAttempted: true,
        feedbackProvided: true,
      };

      const result = await streakCalculationService.calculateStreakMetrics(
        mockUserId,
        'daily',
        mockEngagement,
        highQualityEngagement,
      );

      expect(result.qualityScore).toBeGreaterThan(0.8);
    });

    it('should handle low quality engagement', async () => {
      const lowQualityEngagement = {
        readingTime: 30, // 30 seconds
        interactionCount: 1,
        completionRate: 0.5,
        retentionScore: 0.3,
        applicationAttempted: false,
        feedbackProvided: false,
      };

      const result = await streakCalculationService.calculateStreakMetrics(
        mockUserId,
        'daily',
        mockEngagement,
        lowQualityEngagement,
      );

      expect(result.qualityScore).toBeLessThan(0.5);
    });

    it('should handle errors gracefully', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        streakCalculationService.calculateStreakMetrics(
          mockUserId,
          'daily',
          mockEngagement,
          mockQuality,
        ),
      ).rejects.toThrow('Failed to calculate streak metrics');
    });
  });

  describe('predictStreakContinuation', () => {
    const mockStreakData = {
      id: `streak_${mockUserId}_daily`,
      userId: mockUserId,
      streakType: 'daily' as const,
      currentCount: 10,
      longestCount: 15,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      isActive: true,
      freezeCount: 1,
      streakHistory: Array(14)
        .fill(null)
        .map((_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          engaged: Math.random() > 0.2, // 80% engagement rate
          engagementScore: 0.7 + Math.random() * 0.3,
          tipIds: [`tip-${i}`],
          totalTimeSpent: 120 + Math.random() * 60,
          qualityMetrics: {
            readingTime: 120,
            interactionCount: 3,
            completionRate: 1,
            retentionScore: 0.8,
            applicationAttempted: true,
            feedbackProvided: false,
          },
        })),
      qualityScore: 0.8,
      consistencyScore: 0.75,
      metadata: {
        averageEngagementTime: 150,
        preferredEngagementTime: '09:00',
        categoryDistribution: {},
        difficultyDistribution: {},
        seasonalPatterns: [],
      },
    };

    beforeEach(() => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify(mockStreakData));
    });

    it('should predict streak continuation with high probability for consistent user', async () => {
      const result = await streakCalculationService.predictStreakContinuation(
        mockUserId,
        'daily',
      );

      expect(result.probability).toBeGreaterThan(0.6);
      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.optimalEngagementTime).toBe('09:00');
    });

    it('should identify risk factors for inconsistent streaks', async () => {
      const inconsistentStreakData = {
        ...mockStreakData,
        qualityScore: 0.3,
        consistencyScore: 0.4,
        freezeCount: 3,
      };
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify(inconsistentStreakData),
      );

      const result = await streakCalculationService.predictStreakContinuation(
        mockUserId,
        'daily',
      );

      expect(result.probability).toBeLessThan(0.6);
      expect(result.riskFactors).toContain('Low engagement quality');
      expect(result.riskFactors).toContain('Inconsistent timing');
      expect(result.riskFactors).toContain('Frequent streak freezes used');
    });

    it('should provide relevant recommendations', async () => {
      const result = await streakCalculationService.predictStreakContinuation(
        mockUserId,
        'daily',
      );

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle missing streak data', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const result = await streakCalculationService.predictStreakContinuation(
        mockUserId,
        'daily',
      );

      expect(result.probability).toBe(0);
      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('calculateStreakRecovery', () => {
    it('should allow recovery within grace period', async () => {
      const recentStreakData = {
        id: `streak_${mockUserId}_daily`,
        userId: mockUserId,
        streakType: 'daily' as const,
        currentCount: 0,
        longestCount: 15,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        isActive: false,
        freezeCount: 1,
        streakHistory: [],
        qualityScore: 0.7,
        consistencyScore: 0.6,
        metadata: {
          averageEngagementTime: 120,
          preferredEngagementTime: '09:00',
          categoryDistribution: {},
          difficultyDistribution: {},
          seasonalPatterns: [],
        },
      };

      mockStorage.getItem.mockResolvedValue(JSON.stringify(recentStreakData));

      const result = await streakCalculationService.calculateStreakRecovery(
        mockUserId,
        'daily',
      );

      expect(result.canRecover).toBe(true);
      expect(result.recoveryPlan).toBeInstanceOf(Array);
      expect(result.recoveryPlan.length).toBeGreaterThan(0);
      expect(result.motivationalMessage).toBeTruthy();
      expect(result.incentives).toBeInstanceOf(Array);
    });

    it('should not allow recovery after grace period', async () => {
      const oldStreakData = {
        id: `streak_${mockUserId}_daily`,
        userId: mockUserId,
        streakType: 'daily' as const,
        currentCount: 0,
        longestCount: 15,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastActivityDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        isActive: false,
        freezeCount: 1,
        streakHistory: [],
        qualityScore: 0.7,
        consistencyScore: 0.6,
        metadata: {
          averageEngagementTime: 120,
          preferredEngagementTime: '09:00',
          categoryDistribution: {},
          difficultyDistribution: {},
          seasonalPatterns: [],
        },
      };

      mockStorage.getItem.mockResolvedValue(JSON.stringify(oldStreakData));

      const result = await streakCalculationService.calculateStreakRecovery(
        mockUserId,
        'daily',
      );

      expect(result.canRecover).toBe(false);
      expect(result.recoveryPlan).toContain('Start a new streak today!');
      expect(result.motivationalMessage).toContain('fresh start');
    });

    it('should not allow recovery with too many freezes used', async () => {
      const overFrozenStreakData = {
        id: `streak_${mockUserId}_daily`,
        userId: mockUserId,
        streakType: 'daily' as const,
        currentCount: 0,
        longestCount: 15,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isActive: false,
        freezeCount: 5, // Too many freezes
        streakHistory: [],
        qualityScore: 0.7,
        consistencyScore: 0.6,
        metadata: {
          averageEngagementTime: 120,
          preferredEngagementTime: '09:00',
          categoryDistribution: {},
          difficultyDistribution: {},
          seasonalPatterns: [],
        },
      };

      mockStorage.getItem.mockResolvedValue(
        JSON.stringify(overFrozenStreakData),
      );

      const result = await streakCalculationService.calculateStreakRecovery(
        mockUserId,
        'daily',
      );

      expect(result.canRecover).toBe(false);
    });
  });

  describe('analyzeStreakPatterns', () => {
    const mockStreakDataWithHistory = {
      id: `streak_${mockUserId}_daily`,
      userId: mockUserId,
      streakType: 'daily' as const,
      currentCount: 10,
      longestCount: 15,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      isActive: true,
      freezeCount: 1,
      streakHistory: [
        // Monday engagement
        {
          date: new Date('2024-01-01T09:00:00Z'),
          engaged: true,
          engagementScore: 0.8,
          tipIds: ['tip-1'],
          totalTimeSpent: 120,
          qualityMetrics: mockQuality,
        },
        // Tuesday engagement
        {
          date: new Date('2024-01-02T09:30:00Z'),
          engaged: true,
          engagementScore: 0.7,
          tipIds: ['tip-2'],
          totalTimeSpent: 150,
          qualityMetrics: mockQuality,
        },
        // Wednesday engagement
        {
          date: new Date('2024-01-03T09:15:00Z'),
          engaged: true,
          engagementScore: 0.9,
          tipIds: ['tip-3'],
          totalTimeSpent: 180,
          qualityMetrics: mockQuality,
        },
      ],
      qualityScore: 0.8,
      consistencyScore: 0.75,
      metadata: {
        averageEngagementTime: 150,
        preferredEngagementTime: '09:00',
        categoryDistribution: {},
        difficultyDistribution: {},
        seasonalPatterns: [],
      },
    };

    beforeEach(() => {
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify(mockStreakDataWithHistory),
      );
    });

    it('should analyze weekly and daily patterns', async () => {
      const result = await streakCalculationService.analyzeStreakPatterns(
        mockStreakDataWithHistory,
      );

      expect(result.weeklyPattern).toBeInstanceOf(Array);
      expect(result.weeklyPattern).toHaveLength(7);
      expect(result.dailyPattern).toBeInstanceOf(Array);
      expect(result.dailyPattern).toHaveLength(24);
      expect(result.seasonalTrends).toBeInstanceOf(Array);
      expect(result.categoryPreferences).toBeInstanceOf(Object);
      expect(result.optimalConditions).toBeInstanceOf(Array);
    });

    it('should identify optimal engagement conditions', async () => {
      const result = await streakCalculationService.analyzeStreakPatterns(
        mockStreakDataWithHistory,
      );

      expect(result.optimalConditions).toContain(
        expect.stringContaining('Best time: 9:00'),
      );
    });
  });

  describe('calculateAdvancedStats', () => {
    const mockStreakDataWithVariedHistory = {
      id: `streak_${mockUserId}_daily`,
      userId: mockUserId,
      streakType: 'daily' as const,
      currentCount: 10,
      longestCount: 15,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      isActive: true,
      freezeCount: 1,
      streakHistory: Array(30)
        .fill(null)
        .map((_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          engaged: i % 3 !== 0, // Varied engagement pattern
          engagementScore: 0.5 + Math.random() * 0.5,
          tipIds: [`tip-${i}`],
          totalTimeSpent: 90 + Math.random() * 120,
          qualityMetrics: mockQuality,
        })),
      qualityScore: 0.7,
      consistencyScore: 0.6,
      metadata: {
        averageEngagementTime: 150,
        preferredEngagementTime: '09:00',
        categoryDistribution: {},
        difficultyDistribution: {},
        seasonalPatterns: [],
      },
    };

    beforeEach(() => {
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify(mockStreakDataWithVariedHistory),
      );
    });

    it('should calculate comprehensive streak statistics', async () => {
      const result = await streakCalculationService.calculateAdvancedStats(
        mockUserId,
        'daily',
      );

      expect(result.averageStreakLength).toBeGreaterThan(0);
      expect(result.streakStability).toBeGreaterThanOrEqual(0);
      expect(result.streakStability).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'declining']).toContain(
        result.qualityTrend,
      );
      expect(result.consistencyRating).toBeGreaterThanOrEqual(0);
      expect(result.consistencyRating).toBeLessThanOrEqual(100);
      expect(result.strengthScore).toBeGreaterThanOrEqual(0);
      expect(result.strengthScore).toBeLessThanOrEqual(100);
    });

    it('should handle streak data with no history', async () => {
      const emptyStreakData = {
        ...mockStreakDataWithVariedHistory,
        streakHistory: [],
      };
      mockStorage.getItem.mockResolvedValue(JSON.stringify(emptyStreakData));

      const result = await streakCalculationService.calculateAdvancedStats(
        mockUserId,
        'daily',
      );

      expect(result.averageStreakLength).toBe(0);
      expect(result.streakStability).toBe(1); // Perfect stability with no variance
      expect(result.qualityTrend).toBe('stable');
    });
  });

  describe('AI Integration', () => {
    it('should use AI for streak analysis when available', async () => {
      mockKiroAIService.generateInsights.mockResolvedValue({
        seasonalPatterns: [
          {
            period: 'weekly' as const,
            pattern: [0.8, 0.9, 0.7, 0.8, 0.6, 0.5, 0.4],
            confidence: 0.8,
            lastUpdated: new Date(),
          },
        ],
      });

      const result = await streakCalculationService.calculateStreakMetrics(
        mockUserId,
        'daily',
        mockEngagement,
        mockQuality,
      );

      expect(mockKiroAIService.generateInsights).toHaveBeenCalled();
      expect(result.metadata.seasonalPatterns).toHaveLength(1);
    });

    it('should handle AI service failures gracefully', async () => {
      mockKiroAIService.generateInsights.mockRejectedValue(
        new Error('AI service error'),
      );

      const result = await streakCalculationService.calculateStreakMetrics(
        mockUserId,
        'daily',
        mockEngagement,
        mockQuality,
      );

      // Should still complete successfully without AI insights
      expect(result.userId).toBe(mockUserId);
      expect(result.qualityScore).toBeGreaterThan(0);
    });
  });
});
