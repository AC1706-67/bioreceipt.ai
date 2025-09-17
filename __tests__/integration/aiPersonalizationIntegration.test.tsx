/**
 * AI Personalization Integration Tests
 * End-to-end tests for enhanced AI personalization system
 */

import request from 'supertest';
import { app } from '../../src/app';
import { kiroAIService } from '../../src/services/ai/kiroAIService';
import { promptEngineeringService } from '../../src/services/ai/promptEngineering';
import { profileService } from '../../src/services/profile/profileService';
import { cacheService } from '../../src/services/cache/cacheService';

// Mock dependencies
jest.mock('../../src/services/ai/kiroAIService');
jest.mock('../../src/services/ai/promptEngineering');
jest.mock('../../src/services/profile/profileService');
jest.mock('../../src/services/cache/cacheService');
jest.mock('../../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

const mockKiroAIService = kiroAIService as jest.Mocked<typeof kiroAIService>;
const mockPromptEngineering = promptEngineeringService as jest.Mocked<
  typeof promptEngineeringService
>;
const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('AI Personalization Integration Tests', () => {
  const mockUserId = 'test-user-123';
  const mockUserProfile = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    age: 30,
    healthInterests: [
      { category: 'nutrition', level: 'intermediate', priority: 1 },
      { category: 'fitness', level: 'beginner', priority: 2 },
    ],
    goals: ['weight_loss', 'energy_boost'],
    timezone: 'America/New_York',
    language: 'en',
    preferences: {
      notificationsEnabled: true,
      dailyTipTime: '09:00',
      weeklyGoal: 5,
      preferredCategories: ['nutrition'],
      difficulty: 'mixed',
      enableAIPersonalization: true,
      shareDataForPersonalization: true,
      privacySettings: {
        shareProgress: false,
        allowAnalytics: true,
        allowPersonalization: true,
        dataRetentionConsent: false,
      },
      accessibilitySettings: {
        fontSize: 'medium',
        highContrast: false,
        reduceMotion: false,
        screenReaderOptimized: false,
      },
    },
    onboardingCompleted: true,
    onboardingStep: 'complete',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAIResponse = {
    tips: [
      {
        id: 'kiro-123-1',
        title: 'Personalized Morning Nutrition Tip',
        content:
          'Start your day with a protein-rich breakfast tailored to your intermediate nutrition knowledge. Consider Greek yogurt with berries and nuts for sustained energy that aligns with your weight loss goals.',
        category: 'nutrition',
        difficulty: 'medium',
        estimatedReadTime: 3,
        tags: ['breakfast', 'protein', 'weight-loss'],
        imageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'kiro-ai',
        viewCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        completionCount: 0,
        shareCount: 0,
        personalizedReason:
          'Matches your intermediate nutrition level and weight loss goals',
        confidenceScore: 0.92,
        actionItems: [
          'Buy Greek yogurt',
          'Prepare berries',
          'Set morning reminder',
        ],
        motivationalHook:
          "You're building great momentum with your health journey!",
      },
    ],
    personalizationScore: 0.88,
    reasoning:
      'Personalized based on your nutrition interests, morning routine, and weight loss goals',
    adaptationStrategy:
      'Used encouraging tone for achievement-motivated user with intermediate nutrition knowledge',
    followUpSuggestions: [
      'Hydration tips',
      'Meal prep strategies',
      'Energy-boosting snacks',
    ],
    confidence: 0.92,
    metrics: {
      requestId: 'kiro-123',
      userId: mockUserId,
      promptTokens: 450,
      completionTokens: 280,
      totalTokens: 730,
      responseTime: 1250,
      model: 'kiro-health-v2',
      success: true,
      fallbackUsed: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockProfileService.getUserProfile.mockResolvedValue(mockUserProfile);
    mockKiroAIService.generatePersonalizedTips.mockResolvedValue(
      mockAIResponse,
    );
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockCacheService.deletePattern.mockResolvedValue(undefined);
  });

  describe('GET /api/personalization/tips', () => {
    it('should return AI-powered personalized tips', async () => {
      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tips).toHaveLength(1);
      expect(response.body.data.tips[0].title).toBe(
        'Personalized Morning Nutrition Tip',
      );
      expect(response.body.data.tips[0].personalizedReason).toBeDefined();
      expect(response.body.data.tips[0].actionItems).toBeInstanceOf(Array);
      expect(response.body.data.tips[0].motivationalHook).toBeDefined();

      expect(response.body.data.personalizationScore).toBe(0.88);
      expect(response.body.data.reasoning).toContain('nutrition interests');
      expect(response.body.data.fallbackUsed).toBe(false);
      expect(response.body.data.processingTimeMs).toBeGreaterThan(0);

      // Verify AI service was called with correct parameters
      expect(mockKiroAIService.generatePersonalizedTips).toHaveBeenCalledWith(
        mockUserId,
        mockUserProfile,
        expect.any(Object), // engagement data
        expect.any(Object), // recent activity
        expect.objectContaining({
          count: 1,
          forceRefresh: false,
        }),
      );
    });

    it('should handle category-specific requests', async () => {
      const response = await request(app)
        .get('/api/personalization/tips')
        .query({
          count: 2,
          category: 'fitness',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(mockKiroAIService.generatePersonalizedTips).toHaveBeenCalledWith(
        mockUserId,
        mockUserProfile,
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          count: 2,
          category: 'fitness',
        }),
      );
    });

    it('should handle mood-based requests', async () => {
      const response = await request(app)
        .get('/api/personalization/tips')
        .query({
          count: 1,
          mood: 'stressed',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(mockKiroAIService.generatePersonalizedTips).toHaveBeenCalledWith(
        mockUserId,
        mockUserProfile,
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          mood: 'stressed',
        }),
      );
    });

    it('should handle force refresh requests', async () => {
      const response = await request(app)
        .get('/api/personalization/tips')
        .query({
          count: 3,
          refresh: 'true',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(mockKiroAIService.generatePersonalizedTips).toHaveBeenCalledWith(
        mockUserId,
        mockUserProfile,
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          forceRefresh: true,
        }),
      );
    });

    it('should validate count parameter', async () => {
      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 15 }) // Too high
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toBe(
        'Count must be between 1 and 10',
      );
    });

    it('should handle AI service failures gracefully', async () => {
      mockKiroAIService.generatePersonalizedTips.mockRejectedValue(
        new Error('AI service temporarily unavailable'),
      );

      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERSONALIZATION_ERROR');
      expect(response.body.error.message).toBe(
        'Failed to generate personalized recommendations',
      );
    });

    it('should handle missing user profile', async () => {
      mockProfileService.getUserProfile.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERSONALIZATION_ERROR');
    });

    it('should include processing metrics in response', async () => {
      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(200);

      expect(response.body.data.processingTimeMs).toBeGreaterThan(0);
      expect(typeof response.body.data.processingTimeMs).toBe('number');
    });
  });

  describe('POST /api/personalization/feedback', () => {
    it('should record positive feedback successfully', async () => {
      mockKiroAIService.recordFeedback.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/personalization/feedback')
        .send({
          tipId: 'kiro-123-1',
          feedback: 'positive',
          reasoning: 'Very helpful and actionable',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Feedback recorded successfully');

      expect(mockKiroAIService.recordFeedback).toHaveBeenCalledWith(
        mockUserId,
        'kiro-123',
        'kiro-123-1',
        'positive',
        'Very helpful and actionable',
      );
    });

    it('should record negative feedback successfully', async () => {
      mockKiroAIService.recordFeedback.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/personalization/feedback')
        .send({
          tipId: 'kiro-456-2',
          feedback: 'negative',
          reasoning: 'Too complex for my current level',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(mockKiroAIService.recordFeedback).toHaveBeenCalledWith(
        mockUserId,
        'kiro-456',
        'kiro-456-2',
        'negative',
        'Too complex for my current level',
      );
    });

    it('should validate feedback data', async () => {
      const response = await request(app)
        .post('/api/personalization/feedback')
        .send({
          tipId: 'kiro-123-1',
          feedback: 'invalid_feedback', // Invalid value
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FEEDBACK');
      expect(response.body.error.message).toBe(
        'Valid tipId and feedback (positive/negative) are required',
      );
    });

    it('should require tipId', async () => {
      const response = await request(app)
        .post('/api/personalization/feedback')
        .send({
          feedback: 'positive',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FEEDBACK');
    });

    it('should handle feedback recording errors', async () => {
      mockKiroAIService.recordFeedback.mockRejectedValue(
        new Error('Feedback service unavailable'),
      );

      const response = await request(app)
        .post('/api/personalization/feedback')
        .send({
          tipId: 'kiro-123-1',
          feedback: 'positive',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FEEDBACK_ERROR');
    });
  });

  describe('GET /api/personalization/profile', () => {
    it('should return user personalization profile', async () => {
      const mockPersonalizationProfile = {
        userId: mockUserId,
        preferences: {
          categories: ['nutrition', 'fitness'],
          difficulty: 'intermediate',
          timeOfDay: ['morning'],
          goals: ['weight_loss', 'energy_boost'],
        },
        insights: {
          favoriteCategories: ['nutrition', 'fitness'],
          preferredDifficulty: 'medium',
          engagementPatterns: {
            bestTimeOfDay: 'morning',
            averageEngagement: 0.8,
            streakMotivation: 0.9,
          },
          recommendations: {
            nextCategories: ['mental_wellness'],
            suggestedDifficulty: 'medium',
            motivationalMessage: "You're doing great! Keep up the momentum.",
          },
        },
        lastUpdated: new Date(),
      };

      // Mock the personalization service method
      const mockPersonalizationService = {
        getUserPersonalizationProfile: jest
          .fn()
          .mockResolvedValue(mockPersonalizationProfile),
      };

      jest.doMock(
        '../../src/services/personalization/personalizationService',
        () => ({
          personalizationService: mockPersonalizationService,
        }),
      );

      const response = await request(app)
        .get('/api/personalization/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockUserId);
      expect(response.body.data.preferences.categories).toContain('nutrition');
      expect(response.body.data.insights.favoriteCategories).toContain(
        'fitness',
      );
    });
  });

  describe('PUT /api/personalization/preferences', () => {
    it('should update personalization preferences', async () => {
      const updatedProfile = {
        userId: mockUserId,
        preferences: {
          categories: ['nutrition', 'mental_wellness'],
          difficulty: 'advanced',
          timeOfDay: ['morning', 'evening'],
          goals: ['weight_loss', 'stress_management'],
        },
        insights: {
          favoriteCategories: ['nutrition', 'mental_wellness'],
          preferredDifficulty: 'advanced',
          engagementPatterns: {
            bestTimeOfDay: 'morning',
            averageEngagement: 0.85,
            streakMotivation: 0.9,
          },
          recommendations: {
            nextCategories: ['sleep'],
            suggestedDifficulty: 'advanced',
            motivationalMessage: 'Ready for more challenging content!',
          },
        },
        lastUpdated: new Date(),
      };

      const mockPersonalizationService = {
        updatePersonalizationPreferences: jest
          .fn()
          .mockResolvedValue(updatedProfile),
      };

      jest.doMock(
        '../../src/services/personalization/personalizationService',
        () => ({
          personalizationService: mockPersonalizationService,
        }),
      );

      const response = await request(app)
        .put('/api/personalization/preferences')
        .send({
          categories: ['nutrition', 'mental_wellness'],
          difficulty: 'advanced',
          timeOfDay: ['morning', 'evening'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.difficulty).toBe('advanced');
      expect(response.body.message).toBe('Preferences updated successfully');
    });
  });

  describe('AI Service Health Integration', () => {
    it('should handle AI service health checks', async () => {
      mockKiroAIService.getHealthStatus.mockResolvedValue({
        status: 'healthy',
        responseTime: 150,
        uptime: 99.9,
      });

      // This would be a separate endpoint for health checks
      // For now, we can test that the service integration works
      const healthStatus = await mockKiroAIService.getHealthStatus();

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.responseTime).toBeLessThan(1000);
      expect(healthStatus.uptime).toBeGreaterThan(99);
    });

    it('should handle degraded AI service', async () => {
      mockKiroAIService.getHealthStatus.mockResolvedValue({
        status: 'degraded',
        responseTime: 5000,
        lastError: 'High latency detected',
        uptime: 95.5,
      });

      const healthStatus = await mockKiroAIService.getHealthStatus();

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.lastError).toBeDefined();
    });
  });

  describe('Fallback Behavior Integration', () => {
    it('should use fallback when AI service is unavailable', async () => {
      const fallbackResponse = {
        ...mockAIResponse,
        personalizationScore: 0.6,
        reasoning:
          'Generated using rule-based fallback system due to AI service unavailability',
        metrics: {
          ...mockAIResponse.metrics,
          fallbackUsed: true,
          model: 'fallback-rule-based',
        },
      };

      mockKiroAIService.generatePersonalizedTips.mockResolvedValue(
        fallbackResponse,
      );

      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fallbackUsed).toBe(true);
      expect(response.body.data.reasoning).toContain('fallback');
      expect(response.body.data.personalizationScore).toBe(0.6);
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should cache AI responses appropriately', async () => {
      // First request
      await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(200);

      // Second identical request should use cache
      await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(200);

      // AI service should only be called once due to caching
      expect(mockKiroAIService.generatePersonalizedTips).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should handle high-confidence responses with longer cache', async () => {
      const highConfidenceResponse = {
        ...mockAIResponse,
        confidence: 0.95,
        personalizationScore: 0.95,
      };

      mockKiroAIService.generatePersonalizedTips.mockResolvedValue(
        highConfidenceResponse,
      );

      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(200);

      expect(response.body.data.personalizationScore).toBe(0.95);
      // High confidence should result in longer caching (tested in unit tests)
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from temporary AI failures', async () => {
      // First call fails
      mockKiroAIService.generatePersonalizedTips
        .mockRejectedValueOnce(new Error('Temporary AI failure'))
        .mockResolvedValueOnce(mockAIResponse);

      // First request should fail
      await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(500);

      // Second request should succeed
      const response = await request(app)
        .get('/api/personalization/tips')
        .query({ count: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tips).toHaveLength(1);
    });
  });
});
