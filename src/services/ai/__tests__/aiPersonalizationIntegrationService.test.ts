/**
 * AI Personalization Integration Service Tests
 * Tests for KIRO AI integration and personalization logic
 */
import { aiPersonalizationIntegrationService } from '../aiPersonalizationIntegrationService';
import { userPreferencesService } from '../../preferences/userPreferencesService';
import { healthTipService } from '../../content/healthTipService';
import { engagementTrackingService } from '../engagementTrackingService';
import { aiPersonalizationService } from '../aiPersonalizationService';
import { analyticsService } from '../../analytics/analyticsService';

// Mock dependencies
jest.mock('../../preferences/userPreferencesService');
jest.mock('../../content/healthTipService');
jest.mock('../engagementTrackingService');
jest.mock('../aiPersonalizationService');
jest.mock('../../analytics/analyticsService');

const mockUserPreferencesService = userPreferencesService as jest.Mocked<typeof userPreferencesService>;
const mockHealthTipService = healthTipService as jest.Mocked<typeof healthTipService>;
const mockEngagementTrackingService = engagementTrackingService as jest.Mocked<typeof engagementTrackingService>;
const mockAIPersonalizationService = aiPersonalizationService as jest.Mocked<typeof aiPersonalizationService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('AIPersonalizationIntegrationService', () => {
  const mockUserId = 'user_123';
  const mockUserPreferences = {
    content: {
      personalizedContent: true,
      aiRecommendations: true,
      categories: {
        nutrition: true,
        fitness: true,
        mentalWellness: false,
        sleep: true,
        recovery: false,
        hygiene: true
      },
      difficulty: 'intermediate'
    }
  };

  const mockEngagementHistory = {
    viewedTips: ['tip1', 'tip2', 'tip3'],
    likedTips: ['tip1', 'tip3'],
    completedTips: ['tip1'],
    bookmarkedTips: ['tip2'],
    skipCount: 1,
    averageEngagementTime: 45
  };

  const mockHealthTips = [
    { id: 'tip1', title: 'Nutrition Tip', category: 'nutrition', difficulty: 'intermediate' },
    { id: 'tip2', title: 'Fitness Tip', category: 'fitness', difficulty: 'intermediate' },
    { id: 'tip3', title: 'Sleep Tip', category: 'sleep', difficulty: 'beginner' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUserPreferencesService.getUserPreferences.mockResolvedValue(mockUserPreferences as any);
    mockUserPreferencesService.getContentFilter.mockResolvedValue({
      categories: ['nutrition', 'fitness', 'sleep'],
      difficulty: 'intermediate',
      personalizedContent: true,
      aiRecommendations: true
    });
    
    mockEngagementTrackingService.getUserEngagementHistory.mockResolvedValue(mockEngagementHistory);
    mockHealthTipService.getTipsByFilters.mockResolvedValue(mockHealthTips as any);
    mockHealthTipService.getTipById.mockImplementation((id) => 
      Promise.resolve(mockHealthTips.find(tip => tip.id === id) as any)
    );
  });

  describe('getPersonalizedTips', () => {
    it('should return AI-personalized tips when AI is available and user opts in', async () => {
      const mockAIResponse = {
        recommendedTipIds: ['tip1', 'tip2'],
        confidence: 0.85,
        reasoning: ['User prefers nutrition tips', 'High engagement with fitness content'],
        version: 'kiro_ai_v1.2'
      };

      mockAIPersonalizationService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: 'v1.2',
        capabilities: ['personalization', 'recommendations']
      });
      
      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue(mockAIResponse);

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.fallbackUsed).toBe(false);
      expect(result.confidence).toBe(0.85);
      expect(result.tips).toHaveLength(2);
      expect(result.reasoning).toEqual(mockAIResponse.reasoning);
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('personalization_success', expect.any(Object));
    });

    it('should use fallback when AI confidence is below threshold', async () => {
      const mockAIResponse = {
        recommendedTipIds: ['tip1'],
        confidence: 0.4, // Below default threshold of 0.6
        reasoning: ['Limited user data'],
        version: 'kiro_ai_v1.2'
      };

      mockAIPersonalizationService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: 'v1.2',
        capabilities: ['personalization']
      });
      
      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue(mockAIResponse);

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.fallbackUsed).toBe(true);
      expect(result.reasoning).toContain('Fallback used: low_confidence');
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('personalization_fallback', expect.any(Object));
    });

    it('should use fallback when user disables AI recommendations', async () => {
      const disabledAIPreferences = {
        ...mockUserPreferences,
        content: {
          ...mockUserPreferences.content,
          aiRecommendations: false
        }
      };

      mockUserPreferencesService.getUserPreferences.mockResolvedValue(disabledAIPreferences as any);

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.fallbackUsed).toBe(true);
      expect(result.reasoning).toContain('Fallback used: ai_disabled');
      expect(mockAIPersonalizationService.getPersonalizedRecommendations).not.toHaveBeenCalled();
    });

    it('should use fallback when user disables personalized content', async () => {
      const disabledPersonalizationPreferences = {
        ...mockUserPreferences,
        content: {
          ...mockUserPreferences.content,
          personalizedContent: false
        }
      };

      mockUserPreferencesService.getUserPreferences.mockResolvedValue(disabledPersonalizationPreferences as any);

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.fallbackUsed).toBe(true);
      expect(result.reasoning).toContain('Fallback used: ai_disabled');
    });

    it('should use fallback when AI service fails', async () => {
      mockAIPersonalizationService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: 'v1.2',
        capabilities: ['personalization']
      });
      
      mockAIPersonalizationService.getPersonalizedRecommendations.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.fallbackUsed).toBe(true);
      expect(result.reasoning).toContain('Fallback used: ai_error');
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('personalization_fallback', expect.any(Object));
    });

    it('should handle empty AI response gracefully', async () => {
      const emptyAIResponse = {
        recommendedTipIds: [],
        confidence: 0.7,
        reasoning: ['No suitable tips found'],
        version: 'kiro_ai_v1.2'
      };

      mockAIPersonalizationService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: 'v1.2',
        capabilities: ['personalization']
      });
      
      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue(emptyAIResponse);

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.tips).toHaveLength(0);
      expect(result.confidence).toBe(0.7);
      expect(result.fallbackUsed).toBe(false);
    });
  });

  describe('updatePersonalizationFromEngagement', () => {
    it('should record engagement and update AI model', async () => {
      const engagementData = {
        timeSpent: 60,
        rating: 5,
        feedback: 'Very helpful tip!'
      };

      await aiPersonalizationIntegrationService.updatePersonalizationFromEngagement(
        mockUserId,
        'tip1',
        'like',
        engagementData
      );

      expect(mockEngagementTrackingService.recordEngagement).toHaveBeenCalledWith(
        mockUserId,
        'tip1',
        'like',
        engagementData
      );

      expect(mockAIPersonalizationService.updateUserModel).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          tipId: 'tip1',
          engagementType: 'like',
          timeSpent: 60,
          rating: 5,
          feedback: 'Very helpful tip!',
          timestamp: expect.any(Date)
        })
      );

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'personalization_learning',
        expect.objectContaining({
          userId: mockUserId,
          tipId: 'tip1',
          engagementType: 'like',
          hasRating: true,
          hasFeedback: true
        })
      );
    });

    it('should handle engagement tracking failures gracefully', async () => {
      mockEngagementTrackingService.recordEngagement.mockRejectedValue(
        new Error('Engagement tracking failed')
      );

      // Should not throw
      await expect(
        aiPersonalizationIntegrationService.updatePersonalizationFromEngagement(
          mockUserId,
          'tip1',
          'view'
        )
      ).resolves.not.toThrow();
    });

    it('should skip learning when disabled in configuration', async () => {
      aiPersonalizationIntegrationService.updateConfiguration({
        learningEnabled: false
      });

      await aiPersonalizationIntegrationService.updatePersonalizationFromEngagement(
        mockUserId,
        'tip1',
        'like'
      );

      expect(mockEngagementTrackingService.recordEngagement).not.toHaveBeenCalled();
      expect(mockAIPersonalizationService.updateUserModel).not.toHaveBeenCalled();

      // Reset configuration
      aiPersonalizationIntegrationService.updateConfiguration({
        learningEnabled: true
      });
    });
  });

  describe('getPersonalizationInsights', () => {
    beforeEach(() => {
      mockEngagementTrackingService.getUserEngagementStats.mockResolvedValue({
        overallScore: 0.75,
        totalViews: 50,
        totalLikes: 20,
        totalCompletions: 15,
        averageTimeSpent: 45
      });
    });

    it('should return comprehensive personalization insights', async () => {
      const insights = await aiPersonalizationIntegrationService.getPersonalizationInsights(mockUserId);

      expect(insights).toEqual({
        profileCompleteness: expect.any(Number),
        engagementScore: 0.75,
        preferredCategories: expect.any(Array),
        recommendedImprovements: expect.any(Array),
        personalizationAccuracy: expect.any(Number)
      });

      expect(insights.profileCompleteness).toBeGreaterThanOrEqual(0);
      expect(insights.profileCompleteness).toBeLessThanOrEqual(1);
    });

    it('should return default insights on error', async () => {
      mockUserPreferencesService.getUserPreferences.mockRejectedValue(
        new Error('Service unavailable')
      );

      const insights = await aiPersonalizationIntegrationService.getPersonalizationInsights(mockUserId);

      expect(insights).toEqual({
        profileCompleteness: 0,
        engagementScore: 0,
        preferredCategories: [],
        recommendedImprovements: [],
        personalizationAccuracy: 0
      });
    });
  });

  describe('checkAIServiceHealth', () => {
    it('should return healthy status when AI service is available', async () => {
      mockAIPersonalizationService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: 'v1.2.3',
        capabilities: ['personalization', 'recommendations', 'learning']
      });

      const health = await aiPersonalizationIntegrationService.checkAIServiceHealth();

      expect(health).toEqual({
        available: true,
        responseTime: expect.any(Number),
        version: 'v1.2.3',
        capabilities: ['personalization', 'recommendations', 'learning']
      });

      expect(health.responseTime).toBeGreaterThan(0);
    });

    it('should return unhealthy status when AI service fails', async () => {
      mockAIPersonalizationService.healthCheck.mockRejectedValue(
        new Error('Service unavailable')
      );

      const health = await aiPersonalizationIntegrationService.checkAIServiceHealth();

      expect(health).toEqual({
        available: false,
        responseTime: -1,
        version: 'unknown',
        capabilities: []
      });
    });

    it('should handle partial health check responses', async () => {
      mockAIPersonalizationService.healthCheck.mockResolvedValue({
        status: 'healthy'
        // Missing version and capabilities
      });

      const health = await aiPersonalizationIntegrationService.checkAIServiceHealth();

      expect(health.available).toBe(true);
      expect(health.version).toBe('unknown');
      expect(health.capabilities).toEqual([]);
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxTipsPerRequest: 15,
        minConfidenceThreshold: 0.7,
        fallbackEnabled: false
      };

      aiPersonalizationIntegrationService.updateConfiguration(newConfig);

      // Test that configuration is applied by checking behavior
      // This would require exposing configuration or testing behavior changes
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing user preferences gracefully', async () => {
      mockUserPreferencesService.getUserPreferences.mockRejectedValue(
        new Error('User not found')
      );

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.fallbackUsed).toBe(true);
      expect(result.tips).toBeDefined();
    });

    it('should handle empty engagement history', async () => {
      const emptyEngagementHistory = {
        viewedTips: [],
        likedTips: [],
        completedTips: [],
        bookmarkedTips: [],
        skipCount: 0,
        averageEngagementTime: 0
      };

      mockEngagementTrackingService.getUserEngagementHistory.mockResolvedValue(emptyEngagementHistory);

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      // Should still work, possibly with fallback
      expect(result.tips).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      mockAIPersonalizationService.getPersonalizedRecommendations.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(result.fallbackUsed).toBe(true);
      expect(result.reasoning).toContain('Fallback used: ai_error');
    });
  });

  describe('analytics and tracking', () => {
    it('should track personalization events correctly', async () => {
      const mockAIResponse = {
        recommendedTipIds: ['tip1', 'tip2'],
        confidence: 0.85,
        reasoning: ['User preferences match'],
        version: 'kiro_ai_v1.2'
      };

      mockAIPersonalizationService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: 'v1.2',
        capabilities: ['personalization']
      });
      
      mockAIPersonalizationService.getPersonalizedRecommendations.mockResolvedValue(mockAIResponse);

      await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'personalization_success',
        expect.objectContaining({
          userId: mockUserId,
          confidence: 0.85,
          tipCount: 2,
          version: 'kiro_ai_v1.2'
        })
      );
    });

    it('should track fallback usage with reasons', async () => {
      mockAIPersonalizationService.getPersonalizedRecommendations.mockRejectedValue(
        new Error('AI service error')
      );

      await aiPersonalizationIntegrationService.getPersonalizedTips(mockUserId, 3);

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'personalization_fallback',
        expect.objectContaining({
          userId: mockUserId,
          reason: 'ai_error',
          tipCount: expect.any(Number)
        })
      );
    });
  });
});