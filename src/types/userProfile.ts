/**
 * User Profile Types
 * Type definitions for user profiles and related data structures
 */

export type HealthCategory = 'nutrition' | 'mental_wellness' | 'fitness' | 'sleep' | 'recovery' | 'hygiene';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type TipDifficulty = 'easy' | 'medium' | 'hard';
export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
export type OnboardingStep = 'welcome' | 'basic_info' | 'health_interests' | 'goals' | 'preferences' | 'complete';

export interface UserProfile {
  id: string;
  // Basic Information
  name: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  
  // Demographics (for personalization)
  age?: number;
  gender?: Gender;
  
  // Health Profile
  healthInterests: HealthInterest[];
  goals: string[]; // e.g., ['weight_loss', 'energy', 'stress_reduction']
  
  // System Fields
  timezone: string;
  language: string;
  preferences: UserPreferences;
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStep;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthInterest {
  category: HealthCategory;
  level: SkillLevel;
  priority: number; // 1-5, higher = more important
}

export interface OnboardingData {
  // Step 1: Basic Info
  name?: string;
  age?: number;
  gender?: Gender;
  
  // Step 2: Health Interests
  healthInterests?: HealthInterest[];
  
  // Step 3: Goals
  goals?: string[];
  
  // Step 4: Preferences
  preferences?: Partial<UserPreferences>;
  
  // Progress tracking
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  startedAt: Date;
  completedAt?: Date;
}

export interface UserPreferences {
  // Notifications
  notificationsEnabled: boolean;
  dailyTipTime: string; // HH:MM format (e.g., "09:00")
  weeklyGoal: number; // tips per week (1-7)
  
  // Content Preferences
  preferredCategories: HealthCategory[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  
  // Personalization
  enableAIPersonalization: boolean;
  shareDataForPersonalization: boolean;
  
  // Privacy & Security
  privacySettings: PrivacySettings;
  
  // Accessibility
  accessibilitySettings: AccessibilitySettings;
}

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra_large';
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
}

export interface PrivacySettings {
  shareProgress: boolean;
  allowAnalytics: boolean;
  allowPersonalization: boolean;
  dataRetentionConsent: boolean;
}

export interface HealthGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: HealthCategory;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  targetDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// OAuth Provider Types
export interface OAuthProvider {
  provider: 'google' | 'apple' | 'facebook';
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

// Profile Update Types
export interface ProfileUpdateData {
  name?: string;
  age?: number;
  gender?: Gender;
  healthInterests?: HealthInterest[];
  goals?: string[];
  preferences?: Partial<UserPreferences>;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Common Goal Options
export const COMMON_GOALS = [
  'weight_loss',
  'weight_gain',
  'muscle_building',
  'energy_boost',
  'stress_reduction',
  'better_sleep',
  'mental_clarity',
  'immune_support',
  'heart_health',
  'digestive_health',
  'flexibility',
  'endurance',
  'recovery',
  'habit_building',
  'overall_wellness',
] as const;

export type CommonGoal = typeof COMMON_GOALS[number];

export interface UserStats {
  userId: string;
  totalTipsViewed: number;
  totalTipsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  favoriteCategory: string;
  averageEngagementScore: number;
  lastActivityAt: Date;
  joinedAt: Date;
}

// Validation constraints
export const USER_PROFILE_CONSTRAINTS = {
  name: {
    minLength: 2,
    maxLength: 50,
    required: true,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: true,
  },
  phoneNumber: {
    pattern: /^\+?[\d\s\-\(\)]+$/,
    required: false,
  },
  age: {
    min: 13,
    max: 120,
    required: false,
  },
  healthInterests: {
    minItems: 1,
    maxItems: 6,
    required: true,
  },
  goals: {
    minItems: 1,
    maxItems: 5,
    required: true,
  },
  timezone: {
    required: true,
    default: 'UTC',
  },
  language: {
    required: true,
    default: 'en',
  },
} as const;

// Default values for new profiles
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  dailyTipTime: '09:00',
  weeklyGoal: 5,
  preferredCategories: [],
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
};

// Health Interest Categories with descriptions
export const HEALTH_CATEGORIES_INFO = {
  nutrition: {
    title: 'Nutrition',
    description: 'Healthy eating, meal planning, and dietary guidance',
    icon: '🥗',
  },
  mental_wellness: {
    title: 'Mental Wellness',
    description: 'Stress management, mindfulness, and emotional health',
    icon: '🧠',
  },
  fitness: {
    title: 'Fitness',
    description: 'Exercise routines, workouts, and physical activity',
    icon: '💪',
  },
  sleep: {
    title: 'Sleep',
    description: 'Sleep hygiene, rest, and recovery',
    icon: '😴',
  },
  recovery: {
    title: 'Recovery',
    description: 'Injury prevention, rehabilitation, and healing',
    icon: '🔄',
  },
  hygiene: {
    title: 'Hygiene',
    description: 'Personal care, cleanliness, and health maintenance',
    icon: '🧼',
  },
} as const;