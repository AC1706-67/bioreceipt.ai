/**
 * Validation Schemas
 * Yup validation schemas for all data models
 */

import * as yup from 'yup';
import { 
  USER_PROFILE_CONSTRAINTS, 
  CHECK_IN_CONSTRAINTS 
} from '../types';
import { 
  HealthCategory, 
  SkillLevel, 
  Gender, 
  OnboardingStep,
  COMMON_GOALS 
} from '../types/userProfile';

// BioPulse Tip Validation Schema
export const bioPulseTipSchema = yup.object({
  id: yup.string().required('ID is required'),
  title: yup
    .string()
    .required('Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must not exceed 100 characters'),
  content: yup
    .string()
    .required('Content is required')
    .min(20, 'Content must be at least 20 characters')
    .max(2000, 'Content must not exceed 2000 characters'),
  category: yup
    .string()
    .oneOf(['nutrition', 'exercise', 'mental-health', 'sleep', 'wellness'])
    .required('Category is required'),
  difficulty: yup
    .string()
    .oneOf(['easy', 'medium', 'hard'])
    .required('Difficulty is required'),
  estimatedReadTime: yup
    .number()
    .positive('Read time must be positive')
    .max(60, 'Read time must not exceed 60 minutes')
    .required('Estimated read time is required'),
  tags: yup
    .array()
    .of(yup.string().max(30, 'Tag must not exceed 30 characters'))
    .max(10, 'Maximum 10 tags allowed'),
  imageUrl: yup
    .string()
    .url('Must be a valid URL')
    .nullable(),
  isActive: yup.boolean().default(true),
  priority: yup
    .number()
    .min(1, 'Priority must be between 1 and 10')
    .max(10, 'Priority must be between 1 and 10')
    .default(5),
  createdAt: yup.date().required(),
  updatedAt: yup.date().required(),
});

// Health Interest Schema
export const healthInterestSchema = yup.object({
  category: yup
    .string()
    .oneOf(['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'] as HealthCategory[])
    .required('Health category is required'),
  level: yup
    .string()
    .oneOf(['beginner', 'intermediate', 'advanced'] as SkillLevel[])
    .required('Skill level is required'),
  priority: yup
    .number()
    .min(1, 'Priority must be between 1 and 5')
    .max(5, 'Priority must be between 1 and 5')
    .integer('Priority must be a whole number')
    .required('Priority is required'),
});

