/**
 * Prompt Engineering Service Tests
 * Tests for advanced prompt generation and user context building
 */

import { promptEngineeringService } from '../../../src/services/ai/promptEngineering';
import { UserProfile } from '../../../src/types/userProfile';
import { loggingService } from '../../../src/services/logging/loggingService';

// Mock dependencies
jest.mock('../../../src/services/logging/loggingService');

const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;

describe('PromptEngineeringService', () => {
  const mockProfile: UserProfile = {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    age: 28,
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
    totalInteractions: 50,
    completionRate: 0.8,
    favoriteCategories: ['nutrition', 'fitness'],
    preferredDifficulty: 'medium',
    averageReadTime: 4.5,
    engagementScore: 0.85,
    lastActiveDate: new Date(),
    streakHistory: [5, 7, 10, 12, 8],
    currentStreak: 12,
  };

  const mockRecentActivity = {
    lastTipsViewed: ['tip_1', 'tip_2', 'tip_3'],
    recentCompletions: ['tip_1', 'tip_4'],
    recentLikes: ['tip_2', 'tip_5'],
    recentBookmarks: ['tip_3'],
    searchQueries: ['healthy breakfast', 'quick workout', 'meal prep'],
    feedbackGiven: [
      { tipId: 'tip_1', feedback: 'positive', reason: 'Very actionable' },
      { tipId: 'tip_6', feedback: 'negative', reason: 'Too complex for me' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggingService.logInfo.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockLoggingService.logWarning.mockResolvedValue(undefined);
  });

  describe('buildUserContext', () => {
    it('should build comprehensive user context', async () => {
      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );

      expect(context.profile).toEqual(mockProfile);
      expect(context.currentStreak).toBe(12);
      expect(context.engagementHistory.totalInteractions).toBe(50);
      expect(context.engagementHistory.completionRate).toBe(0.8);
      expect(context.timeContext.timeOfDay).toMatch(/morning|afternoon|evening|night|early_morning|midday/);
      expect(context.timeContext.timezone).toBeDefined();
      expect(context.personalityInsights.motivationStyle).toBeDefined();
      expect(context.contentPreferences.preferredLength).toBeDefined();
    });

    it('should infer personality insights correctly', async () => {
      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );

      // Should infer achievement motivation from weight_loss goal
      expect(context.personalityInsights.motivationStyle).toBe('achievement');
      
      // Should infer communication preference from engagement patterns
      expect(context.personalityInsights.communicationPreference).toMatch(
        /direct|encouraging|scientific|casual/
      );
      
      // Should infer challenge level from difficulty and completion rate
      expect(context.personalityInsights.challengeLevel).toMatch(
        /comfort_zone|moderate_challenge|high_challenge/
      );
    });

    it('should determine time context accurately', async () => {
      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );

      expect(context.timeContext.currentTime).toBeInstanceOf(Date);
      expect(context.timeContext.dayOfWeek).toMatch(
        /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/
      );
      expect(typeof context.timeContext.isWeekend).toBe('boolean');
      expect(context.timeContext.seasonalContext).toMatch(/spring|summer|fall|winter/);
    });

    it('should handle errors gracefully', async () => {
      const invalidEngagementData = null;

      await expect(
        promptEngineeringService.buildUserContext(
          'test-user-123',
          mockProfile,
          invalidEngagementData,
          mockRecentActivity
        )
      ).rejects.toThrow();

      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('generatePersonalizationPrompt', () => {
    let mockUserContext: any;

    beforeEach(async () => {
      mockUserContext = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );
    });

    it('should generate comprehensive prompt for daily tips', () => {
      const request = {
        userId: 'test-user-123',
        requestType: 'daily_tips' as const,
        count: 3,
        context: mockUserContext,
      };

      const prompt = promptEngineeringService.generatePersonalizationPrompt(request);

      expect(prompt.systemPrompt).toContain('KIRO');
      expect(prompt.systemPrompt).toContain('health and wellness coach');
      expect(prompt.systemPrompt).toContain(mockUserContext.personalityInsights.motivationStyle);
      expect(prompt.systemPrompt).toContain(mockUserContext.contentPreferences.tonePreference);

      expect(prompt.userPrompt).toContain('Generate 3 highly personalized health tips');
      expect(prompt.userPrompt).toContain(mockProfile.name);
      expect(prompt.userPrompt).toContain(mockProfile.age.toString());
      expect(prompt.userPrompt).toContain('nutrition (intermediate level)');
      expect(prompt.userPrompt).toContain('Current Streak: 12 days');

      expect(prompt.constraints).toBeInstanceOf(Array);
      expect(prompt.constraints.length).toBeGreaterThan(5);
      expect(prompt.constraints).toContain('Each tip must be actionable within the next 24 hours');

      expect(prompt.outputFormat).toBeDefined();
      expect(prompt.examples).toBeInstanceOf(Array);
    });

    it('should generate category-specific prompt', () => {
      const request = {
        userId: 'test-user-123',
        requestType: 'category_specific' as const,
        count: 2,
        specificCategory: 'nutrition' as any,
        context: mockUserContext,
      };

      const prompt = promptEngineeringService.generatePersonalizationPrompt(request);

      expect(prompt.userPrompt).toContain('Focus on nutrition category tips');
      expect(prompt.userPrompt).toContain('Generate 2 highly personalized health tips');
    });

    it('should include mood context when provided', () => {
      const request = {
        userId: 'test-user-123',
        requestType: 'mood_based' as const,
        count: 1,
        userMood: 'stressed',
        context: mockUserContext,
      };

      const prompt = promptEngineeringService.generatePersonalizationPrompt(request);

      expect(prompt.userPrompt).toContain('Current Mood: stressed');
    });

    it('should adapt constraints based on time context', () => {
      const morningContext = {
        ...mockUserContext,
        timeContext: {
          ...mockUserContext.timeContext,
          timeOfDay: 'morning',
        },
      };

      const request = {
        userId: 'test-user-123',
        requestType: 'daily_tips' as const,
        count: 3,
        context: morningContext,
      };

      const prompt = promptEngineeringService.generatePersonalizationPrompt(request);

      expect(prompt.constraints).toContain('Focus on energizing and preparation activities');
    });

    it('should adapt constraints based on streak length', () => {
      const highStreakContext = {
        ...mockUserContext,
        currentStreak: 20,
      };

      const request = {
        userId: 'test-user-123',
        requestType: 'daily_tips' as const,
        count: 3,
        context: highStreakContext,
      };

      const prompt = promptEngineeringService.generatePersonalizationPrompt(request);

      expect(prompt.constraints).toContain(
        'Provide advanced or challenging recommendations to maintain engagement'
      );
    });

    it('should adapt constraints based on communication preference', () => {
      const scientificContext = {
        ...mockUserContext,
        personalityInsights: {
          ...mockUserContext.personalityInsights,
          communicationPreference: 'scientific',
        },
      };

      const request = {
        userId: 'test-user-123',
        requestType: 'daily_tips' as const,
        count: 3,
        context: scientificContext,
      };

      const prompt = promptEngineeringService.generatePersonalizationPrompt(request);

      expect(prompt.constraints).toContain('Include relevant research or scientific backing');
    });
  });

  describe('validatePrompt', () => {
    let mockUserContext: any;
    let mockPrompt: any;

    beforeEach(async () => {
      mockUserContext = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );

      mockPrompt = {
        systemPrompt: 'You are KIRO, an AI health coach...',
        userPrompt: `Generate personalized health tips for ${mockProfile.name} at ${mockUserContext.timeContext.timeOfDay}...`,
        constraints: [
          'Must be actionable',
          'Appropriate for skill level',
          'Consider time context',
          'Build on streak momentum',
          'Match personality style',
          'Include specific actions',
        ],
        outputFormat: { tips: [] },
        examples: [{ input: 'test', output: 'test' }],
      };
    });

    it('should validate high-quality prompt successfully', () => {
      const validation = promptEngineeringService.validatePrompt(mockPrompt, mockUserContext);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(0.8);
      expect(validation.issues).toHaveLength(0);
      expect(validation.suggestions).toBeInstanceOf(Array);
    });

    it('should identify prompt length issues', () => {
      const shortPrompt = {
        ...mockPrompt,
        userPrompt: 'Short prompt',
      };

      const validation = promptEngineeringService.validatePrompt(shortPrompt, mockUserContext);

      expect(validation.score).toBeLessThan(1.0);
      expect(validation.issues).toContain('Prompt may be too short for comprehensive personalization');
    });

    it('should identify missing personalization elements', () => {
      const impersonalPrompt = {
        ...mockPrompt,
        userPrompt: 'Generate health tips without any personal context',
      };

      const validation = promptEngineeringService.validatePrompt(impersonalPrompt, mockUserContext);

      expect(validation.score).toBeLessThan(1.0);
      expect(validation.issues).toContain('Missing user name personalization');
      expect(validation.issues).toContain('Missing time context');
    });

    it('should identify insufficient constraints', () => {
      const weakPrompt = {
        ...mockPrompt,
        constraints: ['Must be actionable', 'Be helpful'],
      };

      const validation = promptEngineeringService.validatePrompt(weakPrompt, mockUserContext);

      expect(validation.score).toBeLessThan(1.0);
      expect(validation.issues).toContain('Insufficient constraints for quality control');
    });

    it('should provide relevant suggestions', () => {
      const highStreakContext = {
        ...mockUserContext,
        currentStreak: 15,
      };

      const validation = promptEngineeringService.validatePrompt(mockPrompt, highStreakContext);

      expect(validation.suggestions).toContain('Consider adding streak milestone recognition');
    });

    it('should suggest focus on simpler recommendations for low completion rate', () => {
      const lowEngagementContext = {
        ...mockUserContext,
        engagementHistory: {
          ...mockUserContext.engagementHistory,
          completionRate: 0.3,
        },
      };

      const validation = promptEngineeringService.validatePrompt(mockPrompt, lowEngagementContext);

      expect(validation.suggestions).toContain('Focus on simpler, more achievable recommendations');
    });
  });

  describe('personality inference', () => {
    it('should infer achievement motivation from weight loss goals', async () => {
      const achievementProfile = {
        ...mockProfile,
        goals: ['weight_loss', 'muscle_building'],
      };

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        achievementProfile,
        mockEngagementData,
        mockRecentActivity
      );

      expect(context.personalityInsights.motivationStyle).toBe('achievement');
    });

    it('should infer knowledge motivation from high engagement', async () => {
      const highEngagementData = {
        ...mockEngagementData,
        engagementScore: 0.9,
      };

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        highEngagementData,
        mockRecentActivity
      );

      expect(context.personalityInsights.motivationStyle).toBe('knowledge');
    });

    it('should infer scientific communication preference from long read times', async () => {
      const longReadData = {
        ...mockEngagementData,
        averageReadTime: 7,
      };

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        longReadData,
        mockRecentActivity
      );

      expect(context.personalityInsights.communicationPreference).toBe('scientific');
    });

    it('should infer direct communication from high completion rate', async () => {
      const highCompletionData = {
        ...mockEngagementData,
        completionRate: 0.9,
      };

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        highCompletionData,
        mockRecentActivity
      );

      expect(context.personalityInsights.communicationPreference).toBe('direct');
    });
  });

  describe('content preferences inference', () => {
    it('should infer quick content preference from short read times', async () => {
      const shortReadData = {
        ...mockEngagementData,
        averageReadTime: 2,
      };

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        shortReadData,
        mockRecentActivity
      );

      expect(context.contentPreferences.preferredLength).toBe('quick');
      expect(context.contentPreferences.topicDepth).toBe('surface');
    });

    it('should infer detailed content preference from long read times', async () => {
      const longReadData = {
        ...mockEngagementData,
        averageReadTime: 8,
      };

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        longReadData,
        mockRecentActivity
      );

      expect(context.contentPreferences.preferredLength).toBe('detailed');
      expect(context.contentPreferences.topicDepth).toBe('deep');
    });

    it('should infer scientific evidence preference from advanced interests', async () => {
      const advancedProfile = {
        ...mockProfile,
        healthInterests: [
          { category: 'nutrition', level: 'advanced', priority: 1 },
        ],
      };

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        advancedProfile,
        mockEngagementData,
        mockRecentActivity
      );

      expect(context.contentPreferences.evidencePreference).toBe('scientific');
      expect(context.contentPreferences.tonePreference).toBe('professional');
    });
  });

  describe('time context building', () => {
    it('should correctly identify time of day', async () => {
      // Mock different times
      const originalDate = Date;
      
      // Test morning (8 AM)
      global.Date = jest.fn(() => new originalDate('2024-01-01T08:00:00Z')) as any;
      global.Date.now = originalDate.now;
      global.Date.prototype = originalDate.prototype;

      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );

      expect(context.timeContext.timeOfDay).toBe('early_morning');

      // Restore original Date
      global.Date = originalDate;
    });

    it('should correctly identify weekend vs weekday', async () => {
      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );

      expect(typeof context.timeContext.isWeekend).toBe('boolean');
      expect(context.timeContext.dayOfWeek).toMatch(
        /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/
      );
    });

    it('should determine seasonal context', async () => {
      const context = await promptEngineeringService.buildUserContext(
        'test-user-123',
        mockProfile,
        mockEngagementData,
        mockRecentActivity
      );

      expect(context.timeContext.seasonalContext).toMatch(/spring|summer|fall|winter/);
    });
  });
});