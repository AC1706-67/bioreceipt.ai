/**
 * BioReceipt Content Service Tests
 * Comprehensive unit tests for BioReceipt content CRUD operations and functionality
 */

import { BioReceiptContentService } from '../BioReceiptContentService';
import { BioReceiptContent, BioReceiptContentCategory, DifficultyLevel } from '../../../models/BioReceiptContent';
import { storage } from '../../../utils/storage';
import { cacheService } from '../../cache/cacheService';

// Mock dependencies
jest.mock('../../../utils/storage');
jest.mock('../../cache/cacheService');
jest.mock('../../analytics/analyticsService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('BioReceiptContentService', () => {
  const mockContent: BioReceiptContent = {
    id: 'content_1',
    title: 'Test BioReceipt Content',
    content: 'This is test BioReceipt content that is long enough to pass validation.',
    category: BioReceiptContentCategory.NUTRITION,
    difficulty: DifficultyLevel.BEGINNER,
    estimatedReadTime: 5,
    metadata: {
      engagementScore: 0.8,
      effectivenessRating: 4.5,
      userRatings: [],
      tags: ['test', 'nutrition'],
      lastUpdated: new Date(),
      version: 1
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockContentList = [
    mockContent,
    {
      id: 'content_2',
      title: 'Another Test Content',
      category: BioReceiptContentCategory.FITNESS,
      difficulty: DifficultyLevel.INTERMEDIATE
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getData.mockResolvedValue({
      'content_1': mockContent,
      'content_2': mockContentList[1]
    });
  });

  describe('getBioReceiptContent', () => {
    it('should return all content when no filter is provided', async () => {
      const result = await BioReceiptContentService.getBioReceiptContent();

      expect(result.content).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockStorage.getData).toHaveBeenCalledWith('BioReceipt_content');
    });

    it('should filter content by category', async () => {
      const filter = { category: BioReceiptContentCategory.NUTRITION };
      const result = await BioReceiptContentService.getBioReceiptContent(filter);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].category).toBe(BioReceiptContentCategory.NUTRITION);
    });

    it('should filter content by difficulty', async () => {
      const filter = { difficulty: DifficultyLevel.INTERMEDIATE };
      const result = await BioReceiptContentService.getBioReceiptContent(filter);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].difficulty).toBe(DifficultyLevel.INTERMEDIATE);
    });

    it('should filter content by search query', async () => {
      const filter = { searchQuery: 'Another' };
      const result = await BioReceiptContentService.getBioReceiptContent(filter);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].title).toContain('Another');
    });

    it('should sort content by engagement score descending', async () => {
      const sort = { field: 'engagementScore' as const, direction: 'desc' as const };
      const result = await BioReceiptContentService.getBioReceiptContent(undefined, sort);

      expect(result.content[0].metadata.engagementScore).toBeGreaterThanOrEqual(
        result.content[1].metadata.engagementScore || 0
      );
    });

    it('should apply pagination correctly', async () => {
      const result = await BioReceiptContentService.getBioReceiptContent(undefined, undefined, 1, 0);

      expect(result.content).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('should return cached result when available', async () => {
      const cachedResult = { content: [mockContent], total: 1, hasMore: false };
      mockCacheService.getAdvanced.mockResolvedValueOnce(cachedResult);

      const result = await BioReceiptContentService.getBioReceiptContent();

      expect(result).toEqual(cachedResult);
      expect(mockStorage.getData).not.toHaveBeenCalled();
    });
  });

  describe('getBioReceiptContentById', () => {
    it('should return content when found', async () => {
      const result = await BioReceiptContentService.getBioReceiptContentById('content_1');

      expect(result).toEqual(mockContent);
    });

    it('should return null when content not found', async () => {
      const result = await BioReceiptContentService.getBioReceiptContentById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return cached content when available', async () => {
      mockCacheService.getAdvanced.mockResolvedValueOnce(mockContent);

      const result = await BioReceiptContentService.getBioReceiptContentById('content_1');

      expect(result).toEqual(mockContent);
      expect(mockStorage.getData).not.toHaveBeenCalled();
    });
  });

  describe('createBioReceiptContent', () => {
    const newContentData = {
      title: 'New BioReceipt Content',
      content: 'This is new BioReceipt content with sufficient content length for validation.',
      category: BioReceiptContentCategory.FITNESS,
      difficulty: DifficultyLevel.BEGINNER,
      estimatedReadTime: 3,
      tags: ['new', 'fitness']
    };

    it('should create new content successfully', async () => {
      mockStorage.getData.mockResolvedValueOnce({});

      const result = await BioReceiptContentService.createBioReceiptContent(newContentData);

      expect(result.title).toBe(newContentData.title);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(mockStorage.setData).toHaveBeenCalled();
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('BioReceipt_content*');
    });

    it('should throw error for invalid content data', async () => {
      const invalidContentData = {
        title: 'Short',
        content: 'Too short',
        category: 'invalid' as any
      };

      await expect(BioReceiptContentService.createBioReceiptContent(invalidContentData)).rejects.toThrow('Validation failed');
    });

    it('should sanitize content to prevent XSS', async () => {
      const contentWithScript = {
        ...newContentData,
        content: 'Safe content <script>alert("xss")</script> more content'
      };

      const result = await BioReceiptContentService.createBioReceiptContent(contentWithScript);

      expect(result.content).not.toContain('<script>');
      expect(result.content).toContain('Safe content');
    });
  });

  describe('updateBioReceiptContent', () => {
    it('should update existing content successfully', async () => {
      const updates = {
        title: 'Updated Title',
        difficulty: DifficultyLevel.ADVANCED
      };

      const result = await BioReceiptContentService.updateBioReceiptContent('content_1', updates);

      expect(result.title).toBe(updates.title);
      expect(result.difficulty).toBe(updates.difficulty);
      expect(result.updatedAt).toBeDefined();
      expect(mockStorage.setData).toHaveBeenCalled();
    });

    it('should throw error when content not found', async () => {
      await expect(
        BioReceiptContentService.updateBioReceiptContent('nonexistent', { title: 'New Title' })
      ).rejects.toThrow('Content not found');
    });
  });

  describe('deleteBioReceiptContent', () => {
    it('should delete content successfully', async () => {
      const result = await BioReceiptContentService.deleteBioReceiptContent('content_1');

      expect(result).toBe(true);
      expect(mockStorage.setData).toHaveBeenCalled();
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('BioReceipt_content*');
    });

    it('should return false when content not found', async () => {
      const result = await BioReceiptContentService.deleteBioReceiptContent('nonexistent');

      expect(result).toBe(false);
    });
  });
});
