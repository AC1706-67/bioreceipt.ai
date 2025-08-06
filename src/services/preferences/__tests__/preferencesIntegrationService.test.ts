/**
 * Preferences Integration Service Tests
 * Tests for integrating user preferences with other services
 */
import { preferencesIntegrationService } from '../preferencesIntegrationService';
import { userPreferencesService } from '../userPreferencesService';
import { healthTipService } from '../../content/healthTipService';

// Mock dependencies
jest.mock('../userPreferencesService');
jest.mock('../../content/healthTipService');

const mockUserPreferencesService = userPreferencesService as jest.Mocked<typeof userPreferencesService>;
const mockHealthTipService = healthTipService as jest.Mocked<typeof healthTipService>;

describe('PreferencesIntegrationService', () => {
  const mockUserId = 'user_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPersonalizedTips', () => {
    it('should get personalized tips based on user preferences', async () => {
      const mockContentFilter = {
        categories: ['nutrition', 'fitness'],
        difficulty: 'intermediate',
        maxReadingTime: 7,
        personalizedContent: true,
        aiRecommendations: true
      };

      const mockTips = [
        { id: '1', title: 'Nutrition Tip', category: 'nutrition' },
        { id: '2', title: 'Fitness Tip', category: 'fitness' }
      ];

      mockUserPreferencesService.getContentFilter.mockResolvedValue(mockContentFilter);
      mockHealthTipService.getTipsByFilters.mockResolvedValue(mockTips as any);

      const result = await preferencesIntegrationService.getPersonalizedTips(mockUserId, 5);

      expect(mockUserPreferencesService.getContentFilter).toHaveBeenCalledWith(mockUserId);
      expect(mockHealthTipService.getTipsByFilters).toHaveBeenCalledWith({
        categories: ['nutrition', 'fitness'],
        difficulty: 'intermediate',
        maxReadingTime: 7,
        count: 5,
        excludeViewed: undefined,
        userId: mockUserId
      });
      expect(result).toEqual(mockTips);
    });

    it('should fallback to general tips on error', async () => {
      const fallbackTips = [{ id: '1', title: 'General Tip' }];

      mockUserPreferencesService.getContentFilter.mockRejectedValue(new Error('Service error'));
      mockHealthTipService.getTipsByFilters.mockResolvedValue(fallbackTips as any);

      const result = await preferencesIntegrationService.getPersonalizedTips(mockUserId);

      expect(result).toEqual(fallbackTips);
    });
  });

  describe('shouldDeliverContent', () => {
    it('should allow content delivery by default', async () => {
      const mockPreferences = {
        privacy: { dataCollection: true },
        content: { aiRecommendations: true }
      };

      mockUserPreferencesService.getUserPreferences.mockResolvedValue(mockPreferences as any);
      mockUserPreferencesService.getContentFilter.mockResolvedValue({
        aiRecommendations: true
      } as any);

      const result = await preferencesIntegrationService.shouldDeliverContent(
        mockUserId,
        'general',
        'content_123'
      );

      expect(result).toBe(true);
    });

    it('should block personalized content when data collection is disabled', async () => {
      const mockPreferences = {
        privacy: { dataCollection: false }
      };

      mockUserPreferencesService.getUserPreferences.mockResolvedValue(mockPreferences as any);

      const result = await preferencesIntegrationService.shouldDeliverContent(
        mockUserId,
        'personalized',
        'content_123'
      );

      expect(result).toBe(false);
    });
  });
});