/**
 * AI Personalization Service Tests
 * Unit tests for AI personalization logic and fallback mechanisms
 */

import { aiPersonalizationService } from '../aiPersonalizationService';
import { kiroAIService } from '../kiroAIService';
import { healthTipService } from '../../content/healthTipService';
import { storage } from '../../../utils/storage';
import { cacheService } from '../../cache/cacheService';
import { HealthTipCategory, DifficultyLevel } from '../../../models/HealthTip';

// Mock dependencies
jest.mock('../kiroAIService');
jest.mock('../../content/healthTipService');
jest.mock('../../../utils/storage');
jest.mock('../../cache/cacheService');
jest.mock('../../analytics/analyticsService');

const mockKiroAIService = kiroAIService as jest.Mocked<typeof kiroAIService>;
const mockHealthTipService = healthTipService as jest.Mocked<typeof healthTipService>;
const mockStorage = storage as jest.Mocked<typeof storage>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('AIPersonalizationService', () => {
  const mockUserId = 'user_123';
  const mockTip = {
    id: 'tip_1',
    title: 'Test Health Tip',
    content: 'This is a test health tip content.',
    category: HealthTipCategory.NUTRITION,
    difficulty: DifficultyLevel.BEGINNER,
    estimatedReadTime: 5,
    tags: ['test', 'nutrition'],
    author: 'Test Author',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    priority: 5,
    metadata: {
      views: 10,
      likes: 5,
      bookmarks: 2,
      completions: 3,
      shares: 1,
      averageRating: 4.5,
      ratingCount: 4,
      engagementScore: 25
    }
  };

  const mockUserPersonalizationData = {
    userId: mockUserId,
    profile: {
      age: 30,
      gender: 'male',
      healthGoals: ['fitness', 'nutrition'],
      interests: ['workout', 'healthy eating'],
      fitnessLevel: 'intermediate' as const,
      preferredContentTypes: ['tips', 'articles'],
      timePreferences: ['morning', 'evening']
    },
    interactions: [
      {
        userId: mockUserId,
        tipId: 'tip_1',
        interactionType: 'like' as const,
        timestamp: new Date(),
        metadata: {}
      }
    ],
    preferences: {
      categories: {
        [HealthTipCategory.NUTRITION]: 0.8,
        [HealthTipCategory.FITNESS]: 0.7,
        [HealthTipCategory.MENTAL_WELLNESS]: 0.5,
        [HealthTipCategory.SLEEP]: 0.4,
        [HealthTipCategory.RECOVERY]: 0.3,
        [HealthTipCategory.HYGIENE]: 0.2,
        [HealthTipCategory.GENERAL]: 0.5
      },
      difficulty: 'adaptive' as const,
      contentLength: 'mixed' as const,
      visualContent: true,
      interactiveContent: true,
      notificationFrequency: 'medium' as const
    },
    behaviorPatterns: [
      {
        pattern: 'morning_engagement',
        frequency: 5,
        confidence: 0.8,
        context: 'time_based',
        lastObserved: new Date()
      }
    ],
    lastUpdated: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.getAdvanced.mockResolvedValue(null);
    mockCacheService.setAdvanced.mockResolvedValue(undefined);
    mockCacheService.invalidatePattern.mockResolvedValue(undefined);
    mockStorage.getData.mockResolvedValue({});
    mockStorage.storeData.mockResolvedValue(undefined);
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return AI recommendations when service is available and user has enough interactions', async () => {
      // Setup mocks
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      const mockAIResponse = {
        recommendations: [
          {
            tipId: 'tip_1',
            score: 0.9,
            confidence: 0.8,
            reasoning: ['High nutrition preference', 'Morning engagement pattern']
          },
          {
            tipId: 'tip_2',
            score: 0.7,
            confidence: 0.7,
            reasoning: ['Fitness interest match']
          }
        ]
      };

      mockKiroAIService.getPersonalizedRecommendations.mockResolvedValueOnce(mockAIResponse);
      mockHealthTipService.getHealthTipById.mockResolvedValue(mockTip);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(result).toHaveLength(2);
      expect(result[0].tipId).toBe('tip_1');
      expect(result[0].score).toBe(0.9);
      expect(result[0].confidence).toBe(0.8);
      expect(result[0].reasoning).toContain('High nutrition preference');
      expect(mockKiroAIService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          userProfile: mockUserPersonalizationData.profile,
          preferences: mockUserPersonalizationData.preferences
        }),
        10
      );
    });

    it('should use fallback recommendations when user has insufficient interactions', async () => {
      const userDataWithFewInteractions = {
        ...mockUserPersonalizationData,
        interactions: [] // No interactions
      };

      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: userDataWithFewInteractions
      });

      mockHealthTipService.getTrendingTips.mockResolvedValueOnce([mockTip]);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(result).toHaveLength(1);
      expect(result[0].tipId).toBe(mockTip.id);
      expect(result[0].confidence).toBe(0.5); // Fallback confidence
      expect(mockKiroAIService.getPersonalizedRecommendations).not.toHaveBeenCalled();
      expect(mockHealthTipService.getTrendingTips).toHaveBeenCalled();
    });

    it('should filter out low-confidence AI recommendations', async () => {
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      const mockAIResponse = {
        recommendations: [
          {
            tipId: 'tip_1',
            score: 0.9,
            confidence: 0.8, // Above threshold
            reasoning: ['High confidence recommendation']
          },
          {
            tipId: 'tip_2',
            score: 0.7,
            confidence: 0.3, // Below threshold (0.6)
            reasoning: ['Low confidence recommendation']
          }
        ]
      };

      mockKiroAIService.getPersonalizedRecommendations.mockResolvedValueOnce(mockAIResponse);
      mockHealthTipService.getHealthTipById.mockResolvedValue(mockTip);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(result).toHaveLength(1);
      expect(result[0].tipId).toBe('tip_1');
      expect(result[0].confidence).toBe(0.8);
    });

    it('should supplement with fallback when not enough confident recommendations', async () => {
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      const mockAIResponse = {
        recommendations: [
          {
            tipId: 'tip_1',
            score: 0.9,
            confidence: 0.8,
            reasoning: ['High confidence recommendation']
          }
        ]
      };

      mockKiroAIService.getPersonalizedRecommendations.mockResolvedValueOnce(mockAIResponse);
      mockHealthTipService.getHealthTipById.mockResolvedValue(mockTip);
      mockHealthTipService.getTrendingTips.mockResolvedValueOnce([
        { ...mockTip, id: 'tip_2' },
        { ...mockTip, id: 'tip_3' }
      ]);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 3);

      expect(result).toHaveLength(3);
      expect(result[0].confidence).toBe(0.8); // AI recommendation
      expect(result[1].confidence).toBe(0.5); // Fallback recommendation
      expect(result[2].confidence).toBe(0.5); // Fallback recommendation
    });

    it('should use cached recommendations when available', async () => {
      const cachedRecommendations = [
        {
          tipId: 'tip_1',
          score: 0.9,
          confidence: 0.8,
          reasoning: ['Cached recommendation'],
          category: HealthTipCategory.NUTRITION,
          personalizedRank: 1
        }
      ];

      mockCacheService.getAdvanced.mockResolvedValueOnce(cachedRecommendations);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(result).toEqual(cachedRecommendations);
      expect(mockStorage.getData).not.toHaveBeenCalled();
      expect(mockKiroAIService.getPersonalizedRecommendations).not.toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      mockKiroAIService.getPersonalizedRecommendations.mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      mockHealthTipService.getTrendingTips.mockResolvedValueOnce([mockTip]);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.5); // Fallback confidence
      expect(result[0].reasoning).toContain('General recommendation');
    });
  });

  describe('learnFromInteraction', () => {
    const mockInteraction = {
      userId: mockUserId,
      tipId: 'tip_1',
      interactionType: 'like' as const,
      timestamp: new Date(),
      metadata: { category: HealthTipCategory.NUTRITION }
    };

    it('should update user preferences based on interaction', async () => {
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      mockHealthTipService.getHealthTipById.mockResolvedValueOnce(mockTip);

      await aiPersonalizationService.learnFromInteraction(mockInteraction);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'USER_PERSONALIZATION_DATA',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            interactions: expect.arrayContaining([mockInteraction])
          })
        })
      );
    });

    it('should update behavior patterns when user has enough interactions', async () => {
      const userDataWithManyInteractions = {
        ...mockUserPersonalizationData,
        interactions: new Array(10).fill(mockInteraction) // 10 interactions
      };

      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: userDataWithManyInteractions
      });

      mockHealthTipService.getHealthTipById.mockResolvedValueOnce(mockTip);

      const mockPatternResponse = {
        patterns: [
          {
            description: 'Likes nutrition content in the morning',
            frequency: 5,
            confidence: 0.8,
            context: 'time_category'
          }
        ]
      };

      mockKiroAIService.identifyBehaviorPatterns.mockResolvedValueOnce(mockPatternResponse);

      await aiPersonalizationService.learnFromInteraction(mockInteraction);

      expect(mockKiroAIService.identifyBehaviorPatterns).toHaveBeenCalled();
      expect(mockStorage.storeData).toHaveBeenCalled();
    });

    it('should limit interaction history to 1000 items', async () => {
      const userDataWithManyInteractions = {
        ...mockUserPersonalizationData,
        interactions: new Array(1001).fill(mockInteraction)
      };

      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: userDataWithManyInteractions
      });

      mockHealthTipService.getHealthTipById.mockResolvedValueOnce(mockTip);

      await aiPersonalizationService.learnFromInteraction(mockInteraction);

      const savedData = mockStorage.storeData.mock.calls[0][1];
      expect(savedData[mockUserId].interactions).toHaveLength(1000);
    });

    it('should handle duplicate processing prevention', async () => {
      mockStorage.getData.mockResolvedValue({
        [mockUserId]: mockUserPersonalizationData
      });

      mockHealthTipService.getHealthTipById.mockResolvedValue(mockTip);

      // Call twice with same interaction
      const promise1 = aiPersonalizationService.learnFromInteraction(mockInteraction);
      const promise2 = aiPersonalizationService.learnFromInteraction(mockInteraction);

      await Promise.all([promise1, promise2]);

      // Should only process once
      expect(mockStorage.storeData).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences and invalidate caches', async () => {
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      const newPreferences = {
        difficulty: DifficultyLevel.ADVANCED,
        contentLength: 'short' as const
      };

      await aiPersonalizationService.updateUserPreferences(mockUserId, newPreferences);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'USER_PERSONALIZATION_DATA',
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            preferences: expect.objectContaining(newPreferences)
          })
        })
      );

      expect(mockCacheService.invalidatePattern).toHaveBeenCalled();
    });
  });

  describe('getPersonalizationInsights', () => {
    it('should return comprehensive personalization insights', async () => {
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      const insights = await aiPersonalizationService.getPersonalizationInsights(mockUserId);

      expect(insights).toHaveProperty('dataQuality');
      expect(insights).toHaveProperty('topCategories');
      expect(insights).toHaveProperty('behaviorPatterns');
      expect(insights).toHaveProperty('recommendationAccuracy');
      expect(insights).toHaveProperty('learningProgress');

      expect(insights.dataQuality).toBeGreaterThan(0);
      expect(insights.topCategories).toHaveLength(5);
      expect(insights.topCategories[0].category).toBe(HealthTipCategory.NUTRITION);
      expect(insights.behaviorPatterns).toHaveLength(1);
    });

    it('should calculate data quality correctly', async () => {
      const completeUserData = {
        ...mockUserPersonalizationData,
        interactions: new Array(50).fill(mockInteraction), // Good interaction count
        behaviorPatterns: new Array(5).fill(mockUserPersonalizationData.behaviorPatterns[0])
      };

      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: completeUserData
      });

      const insights = await aiPersonalizationService.getPersonalizationInsights(mockUserId);

      expect(insights.dataQuality).toBeGreaterThan(0.8); // Should be high quality
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.getData.mockRejectedValueOnce(new Error('Storage error'));

      await expect(
        aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10)
      ).rejects.toThrow('Failed to get personalized recommendations');
    });

    it('should handle AI service errors and use fallback', async () => {
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      mockKiroAIService.getPersonalizedRecommendations.mockRejectedValueOnce(
        new Error('AI service error')
      );

      mockHealthTipService.getTrendingTips.mockResolvedValueOnce([mockTip]);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(result).toHaveLength(1);
      expect(result[0].reasoning).toContain('General recommendation');
    });

    it('should handle cache errors gracefully', async () => {
      mockCacheService.getAdvanced.mockRejectedValueOnce(new Error('Cache error'));
      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      mockKiroAIService.getPersonalizedRecommendations.mockResolvedValueOnce({
        recommendations: [{
          tipId: 'tip_1',
          score: 0.9,
          confidence: 0.8,
          reasoning: ['Test']
        }]
      });

      mockHealthTipService.getHealthTipById.mockResolvedValueOnce(mockTip);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(result).toHaveLength(1);
      expect(result[0].tipId).toBe('tip_1');
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        enableAI: false,
        minInteractionsForAI: 10
      };

      aiPersonalizationService.updateConfig(newConfig);
      const config = aiPersonalizationService.getConfig();

      expect(config.enableAI).toBe(false);
      expect(config.minInteractionsForAI).toBe(10);
    });

    it('should respect AI disabled configuration', async () => {
      aiPersonalizationService.updateConfig({ enableAI: false });

      mockStorage.getData.mockResolvedValueOnce({
        [mockUserId]: mockUserPersonalizationData
      });

      mockHealthTipService.getTrendingTips.mockResolvedValueOnce([mockTip]);

      const result = await aiPersonalizationService.getPersonalizedRecommendations(mockUserId, 10);

      expect(mockKiroAIService.getPersonalizedRecommendations).not.toHaveBeenCalled();
      expect(result[0].reasoning).toContain('General recommendation');

      // Reset config
      aiPersonalizationService.updateConfig({ enableAI: true });
    });
  });
});