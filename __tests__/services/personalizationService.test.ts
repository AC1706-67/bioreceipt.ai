/**
 * Personalization Service Tests
 * Tests for AI-powered personalization functionality
 */

import { PersonalizationService } from '../../src/services/personalization/personalizationService';
import { CacheService } from '../../src/services/cache/cacheService';
import { loggingService } from '../../src/services/logging/loggingService';
import { tokenManager } from '../../src/utils/tokenManager';

// Mock dependencies
jest.mock('../../src/services/cache/cacheService');
jest.mock('../../src/services/logging/loggingService');
jest.mock('../../src/utils/tokenManager');

// Mock fetch
global.fetch = jest.fn();

const mockCacheService =
  CacheService.getInstance() as jest.Mocked<CacheService>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('PersonalizationService', () => {
  let personalizationService: PersonalizationService;

  beforeEach(() => {
    personalizationService = PersonalizationService.getInstance();
    jest.clearAllMocks();

    // Setup default mocks
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockCacheService.deletePattern.mockResolvedValue(undefined);
    mockLoggingService.logInfo.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockLoggingService.logWarning.mockResolvedValue(undefined);
    mockTokenManager.getToken.mockResolvedValue('test-token');
  });

  describe('getPersonalizedTips', () => {
    const mockUserId = 'test-user-123';
    const mockKiroResponse = {
      tips: [
        {
          title: 'Morning Hydration Boost',
          content:
            'Start your day with a glass of water with lemon to kickstart your metabolism and provide vitamin C.',
          category: 'nutrition',
          difficulty: 'easy',
          estimatedReadTime: 2,
          tags: ['hydration', 'morning', 'metabolism'],
          personalizedReason:
            'Perfect for your morning routine and nutrition goals',
        },
      ],
      personalizationScore: 0.85,
      reasoning:
        'Selected based on your nutrition interests and morning activity patterns',
    };

    it('should return cached personalized tips when available', async () => {
      const cachedResponse = {
        tips: [
          {
            id: 'cached-tip-1',
            title: 'Cached Tip',
            content: 'This is a cached tip',
            category: 'nutrition',
            difficulty: 'easy',
            estimatedReadTime: 2,
            tags: ['cached'],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'kiro-ai',
            viewCount: 0,
            likeCount: 0,
            completionCount: 0,
            shareCount: 0,
          },
        ],
        personalizationScore: 0.8,
        reasoning: 'Cached personalized tips',
        fallbackUsed: false,
      };

      mockCacheService.get.mockResolvedValue(cachedResponse);

      const result = await personalizationService.getPersonalizedTips(
        mockUserId,
        3,
        false,
      );

      expect(result).toEqual(cachedResponse);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `personalized-tips-${mockUserId}-3`,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call KIRO AI and return personalized tips', async () => {
      // Mock successful KIRO AI response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockKiroResponse),
              },
            },
          ],
        }),
      } as Response);

      const result = await personalizationService.getPersonalizedTips(
        mockUserId,
        3,
        true,
      );

      expect(result.tips).toHaveLength(1);
      expect(result.tips[0].title).toBe('Morning Hydration Boost');
      expect(result.personalizationScore).toBe(0.85);
      expect(result.reasoning).toBe(
        'Selected based on your nutrition interests and morning activity patterns',
      );
      expect(result.fallbackUsed).toBe(false);

      // Verify KIRO AI was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'X-User-ID': mockUserId,
          }),
          body: expect.stringContaining('kiro-health-v1'),
        }),
      );

      // Verify result was cached
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `personalized-tips-${mockUserId}-3`,
        expect.objectContaining({
          tips: expect.any(Array),
          personalizationScore: 0.85,
          fallbackUsed: false,
        }),
        1800,
      );
    });

    it('should use fallback when KIRO AI fails', async () => {
      // Mock KIRO AI failure
      mockFetch.mockRejectedValueOnce(new Error('KIRO AI service unavailable'));

      // Mock ContentService for fallback
      jest.doMock('../../src/services/content/contentService', () => ({
        ContentService: {
          getInstance: () => ({
            getHealthTips: jest.fn().mockResolvedValue([
              {
                id: 'fallback-tip-1',
                title: 'Fallback Tip',
                content: 'This is a fallback tip',
                category: 'nutrition',
                difficulty: 'easy',
                estimatedReadTime: 2,
                tags: ['fallback'],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
                viewCount: 0,
                likeCount: 0,
                completionCount: 0,
                shareCount: 0,
              },
            ]),
          }),
        },
      }));

      const result = await personalizationService.getPersonalizedTips(
        mockUserId,
        3,
        true,
      );

      expect(result.fallbackUsed).toBe(true);
      expect(result.personalizationScore).toBeLessThan(0.8);
      expect(mockLoggingService.logWarning).toHaveBeenCalledWith(
        'KIRO AI failed, using fallback',
        expect.objectContaining({
          userId: mockUserId,
          error: expect.any(Error),
        }),
      );
    });

    it('should return generic tips as ultimate fallback', async () => {
      // Mock KIRO AI failure
      mockFetch.mockRejectedValueOnce(new Error('KIRO AI service unavailable'));

      // Mock ContentService failure
      jest.doMock('../../src/services/content/contentService', () => ({
        ContentService: {
          getInstance: () => ({
            getHealthTips: jest
              .fn()
              .mockRejectedValue(new Error('Content service failed')),
          }),
        },
      }));

      const result = await personalizationService.getPersonalizedTips(
        mockUserId,
        3,
        true,
      );

      expect(result.fallbackUsed).toBe(true);
      expect(result.tips).toHaveLength(3);
      expect(result.tips[0].title).toBe('Stay Hydrated Throughout the Day');
      expect(result.personalizationScore).toBe(0.3);
      expect(result.reasoning).toBe(
        'Generic recommendations due to system limitations',
      );
    });

    it('should handle invalid KIRO AI responses gracefully', async () => {
      // Mock invalid KIRO AI response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Invalid JSON response',
              },
            },
          ],
        }),
      } as Response);

      const result = await personalizationService.getPersonalizedTips(
        mockUserId,
        3,
        true,
      );

      expect(result.fallbackUsed).toBe(true);
      expect(mockLoggingService.logWarning).toHaveBeenCalled();
    });
  });

  describe('recordPersonalizationFeedback', () => {
    const mockFeedback = {
      userId: 'test-user-123',
      tipId: 'test-tip-456',
      feedback: 'positive' as const,
      reasoning: 'Very helpful tip',
      timestamp: new Date(),
    };

    it('should record feedback successfully', async () => {
      // Mock successful KIRO feedback API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await personalizationService.recordPersonalizationFeedback(mockFeedback);

      // Verify feedback was cached
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^feedback-test-user-123-test-tip-456-\d+$/),
        mockFeedback,
        86400 * 30,
      );

      // Verify feedback was sent to KIRO
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/feedback'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify({
            userId: mockFeedback.userId,
            tipId: mockFeedback.tipId,
            feedback: mockFeedback.feedback,
            reasoning: mockFeedback.reasoning,
            timestamp: mockFeedback.timestamp.toISOString(),
            context: 'health-tips-personalization',
          }),
        }),
      );

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Personalization feedback recorded',
        expect.objectContaining({
          userId: mockFeedback.userId,
          tipId: mockFeedback.tipId,
          feedback: mockFeedback.feedback,
        }),
      );
    });

    it('should handle KIRO feedback API failures gracefully', async () => {
      // Mock KIRO feedback API failure
      mockFetch.mockRejectedValueOnce(new Error('KIRO feedback API failed'));

      await personalizationService.recordPersonalizationFeedback(mockFeedback);

      // Should still cache feedback locally
      expect(mockCacheService.set).toHaveBeenCalled();

      // Should log warning about KIRO failure
      expect(mockLoggingService.logWarning).toHaveBeenCalledWith(
        'Failed to send feedback to KIRO',
        expect.objectContaining({
          feedback: mockFeedback,
          error: expect.any(Error),
        }),
      );

      // Should still log successful local recording
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Personalization feedback recorded',
        expect.any(Object),
      );
    });
  });

  describe('getUserPersonalizationProfile', () => {
    const mockUserId = 'test-user-123';

    it('should return cached profile when available', async () => {
      const cachedProfile = {
        userId: mockUserId,
        preferences: {
          categories: ['nutrition', 'fitness'],
          difficulty: 'intermediate',
          timeOfDay: ['morning'],
          goals: ['weight_loss', 'energy'],
        },
        insights: {
          favoriteCategories: ['nutrition', 'fitness'],
          preferredDifficulty: 'easy to medium',
          engagementPatterns: {
            bestTimeOfDay: 'morning',
            averageEngagement: 0.8,
            streakMotivation: 0.9,
          },
          recommendations: {
            nextCategories: ['mental_wellness'],
            suggestedDifficulty: 'easy to medium',
            motivationalMessage: 'Keep up the excellent progress!',
          },
        },
        lastUpdated: new Date(),
      };

      mockCacheService.get.mockResolvedValue(cachedProfile);

      const result = await personalizationService.getUserPersonalizationProfile(
        mockUserId,
      );

      expect(result).toEqual(cachedProfile);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `personalization-profile-${mockUserId}`,
      );
    });

    it('should build and cache new profile when not cached', async () => {
      const result = await personalizationService.getUserPersonalizationProfile(
        mockUserId,
      );

      expect(result.userId).toBe(mockUserId);
      expect(result.preferences).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.lastUpdated).toBeInstanceOf(Date);

      // Verify profile was cached
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `personalization-profile-${mockUserId}`,
        expect.objectContaining({
          userId: mockUserId,
          preferences: expect.any(Object),
          insights: expect.any(Object),
        }),
        3600,
      );
    });
  });

  describe('updatePersonalizationPreferences', () => {
    const mockUserId = 'test-user-123';
    const mockPreferences = {
      categories: ['nutrition', 'mental_wellness'],
      difficulty: 'advanced',
      timeOfDay: ['evening'],
      goals: ['stress_reduction'],
    };

    it('should update preferences and clear related caches', async () => {
      const existingProfile = {
        userId: mockUserId,
        preferences: {
          categories: ['fitness'],
          difficulty: 'beginner',
          timeOfDay: ['morning'],
          goals: ['weight_loss'],
        },
        insights: {} as any,
        lastUpdated: new Date(),
      };

      mockCacheService.get.mockResolvedValue(existingProfile);

      const result =
        await personalizationService.updatePersonalizationPreferences(
          mockUserId,
          mockPreferences,
        );

      expect(result.preferences).toEqual(
        expect.objectContaining(mockPreferences),
      );
      expect(result.lastUpdated).toBeInstanceOf(Date);

      // Verify profile cache was updated
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `personalization-profile-${mockUserId}`,
        expect.objectContaining({
          preferences: expect.objectContaining(mockPreferences),
        }),
        3600,
      );

      // Verify personalized tips cache was cleared
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `personalized-tips-${mockUserId}-*`,
      );

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Personalization preferences updated',
        expect.objectContaining({
          userId: mockUserId,
          preferences: mockPreferences,
        }),
      );
    });
  });

  describe('KIRO AI Integration', () => {
    it('should build proper KIRO prompt with user signals', async () => {
      const mockUserId = 'test-user-123';

      // Mock successful KIRO response to capture the prompt
      let capturedPrompt = '';
      mockFetch.mockImplementationOnce(async (url, options) => {
        const body = JSON.parse(options?.body as string);
        capturedPrompt = body.messages[1].content;

        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    tips: [],
                    personalizationScore: 0.8,
                    reasoning: 'Test reasoning',
                  }),
                },
              },
            ],
          }),
        } as Response;
      });

      await personalizationService.getPersonalizedTips(mockUserId, 3, true);

      // Verify prompt contains expected user signals
      expect(capturedPrompt).toContain('USER PROFILE:');
      expect(capturedPrompt).toContain('USER SIGNALS:');
      expect(capturedPrompt).toContain('Last Mood:');
      expect(capturedPrompt).toContain('Engagement Score:');
      expect(capturedPrompt).toContain('Completion Rate:');
      expect(capturedPrompt).toContain('PERSONALIZATION REQUIREMENTS:');
      expect(capturedPrompt).toContain('RESPONSE FORMAT:');
    });

    it('should handle KIRO API authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const result = await personalizationService.getPersonalizedTips(
        'test-user',
        3,
        true,
      );

      expect(result.fallbackUsed).toBe(true);
      expect(mockLoggingService.logWarning).toHaveBeenCalledWith(
        'KIRO AI failed, using fallback',
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
    });

    it('should handle KIRO API rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      const result = await personalizationService.getPersonalizedTips(
        'test-user',
        3,
        true,
      );

      expect(result.fallbackUsed).toBe(true);
      expect(mockLoggingService.logWarning).toHaveBeenCalled();
    });
  });
});
