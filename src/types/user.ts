/**
 * User-related TypeScript interfaces
 * Based on design document data models
 */

export type AuthMethod = 'email' | 'phone' | 'google' | 'apple';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type HealthCategory = 'nutrition' | 'mental_wellness' | 'fitness' | 'sleep' | 'recovery' | 'hygiene';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface HealthInterest {
  category: HealthCategory;
  level: SkillLevel;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyTipTime: string; // HH:MM format
  streakReminders: boolean;
  encouragementMessages: boolean;
  timezone: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  age: number;
  gender: Gender;
  healthInterests: HealthInterest[];
  notificationPreferences: NotificationSettings;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface AuthCredentials {
  email?: string;
  phone?: string;
  password?: string;
  token?: string; // For OAuth
}

export interface UserRegistration {
  name: string;
  age: number;
  gender: Gender;
  healthInterests: HealthInterest[];
  authMethod: AuthMethod;
  credentials: AuthCredentials;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  token?: string;
  refreshToken?: string;
  error?: string;
}