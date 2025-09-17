/**
 * Unit tests for data transformation utilities
 */

import {
  sanitizeString,
  sanitizeUserProfile,
  sanitizeHealthTip,
  parseApiDates,
  serializeApiDates,
  transformUserProfileFromApi,
  transformUserProfileForApi,
  transformHealthTipFromApi,
  transformHealthTipForApi,
  calculateEngagementScore,
  getFavoriteCategory,
  formatDuration,
  generateReferenceNumber,
} from '../../src/utils/dataTransform';
import { UserProfile, HealthTip, UserEngagement } from '../../src/types';

describe('Data Transformation Utilities', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeString(input);
      expect(result).toBe('Hello  World');
    });

    it('should remove angle brackets', () => {
      const input = 'Hello <div>World</div>';
      const result = sanitizeString(input);
      expect(result).toBe('Hello divWorld/div');
    });

    it('should remove javascript protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeString(input);
      expect(result).toBe('alert("xss")');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('sanitizeUserProfile', () => {
    it('should sanitize user profile fields', () => {
      const profile: Partial<UserProfile> = {
        name: '  John <script>alert("xss")</script> Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        phone: '+1 (555) 123-4567',
      };

      const result = sanitizeUserProfile(profile);
      expect(result.name).toBe('John  Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('15551234567');
    });
  });

  describe('parseApiDates', () => {
    it('should convert string dates to Date objects', () => {
      const data = {
        id: '123',
        name: 'Test',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      const result = parseApiDates(data, ['createdAt', 'updatedAt']);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.id).toBe('123');
      expect(result.name).toBe('Test');
    });
  });

  describe('serializeApiDates', () => {
    it('should convert Date objects to ISO strings', () => {
      const data = {
        id: '123',
        name: 'Test',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
      };

      const result = serializeApiDates(data, ['createdAt', 'updatedAt']);
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(result.createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2023-01-02T00:00:00.000Z');
    });
  });

  describe('calculateEngagementScore', () => {
    it('should return 0 for empty engagements', () => {
      const result = calculateEngagementScore([]);
      expect(result).toBe(0);
    });

    it('should calculate correct engagement score', () => {
      const engagements: UserEngagement[] = [
        {
          id: '1',
          tipId: 'tip1',
          userId: 'user1',
          action: 'view',
          timestamp: new Date(),
        },
        {
          id: '2',
          tipId: 'tip1',
          userId: 'user1',
          action: 'like',
          timestamp: new Date(),
        },
        {
          id: '3',
          tipId: 'tip1',
          userId: 'user1',
          action: 'complete',
          timestamp: new Date(),
        },
      ];

      const result = calculateEngagementScore(engagements);
      // (0.1 + 0.3 + 1.0) / 3 = 0.467
      expect(result).toBeCloseTo(0.467, 3);
    });

    it('should cap engagement score at 1.0', () => {
      const engagements: UserEngagement[] = [
        {
          id: '1',
          tipId: 'tip1',
          userId: 'user1',
          action: 'complete',
          timestamp: new Date(),
        },
        {
          id: '2',
          tipId: 'tip1',
          userId: 'user1',
          action: 'complete',
          timestamp: new Date(),
        },
      ];

      const result = calculateEngagementScore(engagements);
      expect(result).toBe(1.0);
    });
  });

  describe('getFavoriteCategory', () => {
    const tips: HealthTip[] = [
      {
        id: 'tip1',
        title: 'Nutrition Tip',
        content: 'Content',
        category: 'nutrition',
        tags: [],
        difficulty: 'easy',
        estimatedReadTime: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        isActive: true,
      },
      {
        id: 'tip2',
        title: 'Fitness Tip',
        content: 'Content',
        category: 'fitness',
        tags: [],
        difficulty: 'easy',
        estimatedReadTime: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        isActive: true,
      },
    ];

    it('should return favorite category based on engagements', () => {
      const engagements: UserEngagement[] = [
        {
          id: '1',
          tipId: 'tip1',
          userId: 'user1',
          action: 'complete',
          timestamp: new Date(),
        },
        {
          id: '2',
          tipId: 'tip1',
          userId: 'user1',
          action: 'like',
          timestamp: new Date(),
        },
        {
          id: '3',
          tipId: 'tip2',
          userId: 'user1',
          action: 'view',
          timestamp: new Date(),
        },
      ];

      const result = getFavoriteCategory(tips, engagements);
      expect(result).toBe('nutrition');
    });

    it('should return null for no engagements', () => {
      const result = getFavoriteCategory(tips, []);
      expect(result).toBeNull();
    });
  });

  describe('formatDuration', () => {
    it('should format minutes correctly', () => {
      expect(formatDuration(0.5)).toBe('Less than 1 minute');
      expect(formatDuration(1)).toBe('1 minute');
      expect(formatDuration(5)).toBe('5 minutes');
      expect(formatDuration(60)).toBe('1 hour');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(120)).toBe('2 hours');
    });
  });

  describe('generateReferenceNumber', () => {
    it('should generate unique reference numbers', () => {
      const ref1 = generateReferenceNumber();
      const ref2 = generateReferenceNumber();

      expect(ref1).toMatch(/^HT-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(ref2).toMatch(/^HT-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(ref1).not.toBe(ref2);
    });
  });
});
