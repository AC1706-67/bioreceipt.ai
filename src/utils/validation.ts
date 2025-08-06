/**
 * Data validation schemas using Yup
 * Based on design document data models
 */

import * as yup from 'yup';
import { AuthMethod, Gender, HealthCategory, SkillLevel, TipDifficulty, UserAction, FeedbackCategory } from '../types';

// User validation schemas
export const healthInterestSchema = yup.object({
  category: yup.string().oneOf(['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'] as HealthCategory[]).required(),
  level: yup.string().oneOf(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).required(),
});

export const notificationSettingsSchema = yup.object({
  enabled: yup.boolean().required(),
  dailyTipTime: yup.string().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').required(),
  streakReminders: yup.boolean().required(),
  encouragementMessages: yup.boolean().required(),
  timezone: yup.string().required(),
});

export const userProfileSchema = yup.object({
  id: yup.string().required(),
  email: yup.string().email('Invalid email format').optional(),
  phone: yup.string().matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  name: yup.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').required(),
  age: yup.number().min(13, 'Must be at least 13 years old').max(120, 'Invalid age').integer().required(),
  gender: yup.string().oneOf(['male', 'female', 'other', 'prefer_not_to_say'] as Gender[]).required(),
  healthInterests: yup.array().of(healthInterestSchema).min(1, 'At least one health interest is required').required(),
  notificationPreferences: notificationSettingsSchema.required(),
  createdAt: yup.date().required(),
  updatedAt: yup.date().required(),
  lastLogin: yup.date().optional(),
  isActive: yup.boolean().required(),
});

export const userRegistrationSchema = yup.object({
  name: yup.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').required(),
  age: yup.number().min(13, 'Must be at least 13 years old').max(120, 'Invalid age').integer().required(),
  gender: yup.string().oneOf(['male', 'female', 'other', 'prefer_not_to_say'] as Gender[]).required(),
  healthInterests: yup.array().of(healthInterestSchema).min(1, 'At least one health interest is required').required(),
  authMethod: yup.string().oneOf(['email', 'phone', 'google', 'apple'] as AuthMethod[]).required(),
  credentials: yup.object({
    email: yup.string().email('Invalid email format').when('authMethod', {
      is: 'email',
      then: (schema) => schema.required('Email is required for email authentication'),
      otherwise: (schema) => schema.optional(),
    }),
    phone: yup.string().matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').when('authMethod', {
      is: 'phone',
      then: (schema) => schema.required('Phone is required for phone authentication'),
      otherwise: (schema) => schema.optional(),
    }),
    password: yup.string().min(8, 'Password must be at least 8 characters').when('authMethod', {
      is: (val: string) => ['email', 'phone'].includes(val),
      then: (schema) => schema.required('Password is required'),
      otherwise: (schema) => schema.optional(),
    }),
    token: yup.string().when('authMethod', {
      is: (val: string) => ['google', 'apple'].includes(val),
      then: (schema) => schema.required('OAuth token is required'),
      otherwise: (schema) => schema.optional(),
    }),
  }).required(),
});

// Health tip validation schemas
export const healthTipSchema = yup.object({
  id: yup.string().required(),
  title: yup.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be less than 200 characters').required(),
  content: yup.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content must be less than 5000 characters').required(),
  imageUrl: yup.string().url('Invalid image URL').optional(),
  category: yup.string().oneOf(['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'] as HealthCategory[]).required(),
  tags: yup.array().of(yup.string().min(2, 'Tag must be at least 2 characters')).max(10, 'Maximum 10 tags allowed').required(),
  difficulty: yup.string().oneOf(['beginner', 'intermediate', 'advanced'] as TipDifficulty[]).required(),
  estimatedReadTime: yup.number().min(1, 'Read time must be at least 1 minute').max(30, 'Read time must be less than 30 minutes').integer().required(),
  createdAt: yup.date().required(),
  updatedAt: yup.date().required(),
  createdBy: yup.string().required(),
  isActive: yup.boolean().required(),
});

export const userEngagementSchema = yup.object({
  id: yup.string().required(),
  tipId: yup.string().required(),
  userId: yup.string().required(),
  action: yup.string().oneOf(['view', 'like', 'bookmark', 'complete'] as UserAction[]).required(),
  timestamp: yup.date().required(),
  sessionId: yup.string().optional(),
});

// Progress validation schemas
export const userProgressSchema = yup.object({
  id: yup.string().required(),
  userId: yup.string().required(),
  currentStreak: yup.number().min(0, 'Streak cannot be negative').integer().required(),
  longestStreak: yup.number().min(0, 'Longest streak cannot be negative').integer().required(),
  totalTipsCompleted: yup.number().min(0, 'Total tips completed cannot be negative').integer().required(),
  lastActivityDate: yup.date().required(),
  createdAt: yup.date().required(),
  updatedAt: yup.date().required(),
});

// Feedback validation schema
export const userFeedbackSchema = yup.object({
  id: yup.string().required(),
  userId: yup.string().required(),
  category: yup.string().oneOf(['bug', 'suggestion', 'content_quality', 'feature_request'] as FeedbackCategory[]).required(),
  title: yup.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters').required(),
  description: yup.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters').required(),
  referenceNumber: yup.string().required(),
  priority: yup.string().oneOf(['low', 'medium', 'high', 'critical']).required(),
  status: yup.string().oneOf(['submitted', 'in_review', 'resolved', 'closed']).required(),
  createdAt: yup.date().required(),
  resolvedAt: yup.date().optional(),
});

// Validation helper functions
export const validateData = async <T>(schema: yup.Schema<T>, data: unknown): Promise<{ isValid: boolean; data?: T; errors?: string[] }> => {
  try {
    const validatedData = await schema.validate(data, { abortEarly: false });
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return { isValid: false, errors: error.errors };
    }
    return { isValid: false, errors: ['Unknown validation error'] };
  }
};

export const validateDataSync = <T>(schema: yup.Schema<T>, data: unknown): { isValid: boolean; data?: T; errors?: string[] } => {
  try {
    const validatedData = schema.validateSync(data, { abortEarly: false });
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return { isValid: false, errors: error.errors };
    }
    return { isValid: false, errors: ['Unknown validation error'] };
  }
};