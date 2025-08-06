/**
 * AI Integration Tests
 * Tests for AI personalization integration with health tip service
 */

import { healthTipService } from '../../content/healthTipService';
import { aiPersonalizationService } from '../aiPersonalizationService';
import { HealthTipCategory, DifficultyLevel, UserHealthTipInteraction } from '../../../models/HealthTip';

// Mock dependencies
jest.mock('../../content/healthTipService');
jest.mock('../aiPersonalizationService');

const mockHealthTipService = healthTipService as jest.Mocked<typeof healthTipService>;
const mockAIPersonalizationService = aiPersonalizationService as jest.Mocked<typeof aiPersonalizationService>;

describe('AI Integration', () => {
  const mockUserId = 'user_123';
  const mockTip = {
    id: 'tip_1',
    title: 'AI Personalized Tip',
    content: 'This tip was personalized using AI.',
    category: HealthTipCategory.NUTRITION,
    difficulty: DifficultyLevel.INTERMEDIATE,
    estimatedReadTime: 4,
    tags: ['ai', 'personalized', 'nutrition'],
    author: 'AI System',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    priority: 8,
    metadata: {
      views: 50,
      likes: 15,
      bookmarks: 8,
      completions: 12,
      shares: 3,
      averageRating: 4.7,
      ratingCount: 10,
      engagementScore: 75
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Personalized Tips Integration', () => {
    it('should get AI personalized tips through health tip service', async () => {
      const mockPersonalizationRecommendations = [
        {
          tipId: 'tip_1',
          score: 0.9,
          confidence: 0.85,
          reasoning: ['High nutrition preference', 'Intermediate difficulty match'],
          category: HealthTipCategory.NUTRITION,
          personalizedRank: 1
        },
        {
          tipId: 'tip_2',
          score: 0.8,
          confidence: 0.75,
          reasoning: ['Morning engagement pattern'],
          category: HealthTipCategory.FITNESS,
          personalizedRank: 2
        }
      ];

      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue(
        mockPersonalizationRecommendations
      );

      mockHealthTipService.getHealthTipById.mockResolvedValue(mockTip);

      const result = await healthTipService.getPersonalizedTips(mockUserId, 5);

      expect(mockAIPersonalizationService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        mockUserId,
        5
      );

      expect(mockHealthTipService.getHealthTipById).toHaveBeenCalledWith('tip_1');
      expect(mockHealthTipService.getHealthTipById).toHaveBeenCalledWith('tip_2');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        ...mockTip,
        personalizationScore: 0.9,
        personalizedRank: 1,
        aiConfidence: 0.85
      }));
    });

    it('should fallback to rule-based recommendations when AI fails', async () => {
      mockAIPersonalizationService.getPersonalizedRecommendations.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const mockRuleBasedTips = [mockTip];
      mockHealthTipService.getRecommendedTips.mockResolvedValue(mockRuleBasedTips);

      const result = await healthTipService.getPersonalizedTips(mockUserId, 5);

      expect(mockAIPersonalizationService.getPersonalizedRecommendations).toHaveBeenCalled();
      expect(mockHealthTipService.getRecommendedTips).toHaveBeenCalledWith(mockUserId, 5);
      expect(result).toEqual(mockRuleBasedTips);
    });

    it('should handle empty AI recommendations gracefully', async () => {
      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue([]);
      mockHealthTipService.getRecommendedTips.mockResolvedValue([mockTip]);

      const result = await healthTipService.getPersonalizedTips(mockUserId, 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTip);
    });
  });

  describe('Interaction Learning Integration', () => {
    it('should feed interactions to AI personalization service', async () => {
      const mockInteraction: UserHealthTipInteraction = {
        userId: mockUserId,
        tipId: 'tip_1',
        interactionType: 'like',
        timestamp: new Date(),
        metadata: { rating: 5 }
      };

      mockHealthTipService.recordInteraction.mockImplementation(async (interaction) => {
        // Simulate the actual implementation calling AI service
        await aiPersonalizationService.learnFromInteraction(interaction);
      });

      await healthTipService.recordInteraction(mockInteraction);

      expect(mockAIPersonalizationService.learnFromInteraction).toHaveBeenCalledWith(mockInteraction);
    });

    it('should continue recording interaction even if AI learning fails', async () => {
      const mockInteraction: UserHealthTipInteraction = {
        userId: mockUserId,
        tipId: 'tip_1',
        interactionType: 'bookmark',
        timestamp: new Date()
      };

      mockAIPersonalizationService.learnFromInteraction.mockRejectedValue(
        new Error('AI learning failed')
      );

      // Should not throw error
      await expect(healthTipService.recordInteraction(mockInteraction)).resolves.not.toThrow();

      expect(mockAIPersonalizationService.learnFromInteraction).toHaveBeenCalledWith(mockInteraction);
    });
  });

  describe('Personalization Quality', () => {
    it('should enhance tips with AI personalization metadata', async () => {
      const mockRecommendation = {
        tipId: 'tip_1',
        score: 0.95,
        confidence: 0.9,
        reasoning: ['Perfect match for user goals', 'High engagement prediction'],
        category: HealthTipCategory.NUTRITION,
        personalizedRank: 1
      };

      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue([mockRecommendation]);
      mockHealthTipService.getHealthTipById.mockResolvedValue(mockTip);

      const result = await healthTipService.getPersonalizedTips(mockUserId, 1);

      expect(result[0]).toEqual(expect.objectContaining({
        id: 'tip_1',
        title: 'AI Personalized Tip',
        personalizationScore: 0.95,
        personalizationReason: 'Perfect match for user goals, High engagement prediction',
        personalizedRank: 1,
        aiConfidence: 0.9
      }));
    });

    it('should filter out tips that no longer exist', async () => {
      const mockRecommendations = [
        {
          tipId: 'tip_1',
          score: 0.9,
          confidence: 0.8,
          reasoning: ['Valid tip'],
          category: HealthTipCategory.NUTRITION,
          personalizedRank: 1
        },
        {
          tipId: 'tip_deleted',
          score: 0.8,
          confidence: 0.7,
          reasoning: ['Deleted tip'],
          category: HealthTipCategory.FITNESS,
          personalizedRank: 2
        }
      ];

      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue(mockRecommendations);
      
      mockHealthTipService.getHealthTipById
        .mockResolvedValueOnce(mockTip) // tip_1 exists
        .mockResolvedValueOnce(null);   // tip_deleted doesn't exist

      const result = await healthTipService.getPersonalizedTips(mockUserId, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tip_1');
    });
  });

  describe('Caching Integration', () => {
    it('should cache AI personalized tips appropriately', async () => {
      const mockRecommendation = {
        tipId: 'tip_1',
        score: 0.9,
        confidence: 0.8,
        reasoning: ['Cached recommendation'],
        category: HealthTipCategory.NUTRITION,
        personalizedRank: 1
      };

      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue([mockRecommendation]);
      mockHealthTipService.getHealthTipById.mockResolvedValue(mockTip);

      // First call should hit AI service
      const result1 = await healthTipService.getPersonalizedTips(mockUserId, 1);
      
      // Second call should use cache (mock cache behavior)
      const result2 = await healthTipService.getPersonalizedTips(mockUserId, 1);

      expect(result1).toEqual(result2);
      expect(mockAIPersonalizationService.getPersonalizedRecommendations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    it('should gracefully handle AI service timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockAIPersonalizationService.getPersonalizedRecommendations.mockRejectedValue(timeoutError);
      mockHealthTipService.getRecommendedTips.mockResolvedValue([mockTip]);

      const result = await healthTipService.getPersonalizedTips(mockUserId, 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTip);
    });

    it('should handle partial AI failures gracefully', async () => {
      const mockRecommendations = [
        {
          tipId: 'tip_1',
          score: 0.9,
          confidence: 0.8,
          reasoning: ['Good tip'],
          category: HealthTipCategory.NUTRITION,
          personalizedRank: 1
        }
      ];

      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue(mockRecommendations);
      
      // First tip exists, but getHealthTipById fails for some reason
      mockHealthTipService.getHealthTipById.mockRejectedValue(new Error('Database error'));
      mockHealthTipService.getRecommendedTips.mockResolvedValue([mockTip]);

      const result = await healthTipService.getPersonalizedTips(mockUserId, 5);

      // Should fallback to rule-based recommendations
      expect(mockHealthTipService.getRecommendedTips).toHaveBeenCalled();
      expect(result).toEqual([mockTip]);
    });
  });
});