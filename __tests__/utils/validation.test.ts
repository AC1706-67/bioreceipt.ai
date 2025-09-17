/**
 * Unit tests for validation utilities
 */

import {
  userRegistrationSchema,
  healthTipSchema,
  userEngagementSchema,
  userProgressSchema,
  userFeedbackSchema,
  validateData,
  validateDataSync,
} from '../../src/utils/validation';
import {
  UserRegistration,
  HealthTip,
  UserEngagement,
  UserProgress,
  UserFeedback,
} from '../../src/types';

describe('Validation Schemas', () => {
  describe('userRegistrationSchema', () => {
    const validUserRegistration: UserRegistration = {
      name: 'John Doe',
      age: 30,
      gender: 'male',
      healthInterests: [
        { category: 'fitness', level: 'beginner' },
        { category: 'nutrition', level: 'intermediate' },
      ],
      authMethod: 'email',
      credentials: {
        email: 'john@example.com',
        password: 'password123',
      },
    };

    it('should validate a valid user registration', async () => {
      const result = await validateData(
        userRegistrationSchema,
        validUserRegistration,
      );
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validUserRegistration);
    });

    it('should reject invalid email format', async () => {
      const invalidData = {
        ...validUserRegistration,
        credentials: { email: 'invalid-email', password: 'password123' },
      };

      const result = await validateData(userRegistrationSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject age below minimum', async () => {
      const invalidData = { ...validUserRegistration, age: 12 };

      const result = await validateData(userRegistrationSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Must be at least 13 years old');
    });

    it('should reject short password', async () => {
      const invalidData = {
        ...validUserRegistration,
        credentials: { email: 'john@example.com', password: '123' },
      };

      const result = await validateData(userRegistrationSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should require at least one health interest', async () => {
      const invalidData = { ...validUserRegistration, healthInterests: [] };

      const result = await validateData(userRegistrationSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'At least one health interest is required',
      );
    });
  });

  describe('healthTipSchema', () => {
    const validHealthTip: HealthTip = {
      id: 'tip-123',
      title: 'Stay Hydrated Daily',
      content:
        'Drinking enough water is essential for your health. Aim for 8 glasses per day.',
      imageUrl: 'https://example.com/image.jpg',
      category: 'nutrition',
      tags: ['hydration', 'health', 'daily'],
      difficulty: 'easy',
      estimatedReadTime: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-123',
      isActive: true,
    };

    it('should validate a valid health tip', async () => {
      const result = await validateData(healthTipSchema, validHealthTip);
      expect(result.isValid).toBe(true);
    });

    it('should reject short title', async () => {
      const invalidData = { ...validHealthTip, title: 'Hi' };

      const result = await validateData(healthTipSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be at least 5 characters');
    });

    it('should reject invalid image URL', async () => {
      const invalidData = { ...validHealthTip, imageUrl: 'not-a-url' };

      const result = await validateData(healthTipSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid image URL');
    });

    it('should reject invalid category', async () => {
      const invalidData = {
        ...validHealthTip,
        category: 'invalid-category' as any,
      };

      const result = await validateData(healthTipSchema, invalidData);
      expect(result.isValid).toBe(false);
    });
  });

  describe('userEngagementSchema', () => {
    const validEngagement: UserEngagement = {
      id: 'engagement-123',
      tipId: 'tip-123',
      userId: 'user-123',
      action: 'like',
      timestamp: new Date(),
      sessionId: 'session-123',
    };

    it('should validate a valid user engagement', async () => {
      const result = await validateData(userEngagementSchema, validEngagement);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid action', async () => {
      const invalidData = {
        ...validEngagement,
        action: 'invalid-action' as any,
      };

      const result = await validateData(userEngagementSchema, invalidData);
      expect(result.isValid).toBe(false);
    });
  });

  describe('userProgressSchema', () => {
    const validProgress: UserProgress = {
      id: 'progress-123',
      userId: 'user-123',
      currentStreak: 5,
      longestStreak: 10,
      totalTipsCompleted: 25,
      lastActivityDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate valid user progress', async () => {
      const result = await validateData(userProgressSchema, validProgress);
      expect(result.isValid).toBe(true);
    });

    it('should reject negative streak values', async () => {
      const invalidData = { ...validProgress, currentStreak: -1 };

      const result = await validateData(userProgressSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Streak cannot be negative');
    });
  });

  describe('validateDataSync', () => {
    it('should validate data synchronously', () => {
      const validData = {
        id: 'progress-123',
        userId: 'user-123',
        currentStreak: 5,
        longestStreak: 10,
        totalTipsCompleted: 25,
        lastActivityDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateDataSync(userProgressSchema, validData);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should return errors for invalid data', () => {
      const invalidData = { currentStreak: -1 };

      const result = validateDataSync(userProgressSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
