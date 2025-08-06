/**
 * Data transformation utilities
 * Functions for converting between different data formats
 */

import { UserProfile, HealthTip, UserEngagement, UserProgress, HealthCategory } from '../types';

/**
 * Sanitize user input by removing potentially harmful content
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

/**
 * Sanitize user profile data
 */
export const sanitizeUserProfile = (profile: Partial<UserProfile>): Partial<UserProfile> => {
  return {
    ...profile,
    name: profile.name ? sanitizeString(profile.name) : undefined,
    email: profile.email ? sanitizeString(profile.email.toLowerCase()) : undefined,
    phone: profile.phone ? sanitizeString(profile.phone.replace(/\D/g, '')) : undefined,
  };
};

/**
 * Sanitize health tip content
 */
export const sanitizeHealthTip = (tip: Partial<HealthTip>): Partial<HealthTip> => {
  return {
    ...tip,
    title: tip.title ? sanitizeString(tip.title) : undefined,
    content: tip.content ? sanitizeString(tip.content) : undefined,
    tags: tip.tags ? tip.tags.map(tag => sanitizeString(tag)) : undefined,
  };
};

/**
 * Convert API date strings to Date objects
 */
export const parseApiDates = <T extends Record<string, any>>(
  data: T,
  dateFields: (keyof T)[]
): T => {
  const result = { ...data };
  
  dateFields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = new Date(result[field] as string) as T[keyof T];
    }
  });
  
  return result;
};

/**
 * Type guard to check if value is a Date
 */
const isDate = (value: any): value is Date => {
  return value instanceof Date;
};

/**
 * Convert Date objects to ISO strings for API
 */
export const serializeApiDates = <T extends Record<string, any>>(
  data: T,
  dateFields: (keyof T)[]
): T => {
  const result = { ...data };
  
  dateFields.forEach(field => {
    const value = result[field];
    if (isDate(value)) {
      result[field] = value.toISOString() as T[keyof T];
    }
  });
  
  return result;
};

/**
 * Transform user profile from API response
 */
export const transformUserProfileFromApi = (apiData: any): UserProfile => {
  return parseApiDates(
    {
      ...apiData,
      healthInterests: apiData.health_interests || [],
      notificationPreferences: apiData.notification_preferences || {},
      lastLogin: apiData.last_login,
      isActive: apiData.is_active,
    },
    ['createdAt', 'updatedAt', 'lastLogin']
  );
};

/**
 * Transform user profile for API request
 */
export const transformUserProfileForApi = (profile: UserProfile): any => {
  return serializeApiDates(
    {
      ...profile,
      health_interests: profile.healthInterests,
      notification_preferences: profile.notificationPreferences,
      last_login: profile.lastLogin,
      is_active: profile.isActive,
    },
    ['createdAt', 'updatedAt', 'lastLogin']
  );
};

/**
 * Transform health tip from API response
 */
export const transformHealthTipFromApi = (apiData: any): HealthTip => {
  return parseApiDates(
    {
      ...apiData,
      imageUrl: apiData.image_url,
      estimatedReadTime: apiData.estimated_read_time,
      createdBy: apiData.created_by,
      isActive: apiData.is_active,
    },
    ['createdAt', 'updatedAt']
  );
};

/**
 * Transform health tip for API request
 */
export const transformHealthTipForApi = (tip: HealthTip): any => {
  return serializeApiDates(
    {
      ...tip,
      image_url: tip.imageUrl,
      estimated_read_time: tip.estimatedReadTime,
      created_by: tip.createdBy,
      is_active: tip.isActive,
    },
    ['createdAt', 'updatedAt']
  );
};

/**
 * Transform user engagement from API response
 */
export const transformUserEngagementFromApi = (apiData: any): UserEngagement => {
  return parseApiDates(
    {
      ...apiData,
      tipId: apiData.tip_id,
      userId: apiData.user_id,
      sessionId: apiData.session_id,
    },
    ['timestamp']
  );
};

/**
 * Transform user progress from API response
 */
export const transformUserProgressFromApi = (apiData: any): UserProgress => {
  return parseApiDates(
    {
      ...apiData,
      userId: apiData.user_id,
      currentStreak: apiData.current_streak,
      longestStreak: apiData.longest_streak,
      totalTipsCompleted: apiData.total_tips_completed,
      lastActivityDate: apiData.last_activity_date,
    },
    ['lastActivityDate', 'createdAt', 'updatedAt']
  );
};

/**
 * Calculate engagement score based on user actions
 */
export const calculateEngagementScore = (engagements: UserEngagement[]): number => {
  if (engagements.length === 0) return 0;
  
  const weights = {
    view: 0.1,
    like: 0.3,
    bookmark: 0.5,
    complete: 1.0,
  };
  
  const totalScore = engagements.reduce((sum, engagement) => {
    return sum + (weights[engagement.action] || 0);
  }, 0);
  
  return Math.min(totalScore / engagements.length, 1.0);
};

/**
 * Get user's favorite health category based on engagement
 */
export const getFavoriteCategory = (
  tips: HealthTip[],
  engagements: UserEngagement[]
): HealthCategory | null => {
  const categoryScores: Record<HealthCategory, number> = {
    nutrition: 0,
    mental_wellness: 0,
    fitness: 0,
    sleep: 0,
    recovery: 0,
    hygiene: 0,
  };
  
  engagements.forEach(engagement => {
    const tip = tips.find(t => t.id === engagement.tipId);
    if (tip) {
      const weight = engagement.action === 'complete' ? 2 : 1;
      categoryScores[tip.category] += weight;
    }
  });
  
  const maxScore = Math.max(...Object.values(categoryScores));
  if (maxScore === 0) return null;
  
  return Object.entries(categoryScores).find(([_, score]) => score === maxScore)?.[0] as HealthCategory || null;
};

/**
 * Format time duration in human-readable format
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 1) return 'Less than 1 minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Generate a unique reference number for feedback
 */
export const generateReferenceNumber = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `HT-${timestamp}-${random}`.toUpperCase();
};