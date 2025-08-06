// Mock Supabase before any imports
jest.mock('../../config/supabase', () => ({
  supabaseHelpers: {},
  Database: {}
}));

jest.mock('../../utils/storage', () => ({
  storage: {}
}));

jest.mock('../error/substanceErrorHandler', () => ({
  SubstanceErrorHandler: {},
  SubstanceError: class extends Error {}
}));

jest.mock('../../utils/retryMechanism', () => ({
  withRetry: jest.fn(),
  createSubstanceRetryOptions: jest.fn()
}));

import { aiPersonalizationService, AIServiceError } from '../aiPersonalizationService';
import { userPreferencesService } from '../preferences/userPreferencesService';
import { substanceDatabase } from '../substance/substanceDatabase';

// Mock dependencies
jest.mock('../preferences/userPreferencesService');
jest.mock('../substance/substanceDatabase');

const mockUserPreferencesService = userPreferencesService as jest.Mocked<typeof userPreferencesService>;
const mockSubstanceDatabase = substanceDatabase as jest.Mocked<typeof substanceDatabase>;

describe('AIPersonalizationService', () => {
  const mockUserId = 'user_123';
  let mockOpenAIClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    aiPersonalizationService.clearCache();

    // Setup mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    
    // Inject the mock client
    aiPersonalizationService.setOpenAIClient(mockOpenAIClient);

    // Setup default mocks
    mockUserPreferencesService.getUserPreferences.mockResolvedValue({
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
        personalizedContent: true
      }
    } as any);

    mockSubstanceDatabase.getRecentIntakes.mockResolvedValue([
      {
        substance_name: 'Protein Powder',
        category: 'supplements',
        logged_at: new Date('2024-01-01T10:00:00Z')
      },
      {
        substance_name: 'Creatine',
        category: 'supplements',
        logged_at: new Date('2024-01-01T11:00:00Z')
      }
    ] as any);
  });

  describe('getUserPersonalizations', () => {
    it('should successfully get personalizations from AI service', async () => {
      const mockAIResponse = [
        { tip: 'Drink more water', category: 'nutrition' },
        { tip: 'Get 8 hours of sleep', category: 'sleep' }
      ];

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }]
      });

      const result = await aiPersonalizationService.getUserPersonalizations(mockUserId, 5);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: expect.stringMatching(/^pers_/),
        input_data: expect.objectContaining({
          userId: mockUserId,
          preferences: expect.any(Object),
          recentIntakes: expect.any(Array)
        }),
        output_data: { recommendation: mockAIResponse[0], index: 0 },
        model: 'gpt-3.5-turbo',
        created_at: expect.any(Date)
      });

      expect(mockUserPreferencesService.getUserPreferences).toHaveBeenCalledWith(mockUserId);
      expect(mockSubstanceDatabase.getRecentIntakes).toHaveBeenCalledWith(mockUserId, 10);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        temperature: 0.7,
        max_tokens: 1000
      });
    });

    it('should handle non-JSON AI responses gracefully', async () => {
      const mockAIResponse = 'Here are some health tips for you...';

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: mockAIResponse
          }
        }]
      });

      const result = await aiPersonalizationService.getUserPersonalizations(mockUserId, 3);

      expect(result).toHaveLength(1);
      expect(result[0].output_data).toEqual({
        recommendations: mockAIResponse,
        raw: true
      });
    });

    it('should return cached results within TTL', async () => {
      const mockAIResponse = [{ tip: 'Cached tip', category: 'nutrition' }];

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }]
      });

      // First call
      const result1 = await aiPersonalizationService.getUserPersonalizations(mockUserId, 5);
      
      // Second call should use cache
      const result2 = await aiPersonalizationService.getUserPersonalizations(mockUserId, 5);

      expect(result1).toEqual(result2);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors with exponential backoff', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNRESET';

      const mockAIResponse = [{ tip: 'Success after retry', category: 'nutrition' }];

      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify(mockAIResponse)
            }
          }]
        });

      const startTime = Date.now();
      const result = await aiPersonalizationService.getUserPersonalizations(mockUserId, 3);
      const endTime = Date.now();

      expect(result).toHaveLength(1);
      expect(result[0].output_data.recommendation).toEqual(mockAIResponse[0]);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3);
      
      // Should have waited at least 3 seconds (1s + 2s delays)
      expect(endTime - startTime).toBeGreaterThan(3000);
    });

    it('should retry on 500 server errors', async () => {
      const serverError = new Error('Internal server error');
      (serverError as any).status = 500;

      const mockAIResponse = [{ tip: 'Success after server error', category: 'fitness' }];

      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify(mockAIResponse)
            }
          }]
        });

      const result = await aiPersonalizationService.getUserPersonalizations(mockUserId, 2);

      expect(result).toHaveLength(1);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limit errors (429)', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      const mockAIResponse = [{ tip: 'Success after rate limit', category: 'sleep' }];

      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify(mockAIResponse)
            }
          }]
        });

      const result = await aiPersonalizationService.getUserPersonalizations(mockUserId, 1);

      expect(result).toHaveLength(1);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;

      mockOpenAIClient.chat.completions.create.mockRejectedValue(authError);

      await expect(
        aiPersonalizationService.getUserPersonalizations(mockUserId, 3)
      ).rejects.toThrow(AIServiceError);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should throw AIServiceError after max retries exceeded', async () => {
      const networkError = new Error('Persistent network error');
      (networkError as any).code = 'ENOTFOUND';

      mockOpenAIClient.chat.completions.create.mockRejectedValue(networkError);

      await expect(
        aiPersonalizationService.getUserPersonalizations(mockUserId, 3)
      ).rejects.toThrow(AIServiceError);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle empty AI response', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      await expect(
        aiPersonalizationService.getUserPersonalizations(mockUserId, 3)
      ).rejects.toThrow(AIServiceError);
    });

    it('should handle missing choices in AI response', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: []
      });

      await expect(
        aiPersonalizationService.getUserPersonalizations(mockUserId, 3)
      ).rejects.toThrow(AIServiceError);
    });

    it('should include user preferences and recent intakes in AI prompt', async () => {
      const mockAIResponse = [{ tip: 'Test tip', category: 'nutrition' }];

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }]
      });

      await aiPersonalizationService.getUserPersonalizations(mockUserId, 3);

      const callArgs = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages.find((msg: any) => msg.role === 'user');
      
      expect(userMessage.content).toContain(mockUserId);
      expect(userMessage.content).toContain('Protein Powder');
      expect(userMessage.content).toContain('Creatine');
      expect(userMessage.content).toContain('intermediate');
    });

    it('should handle user preferences service errors', async () => {
      mockUserPreferencesService.getUserPreferences.mockRejectedValue(
        new Error('Preferences service error')
      );

      await expect(
        aiPersonalizationService.getUserPersonalizations(mockUserId, 3)
      ).rejects.toThrow(AIServiceError);
    });

    it('should handle substance database errors', async () => {
      mockSubstanceDatabase.getRecentIntakes.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        aiPersonalizationService.getUserPersonalizations(mockUserId, 3)
      ).rejects.toThrow(AIServiceError);
    });

    it('should respect the limit parameter', async () => {
      const mockAIResponse = Array.from({ length: 10 }, (_, i) => ({
        tip: `Tip ${i + 1}`,
        category: 'nutrition'
      }));

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }]
      });

      const result = await aiPersonalizationService.getUserPersonalizations(mockUserId, 5);

      expect(result).toHaveLength(5);
    });

    it('should generate unique IDs for each personalization', async () => {
      const mockAIResponse = [
        { tip: 'Tip 1', category: 'nutrition' },
        { tip: 'Tip 2', category: 'fitness' }
      ];

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }]
      });

      const result = await aiPersonalizationService.getUserPersonalizations(mockUserId, 5);

      expect(result).toHaveLength(2);
      expect(result[0].id).not.toEqual(result[1].id);
      expect(result[0].id).toMatch(/^pers_/);
      expect(result[1].id).toMatch(/^pers_/);
    });

    it('should work with default mock implementation when no client is injected', async () => {
      // Create a fresh service instance without injecting a client
      const freshService = new (aiPersonalizationService.constructor as any)();
      
      const result = await freshService.getUserPersonalizations(mockUserId, 3);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: expect.stringMatching(/^pers_/),
        input_data: expect.any(Object),
        output_data: expect.any(Object),
        model: 'gpt-3.5-turbo',
        created_at: expect.any(Date)
      });
    });
  });
});