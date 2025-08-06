/**
 * KIRO AI Service Tests
 * Tests for enhanced AI integration and prompt engineering
 */

import { kiroAIService } from '../../../src/services/ai/kiroAIService';
import { promptEngineeringService } from '../../../src/services/ai/promptEngineering';
import { cacheService } from '../../../src/services/cache/cacheService';
import { loggingService } from '../../../src/services/logging/loggingService';
import { tokenManager } from '../../../src/utils/tokenManager';
import { UserProfile } from '../../../src/types/userProfile';

// Mock dependencies
jest.mock('../../../src/services/cache/cacheService');
jest.mock('../../../src/services/logging/loggingService');
jest.mock('../../../src/utils/tokenManager');
jest.mock('../../../src/services/ai/promptEngineering');

// Mock fetch
global.fetch = jest.fn();

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
const mockPromptEngineering = promptEngineeringService as jest.Mocked<typeof promptEngineeringService>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('KiroAIService', () => {
  const mockUserId = 'test-user-123';
  const mockProfile: UserProfile = {
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

  const mockEngagementData = {
    totalInteractions: 45,
    completionRate: 0.75,
    favoriteCategories: ['nutrition', 'fitness'],
    preferredDifficulty: 'medium',
    averageReadTime: 4,
    engagementScore: 0.8,
    lastActiveDate: new Date(),
    streakHistory: [3, 5, 7, 12, 8],
    currentStreak: 8,
  };

  const mockRecentActivity = {
    lastTipsViewed: ['tip_1', 'tip_2', 'tip_3'],
    recentCompletions: ['tip_1', 'tip_4'],
    recentLikes: ['tip_2', 'tip_5'],
    recentBookmarks: ['tip_3'],
    searchQueries: ['healthy breakfast', 'quick workout'],
    feedbackGiven: [
      { tipId: 'tip_1', feedback: 'positive', reason: 'Very helpful' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockLoggingService.logInfo.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockLoggingService.logWarning.mockResolvedValue(undefined);
    mockTokenManager.getToken.mockResolvedValue('mock-token');

    // Setup prompt engineering mocks
    mockPromptEngineering.buildUserContext.mockResolvedValue({
      profile: mockProfile,
      engagementHistory: {
        totalInteractions: 45,
        completionRate: 0.75,
        favoriteCategories: ['nutrition', 'fitness'],
        preferredDifficulty: 'medium',
        averageReadTime: 4,
        engagementScore: 0.8,
        lastActiveDate: new Date(),
        streakHistory: [3, 5, 7, 12, 8],
      },
      currentStreak: 8,
      timeContext: {
        currentTime: new Date(),
        timeOfDay: 'morning',
        dayOfWeek: 'Monday',
        isWeekend: false,
        timezone: 'America/New_York',
        seasonalContext: 'spring',
      },
      recentActivity: mockRecentActivity,
      personalityInsights: {
        motivationStyle: 'achievement',
        communicationPreference: 'encouraging',
        challengeLevel: 'moderate_challenge',
        learningStyle: 'practical',
        consistencyPattern: 'steady',
      },
      contentPreferences: {
        preferredLength: 'moderate',
        topicDepth: 'moderate',
        actionOrientation: 'immediate',
        evidencePreference: 'mixed',
        tonePreference: 'motivational',
      },
    });

    mockPromptEngineering.generatePersonalizationPrompt.mockReturnValue({
      systemPrompt: 'You are KIRO, an AI health coach...',
      userPrompt: 'Generate personalized health tips...',
      constraints: ['Must be actionable', 'Appropriate for skill level'],
      outputFormat: { tips: [] },
      examples: [],
    });

    mockPromptEngineering.validatePrompt.mockReturnValue({
      isValid: true,
      score: 0.9,
      issues: [],
      suggestions: [],
    });
  });

  describe('generatePersonalizedTips', () => {
    it('should generate personalized tips successfully', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                tips: [
                  {
                    title: 'Start Your Day with Protein',
                    content: 'Begin your morning with a protein-rich breakfast...',
                    category: 'nutrition',
                    difficulty: 'easy',
                    estimatedReadTime: 3,
                    tags: ['breakfast', 'protein'],
                    personalizedReason: 'Perfect for your nutrition goals',
                    confidenceScore: 0.9,
                    actionItems: ['Choose protein source', 'Prepare ingredients'],
                    motivationalHook: 'Great job on your 8-day streak!',
                  },
                ],
                personalizationScore: 0.85,
                reasoning: 'Matched to your nutrition interests and morning routine',
                adaptationStrategy: 'Used encouraging tone for achievement motivation',
                followUpSuggestions: ['Hydration tips', 'Meal prep strategies'],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 300,
          total_tokens: 800,
        },
        model: 'kiro-health-v2',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIResponse),
      } as Response);

      const result = await kiroAIService.generatePersonalizedTips(
        mockUserId,
        mockProfile,
        mockEngagementData,
        mockRecentActivity,
        { count: 1 }
      );

      expect(result.tips).toHaveLength(1);
      expect(result.tips[0].title).toBe('Start Your Day with Protein');
      expect(result.personalizationScore).toBe(0.85);
      expect(result.confidence).toBe(0.9);
      expect(result.metrics.success).toBe(true);
      expect(result.metrics.fallbackUsed).toBe(false);
      expect(result.metrics.totalTokens).toBe(800);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'X-User-ID': mockUserId,
          }),
        })
      );
    });

    it('should return cached response when available', async () => {
      const cachedResponse = {
        tips: [{ id: 'cached-tip', title: 'Cached Tip' }],
        personalizationScore: 0.8,
        reasoning: 'Cached response',
        confidence: 0.8,
        metrics: { fallbackUsed: false },
      };

      mockCacheService.get.mockResolvedValue(cachedResponse);

      const result = await kiroAIService.generatePersonalizedTips(
        mockUserId,
        mockProfile,
        mockEngagementData,
        mockRecentActivity,
        { count: 1 }
      );

      expect(result).toEqual(cachedResponse);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Returned cached AI response',
        expect.objectContaining({ cacheHit: true })
      );
    });

    it('should handle API errors with retry logic', async () => {
      // First two attempts fail
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout error'));

      // Third attempt succeeds
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                tips: [
                  {
                    title: 'Retry Success',
                    content: 'This worked after retries',
                    category: 'nutrition',
                    difficulty: 'easy',
                    estimatedReadTime: 2,
                    tags: ['retry'],
                    personalizedReason: 'Persistence pays off',
                    confidenceScore: 0.8,
                    actionItems: ['Keep trying'],
                    motivationalHook: 'Never give up!',
                  },
                ],
                personalizationScore: 0.8,
                reasoning: 'Success after retries',
                adaptationStrategy: 'Resilient approach',
                followUpSuggestions: ['Keep going'],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 400, completion_tokens: 200, total_tokens: 600 },
        model: 'kiro-health-v2',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIResponse),
      } as Response);

      const result = await kiroAIService.generatePersonalizedTips(
        mockUserId,
        mockProfile,
        mockEngagementData,
        mockRecentActivity,
        { count: 1 }
      );

      expect(result.tips[0].title).toBe('Retry Success');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockLoggingService.logWarning).toHaveBeenCalledTimes(2);
    });

    it('should use fallback when all AI attempts fail', async () => {
      // Mock all AI attempts to fail
      mockFetch.mockRejectedValue(new Error('AI service unavailable'));

      // Mock content service for fallback
      const mockContentService = {
        getHealthTips: jest.fn().mockResolvedValue([
          {
            id: 'fallback-tip',
            title: 'Fallback Tip',
            content: 'This is a fallback tip',
            category: 'nutrition',
            difficulty: 'easy',
            estimatedReadTime: 2,
            tags: ['fallback'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      };

      jest.doMock('../../../src/services/content/contentService', () => ({
        ContentService: {
          getInstance: () => mockContentService,
        },
      }));

      const result = await kiroAIService.generatePersonalizedTips(
        mockUserId,
        mockProfile,
        mockEngagementData,
        mockRecentActivity,
        { count: 1 }
      );

      expect(result.tips).toHaveLength(1);
      expect(result.personalizationScore).toBe(0.6);
      expect(result.metrics.fallbackUsed).toBe(true);
      expect(result.reasoning).toContain('fallback');
    });

    it('should handle invalid AI response format', async () => {
      const invalidResponse = {
        choices: [
          {
            message: {
              content: '{"invalid": "format"}', // Missing required fields
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse),
      } as Response);

      await expect(
        kiroAIService.generatePersonalizedTips(
          mockUserId,
          mockProfile,
          mockEngagementData,
          mockRecentActivity,
          { count: 1 }
        )
      ).rejects.toThrow('Invalid AI response: missing or invalid tips array');
    });

    it('should handle API timeout', async () => {
      // Mock a timeout scenario
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      // Mock the AbortError
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(
        kiroAIService.generatePersonalizedTips(
          mockUserId,
          mockProfile,
          mockEngagementData,
          mockRecentActivity,
          { count: 1 }
        )
      ).rejects.toThrow();

      expect(mockLoggingService.logWarning).toHaveBeenCalled();
    });

    it('should queue duplicate requests', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                tips: [
                  {
                    title: 'Queued Tip',
                    content: 'This tip was queued',
                    category: 'nutrition',
                    difficulty: 'easy',
                    estimatedReadTime: 2,
                    tags: ['queued'],
                    personalizedReason: 'Efficient queuing',
                    confidenceScore: 0.8,
                    actionItems: ['Be patient'],
                    motivationalHook: 'Good things come to those who wait',
                  },
                ],
                personalizationScore: 0.8,
                reasoning: 'Queued request handling',
                adaptationStrategy: 'Efficient processing',
                followUpSuggestions: ['More tips coming'],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 300, completion_tokens: 150, total_tokens: 450 },
        model: 'kiro-health-v2',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAIResponse),
      } as Response);

      // Make two identical requests simultaneously
      const options = { count: 1, category: 'nutrition' };
      const [result1, result2] = await Promise.all([
        kiroAIService.generatePersonalizedTips(
          mockUserId,
          mockProfile,
          mockEngagementData,
          mockRecentActivity,
          options
        ),
        kiroAIService.generatePersonalizedTips(
          mockUserId,
          mockProfile,
          mockEngagementData,
          mockRecentActivity,
          options
        ),
      ]);

      // Both should return the same result
      expect(result1).toEqual(result2);
      // But API should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordFeedback', () => {
    it('should record feedback successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await kiroAIService.recordFeedback(
        mockUserId,
        'request-123',
        'tip-456',
        'positive',
        'Very helpful tip'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/feedback'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'X-Request-ID': 'request-123',
          }),
          body: expect.stringContaining('"feedback":"positive"'),
        })
      );

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'AI feedback recorded',
        expect.objectContaining({
          userId: mockUserId,
          feedback: 'positive',
        })
      );
    });

    it('should handle feedback recording errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Feedback API error'));

      // Should not throw, but log warning
      await kiroAIService.recordFeedback(
        mockUserId,
        'request-123',
        'tip-456',
        'negative',
        'Not helpful'
      );

      expect(mockLoggingService.logWarning).toHaveBeenCalledWith(
        'Failed to record AI feedback',
        expect.objectContaining({
          error: 'Feedback API error',
        })
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when API is responsive', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uptime: 99.9 }),
      } as Response);

      const status = await kiroAIService.getHealthStatus();

      expect(status.status).toBe('healthy');
      expect(status.responseTime).toBeGreaterThan(0);
      expect(status.uptime).toBe(99.9);
    });

    it('should return degraded status for HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response);

      const status = await kiroAIService.getHealthStatus();

      expect(status.status).toBe('degraded');
      expect(status.lastError).toBe('HTTP 503');
    });

    it('should return unhealthy status for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await kiroAIService.getHealthStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.lastError).toBe('Network error');
    });
  });

  describe('caching behavior', () => {
    it('should cache responses with appropriate TTL', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                tips: [{ title: 'Test Tip', content: 'Test content' }],
                personalizationScore: 0.9,
                reasoning: 'High confidence',
              }),
            },
          },
        ],
        usage: { total_tokens: 500 },
        model: 'kiro-health-v2',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIResponse),
      } as Response);

      await kiroAIService.generatePersonalizedTips(
        mockUserId,
        mockProfile,
        mockEngagementData,
        mockRecentActivity,
        { count: 1 }
      );

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('ai-personalized-tips'),
        expect.any(Object),
        expect.any(Number) // TTL should be calculated based on confidence
      );
    });

    it('should adjust cache TTL based on confidence and time of day', async () => {
      // Mock morning time (should reduce cache time)
      const morningContext = {
        ...mockPromptEngineering.buildUserContext.mock.results[0].value,
        timeContext: {
          currentTime: new Date('2024-01-01T08:00:00Z'),
          timeOfDay: 'morning',
          dayOfWeek: 'Monday',
          isWeekend: false,
          timezone: 'America/New_York',
          seasonalContext: 'winter',
        },
      };

      mockPromptEngineering.buildUserContext.mockResolvedValueOnce(morningContext);

      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                tips: [{ title: 'Morning Tip', confidenceScore: 0.95 }],
                personalizationScore: 0.95,
              }),
            },
          },
        ],
        usage: { total_tokens: 400 },
        model: 'kiro-health-v2',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIResponse),
      } as Response);

      await kiroAIService.generatePersonalizedTips(
        mockUserId,
        mockProfile,
        mockEngagementData,
        mockRecentActivity,
        { count: 1 }
      );

      // Should cache with reduced TTL due to morning time
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Number)
      );
    });
  });
});