// Onboarding Data Schema
export const onboardingDataSchema = yup.object({
  // Basic Info (Step 1)
  name: yup
    .string()
    .min(USER_PROFILE_CONSTRAINTS.name.minLength, 'Name must be at least 2 characters')
    .max(USER_PROFILE_CONSTRAINTS.name.maxLength, 'Name must not exceed 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
    .when('currentStep', {
      is: (step: OnboardingStep) => ['basic_info', 'health_interests', 'goals', 'preferences', 'complete'].includes(step),
      then: (schema) => schema.required('Name is required'),
      otherwise: (schema) => schema.optional(),
    }),
  age: yup
    .number()
    .min(USER_PROFILE_CONSTRAINTS.age.min, 'Age must be at least 13')
    .max(USER_PROFILE_CONSTRAINTS.age.max, 'Age must not exceed 120')
    .integer('Age must be a whole number')
    .optional(),
  gender: yup
    .string()
    .oneOf(['male', 'female', 'non_binary', 'prefer_not_to_say'] as Gender[])
    .optional(),
  
  // Health Interests (Step 2)
  healthInterests: yup
    .array()
    .of(healthInterestSchema)
    .min(USER_PROFILE_CONSTRAINTS.healthInterests.minItems, 'Please select at least 1 health interest')
    .max(USER_PROFILE_CONSTRAINTS.healthInterests.maxItems, 'Maximum 6 health interests allowed')
    .when('currentStep', {
      is: (step: OnboardingStep) => ['health_interests', 'goals', 'preferences', 'complete'].includes(step),
      then: (schema) => schema.required('Health interests are required'),
      otherwise: (schema) => schema.optional(),
    }),
  
  // Goals (Step 3)
  goals: yup
    .array()
    .of(yup.string().oneOf([...COMMON_GOALS]))
    .min(USER_PROFILE_CONSTRAINTS.goals.minItems, 'Please select at least 1 goal')
    .max(USER_PROFILE_CONSTRAINTS.goals.maxItems, 'Maximum 5 goals allowed')
    .when('currentStep', {
      is: (step: OnboardingStep) => ['goals', 'preferences', 'complete'].includes(step),
      then: (schema) => schema.required('Goals are required'),
      otherwise: (schema) => schema.optional(),
    }),
  
  // Preferences (Step 4)
  preferences: yup.object({
    notificationsEnabled: yup.boolean().default(true),
    dailyTipTime: yup
      .string()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
      .default('09:00'),
    weeklyGoal: yup
      .number()
      .min(1, 'Weekly goal must be at least 1')
      .max(7, 'Weekly goal cannot exceed 7')
      .default(5),
    preferredCategories: yup
      .array()
      .of(yup.string().oneOf(['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'] as HealthCategory[]))
      .max(6, 'Maximum 6 preferred categories'),
    difficulty: yup
      .string()
      .oneOf(['easy', 'medium', 'hard', 'mixed'])
      .default('mixed'),
    enableAIPersonalization: yup.boolean().default(true),
    shareDataForPersonalization: yup.boolean().default(true),
    privacySettings: yup.object({
      shareProgress: yup.boolean().default(false),
      allowAnalytics: yup.boolean().default(true),
      allowPersonalization: yup.boolean().default(true),
      dataRetentionConsent: yup.boolean().default(false),
    }),
    accessibilitySettings: yup.object({
      fontSize: yup.string().oneOf(['small', 'medium', 'large', 'extra_large']).default('medium'),
      highContrast: yup.boolean().default(false),
      reduceMotion: yup.boolean().default(false),
      screenReaderOptimized: yup.boolean().default(false),
    }),
  }).optional(),
  
  // Progress tracking
  currentStep: yup
    .string()
    .oneOf(['welcome', 'basic_info', 'health_interests', 'goals', 'preferences', 'complete'] as OnboardingStep[])
    .required('Current step is required'),
  completedSteps: yup
    .array()
    .of(yup.string().oneOf(['welcome', 'basic_info', 'health_interests', 'goals', 'preferences', 'complete'] as OnboardingStep[]))
    .default([]),
  startedAt: yup.date().required('Started date is required'),
  completedAt: yup.date().optional(),
});

// Updated User Profile Schema
export const userProfileSchema = yup.object({
  id: yup.string().required('ID is required'),
  // Basic Information
  name: yup
    .string()
    .required('Name is required')
    .min(USER_PROFILE_CONSTRAINTS.name.minLength, 'Name too short')
    .max(USER_PROFILE_CONSTRAINTS.name.maxLength, 'Name too long')
    .matches(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
  phoneNumber: yup
    .string()
    .matches(USER_PROFILE_CONSTRAINTS.phoneNumber.pattern, 'Invalid phone number format')
    .nullable(),
  avatar: yup
    .string()
    .url('Avatar must be a valid URL')
    .nullable(),
  
  // Demographics
  age: yup
    .number()
    .min(USER_PROFILE_CONSTRAINTS.age.min, 'Age must be at least 13')
    .max(USER_PROFILE_CONSTRAINTS.age.max, 'Age must not exceed 120')
    .integer('Age must be a whole number')
    .nullable(),
  gender: yup
    .string()
    .oneOf(['male', 'female', 'non_binary', 'prefer_not_to_say'] as Gender[])
    .nullable(),
  
  // Health Profile
  healthInterests: yup
    .array()
    .of(healthInterestSchema)
    .min(USER_PROFILE_CONSTRAINTS.healthInterests.minItems, 'At least 1 health interest required')
    .max(USER_PROFILE_CONSTRAINTS.healthInterests.maxItems, 'Maximum 6 health interests allowed')
    .required('Health interests are required'),
  goals: yup
    .array()
    .of(yup.string().oneOf([...COMMON_GOALS]))
    .min(USER_PROFILE_CONSTRAINTS.goals.minItems, 'At least 1 goal required')
    .max(USER_PROFILE_CONSTRAINTS.goals.maxItems, 'Maximum 5 goals allowed')
    .required('Goals are required'),
  
  // System Fields
  timezone: yup
    .string()
    .required('Timezone is required')
    .default(USER_PROFILE_CONSTRAINTS.timezone.default),
  language: yup
    .string()
    .required('Language is required')
    .length(2, 'Language must be a 2-character code')
    .default(USER_PROFILE_CONSTRAINTS.language.default),
  preferences: yup.object({
    notificationsEnabled: yup.boolean().default(true),
    dailyTipTime: yup
      .string()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
      .default('09:00'),
    weeklyGoal: yup
      .number()
      .min(1, 'Weekly goal must be at least 1')
      .max(7, 'Weekly goal cannot exceed 7')
      .default(5),
    preferredCategories: yup
      .array()
      .of(yup.string().oneOf(['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'] as HealthCategory[]))
      .max(6, 'Maximum 6 preferred categories'),
    difficulty: yup
      .string()
      .oneOf(['easy', 'medium', 'hard', 'mixed'])
      .default('mixed'),
    enableAIPersonalization: yup.boolean().default(true),
    shareDataForPersonalization: yup.boolean().default(true),
    privacySettings: yup.object({
      shareProgress: yup.boolean().default(false),
      allowAnalytics: yup.boolean().default(true),
      allowPersonalization: yup.boolean().default(true),
      dataRetentionConsent: yup.boolean().default(false),
    }),
    accessibilitySettings: yup.object({
      fontSize: yup.string().oneOf(['small', 'medium', 'large', 'extra_large']).default('medium'),
      highContrast: yup.boolean().default(false),
      reduceMotion: yup.boolean().default(false),
      screenReaderOptimized: yup.boolean().default(false),
    }),
  }).required('Preferences are required'),
  onboardingCompleted: yup.boolean().default(false),
  onboardingStep: yup
    .string()
    .oneOf(['welcome', 'basic_info', 'health_interests', 'goals', 'preferences', 'complete'] as OnboardingStep[])
    .default('welcome'),
  isActive: yup.boolean().default(true),
  lastLoginAt: yup.date().nullable(),
  createdAt: yup.date().required(),
  updatedAt: yup.date().required(),
});

// Profile Update Schema (for partial updates)
export const profileUpdateSchema = yup.object({
  name: yup
    .string()
    .min(USER_PROFILE_CONSTRAINTS.name.minLength, 'Name too short')
    .max(USER_PROFILE_CONSTRAINTS.name.maxLength, 'Name too long')
    .matches(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
    .optional(),
  age: yup
    .number()
    .min(USER_PROFILE_CONSTRAINTS.age.min, 'Age must be at least 13')
    .max(USER_PROFILE_CONSTRAINTS.age.max, 'Age must not exceed 120')
    .integer('Age must be a whole number')
    .nullable(),
  gender: yup
    .string()
    .oneOf(['male', 'female', 'non_binary', 'prefer_not_to_say'] as Gender[])
    .nullable(),
  healthInterests: yup
    .array()
    .of(healthInterestSchema)
    .min(USER_PROFILE_CONSTRAINTS.healthInterests.minItems, 'At least 1 health interest required')
    .max(USER_PROFILE_CONSTRAINTS.healthInterests.maxItems, 'Maximum 6 health interests allowed')
    .optional(),
  goals: yup
    .array()
    .of(yup.string().oneOf([...COMMON_GOALS]))
    .min(USER_PROFILE_CONSTRAINTS.goals.minItems, 'At least 1 goal required')
    .max(USER_PROFILE_CONSTRAINTS.goals.maxItems, 'Maximum 5 goals allowed')
    .optional(),
  preferences: yup.object({
    notificationsEnabled: yup.boolean(),
    dailyTipTime: yup
      .string()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    weeklyGoal: yup
      .number()
      .min(1, 'Weekly goal must be at least 1')
      .max(7, 'Weekly goal cannot exceed 7'),
    preferredCategories: yup
      .array()
      .of(yup.string().oneOf(['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'] as HealthCategory[]))
      .max(6, 'Maximum 6 preferred categories'),
    difficulty: yup
      .string()
      .oneOf(['easy', 'medium', 'hard', 'mixed']),
    enableAIPersonalization: yup.boolean(),
    shareDataForPersonalization: yup.boolean(),
    privacySettings: yup.object({
      shareProgress: yup.boolean(),
      allowAnalytics: yup.boolean(),
      allowPersonalization: yup.boolean(),
      dataRetentionConsent: yup.boolean(),
    }),
    accessibilitySettings: yup.object({
      fontSize: yup.string().oneOf(['small', 'medium', 'large', 'extra_large']),
      highContrast: yup.boolean(),
      reduceMotion: yup.boolean(),
      screenReaderOptimized: yup.boolean(),
    }),
  }).optional(),
});

// Check-In Validation Schema
export const checkInSchema = yup.object({
  id: yup.string().required('ID is required'),
  userId: yup.string().required('User ID is required'),
  mood: yup
    .number()
    .required('Mood is required')
    .min(CHECK_IN_CONSTRAINTS.mood.min, 'Mood must be between 1 and 5')
    .max(CHECK_IN_CONSTRAINTS.mood.max, 'Mood must be between 1 and 5')
    .integer('Mood must be a whole number'),
  notes: yup
    .string()
    .max(CHECK_IN_CONSTRAINTS.notes.maxLength, 'Notes too long')
    .nullable(),
  timestamp: yup
    .date()
    .required('Timestamp is required')
    .max(new Date(), 'Timestamp cannot be in the future'),
  energyLevel: yup
    .number()
    .min(CHECK_IN_CONSTRAINTS.energyLevel.min, 'Energy level must be between 1 and 5')
    .max(CHECK_IN_CONSTRAINTS.energyLevel.max, 'Energy level must be between 1 and 5')
    .integer('Energy level must be a whole number')
    .nullable(),
  stressLevel: yup
    .number()
    .min(CHECK_IN_CONSTRAINTS.stressLevel.min, 'Stress level must be between 1 and 5')
    .max(CHECK_IN_CONSTRAINTS.stressLevel.max, 'Stress level must be between 1 and 5')
    .integer('Stress level must be a whole number')
    .nullable(),
  sleepQuality: yup
    .number()
    .min(CHECK_IN_CONSTRAINTS.sleepQuality.min, 'Sleep quality must be between 1 and 5')
    .max(CHECK_IN_CONSTRAINTS.sleepQuality.max, 'Sleep quality must be between 1 and 5')
    .integer('Sleep quality must be a whole number')
    .nullable(),
  tags: yup
    .array()
    .of(yup.string().max(CHECK_IN_CONSTRAINTS.tags.maxLength, 'Tag too long'))
    .max(CHECK_IN_CONSTRAINTS.tags.maxItems, 'Too many tags')
    .nullable(),
  activities: yup
    .array()
    .of(yup.string().max(CHECK_IN_CONSTRAINTS.activities.maxLength, 'Activity name too long'))
    .max(CHECK_IN_CONSTRAINTS.activities.maxItems, 'Too many activities')
    .nullable(),
  symptoms: yup
    .array()
    .of(yup.string().max(CHECK_IN_CONSTRAINTS.symptoms.maxLength, 'Symptom name too long'))
    .max(CHECK_IN_CONSTRAINTS.symptoms.maxItems, 'Too many symptoms')
    .nullable(),
  location: yup.object({
    latitude: yup.number().min(-90).max(90).nullable(),
    longitude: yup.number().min(-180).max(180).nullable(),
    city: yup.string().max(100).nullable(),
    country: yup.string().max(100).nullable(),
    timezone: yup.string().nullable(),
  }).nullable(),
  weather: yup.object({
    temperature: yup.number().min(-50).max(60).nullable(),
    humidity: yup.number().min(0).max(100).nullable(),
    condition: yup.string().max(50).nullable(),
    pressure: yup.number().min(800).max(1200).nullable(),
  }).nullable(),
  medications: yup.array().of(yup.object({
    name: yup.string().required('Medication name is required').max(100),
    dosage: yup.string().max(50).nullable(),
    time: yup.string().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
    taken: yup.boolean().required(),
    notes: yup.string().max(200).nullable(),
  })).nullable(),
  isPrivate: yup.boolean().default(false),
  createdAt: yup.date().required(),
  updatedAt: yup.date().required(),
});

// Health Goal Validation Schema
export const healthGoalSchema = yup.object({
  id: yup.string().required('ID is required'),
  userId: yup.string().required('User ID is required'),
  title: yup
    .string()
    .required('Goal title is required')
    .min(3, 'Goal title too short')
    .max(100, 'Goal title too long'),
  description: yup
    .string()
    .max(500, 'Goal description too long')
    .nullable(),
  category: yup
    .string()
    .oneOf(['nutrition', 'exercise', 'mental-health', 'sleep', 'wellness'])
    .required('Category is required'),
  targetValue: yup
    .number()
    .positive('Target value must be positive')
    .nullable(),
  currentValue: yup
    .number()
    .min(0, 'Current value cannot be negative')
    .default(0),
  unit: yup
    .string()
    .max(20, 'Unit name too long')
    .nullable(),
  targetDate: yup
    .date()
    .min(new Date(), 'Target date must be in the future')
    .nullable(),
  isActive: yup.boolean().default(true),
  createdAt: yup.date().required(),
  updatedAt: yup.date().required(),
});

// User Engagement Validation Schema
export const userEngagementSchema = yup.object({
  id: yup.string().required('ID is required'),
  tipId: yup.string().required('Tip ID is required'),
  userId: yup.string().required('User ID is required'),
  action: yup
    .string()
    .oneOf(['view', 'like', 'bookmark', 'complete'])
    .required('Action is required'),
  timestamp: yup
    .date()
    .required('Timestamp is required')
    .max(new Date(), 'Timestamp cannot be in the future'),
  sessionId: yup.string().nullable(),
});

// Export all schemas
export const validationSchemas = {
  bioPulseTip: bioPulseTipSchema,
  userProfile: userProfileSchema,
  profileUpdate: profileUpdateSchema,
  onboardingData: onboardingDataSchema,
  healthInterest: healthInterestSchema,
  checkIn: checkInSchema,
  healthGoal: healthGoalSchema,
  userEngagement: userEngagementSchema,
} as const;

// Validation helper functions
export const validateData = async <T>(
  schema: yup.Schema<T>,
  data: unknown
): Promise<{ isValid: boolean; data?: T; errors?: string[] }> => {
  try {
    const validatedData = await schema.validate(data, { abortEarly: false });
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return { isValid: false, errors: error.errors };
    }
    return { isValid: false, errors: ['Validation failed'] };
  }
};

export const validateDataSync = <T>(
  schema: yup.Schema<T>,
  data: unknown
): { isValid: boolean; data?: T; errors?: string[] } => {
  try {
    const validatedData = schema.validateSync(data, { abortEarly: false });
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return { isValid: false, errors: error.errors };
    }
    return { isValid: false, errors: ['Validation failed'] };
  }
};