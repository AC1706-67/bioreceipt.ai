/**
 * HealthTip Data Model
 * Comprehensive model for health tips with validation and CRUD operations
 */

export interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: HealthTipCategory;
  difficulty: DifficultyLevel;
  estimatedReadTime: number; // in minutes
  tags: string[];
  imageUrl?: string;
  videoUrl?: string;
  author: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  priority: number; // 1-10, higher = more important
  seasonality?: string[]; // e.g., ['spring', 'summer']
  targetAudience?: string[]; // e.g., ['beginners', 'seniors']
  relatedTips?: string[]; // IDs of related tips
  metadata: HealthTipMetadata;
  // Additional properties for AI and analytics
  viewCount?: number;
  shareCount?: number;
  confidenceScore?: number; // AI confidence in tip relevance (0-1)
}

export interface HealthTipMetadata {
  views: number;
  likes: number;
  bookmarks: number;
  completions: number;
  shares: number;
  averageRating: number;
  ratingCount: number;
  lastInteractionDate?: Date;
  engagementScore: number;
}

export enum HealthTipCategory {
  NUTRITION = 'nutrition',
  FITNESS = 'fitness',
  MENTAL_WELLNESS = 'mental_wellness',
  SLEEP = 'sleep',
  RECOVERY = 'recovery',
  HYGIENE = 'hygiene',
  GENERAL = 'general'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export interface HealthTipFilter {
  category?: HealthTipCategory;
  difficulty?: DifficultyLevel;
  tags?: string[];
  maxReadTime?: number;
  minRating?: number;
  isActive?: boolean;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface HealthTipSortOptions {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'engagementScore' | 'averageRating';
  direction: 'asc' | 'desc';
}

export interface UserHealthTipInteraction {
  userId: string;
  tipId: string;
  interactionType: 'view' | 'like' | 'bookmark' | 'complete' | 'share' | 'rate' | 'skip';
  timestamp: Date;
  metadata?: {
    rating?: number;
    timeSpent?: number;
    completionPercentage?: number;
    shareDestination?: string;
  };
}

export interface HealthTipEngagement {
  tipId: string;
  totalViews: number;
  uniqueViews: number;
  totalLikes: number;
  totalBookmarks: number;
  totalCompletions: number;
  totalShares: number;
  averageTimeSpent: number;
  averageCompletionRate: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  lastCalculated: Date;
}

// Validation schemas
export const HealthTipValidationSchema = {
  id: {
    required: true,
    type: 'string',
    minLength: 1
  },
  title: {
    required: true,
    type: 'string',
    minLength: 5,
    maxLength: 200
  },
  content: {
    required: true,
    type: 'string',
    minLength: 20,
    maxLength: 5000
  },
  category: {
    required: true,
    type: 'enum',
    values: Object.values(HealthTipCategory)
  },
  difficulty: {
    required: true,
    type: 'enum',
    values: Object.values(DifficultyLevel)
  },
  estimatedReadTime: {
    required: true,
    type: 'number',
    min: 1,
    max: 60
  },
  tags: {
    required: true,
    type: 'array',
    minItems: 1,
    maxItems: 10
  },
  author: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100
  },
  priority: {
    required: true,
    type: 'number',
    min: 1,
    max: 10
  }
};

export class HealthTipValidator {
  static validate(tip: Partial<HealthTip>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!tip.id || tip.id.trim().length === 0) {
      errors.push('ID is required');
    }

    if (!tip.title || tip.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters long');
    }

    if (!tip.content || tip.content.trim().length < 20) {
      errors.push('Content must be at least 20 characters long');
    }

    if (!tip.category || !Object.values(HealthTipCategory).includes(tip.category)) {
      errors.push('Valid category is required');
    }

    if (!tip.difficulty || !Object.values(DifficultyLevel).includes(tip.difficulty)) {
      errors.push('Valid difficulty level is required');
    }

    if (!tip.estimatedReadTime || tip.estimatedReadTime < 1 || tip.estimatedReadTime > 60) {
      errors.push('Estimated read time must be between 1 and 60 minutes');
    }

    if (!tip.tags || !Array.isArray(tip.tags) || tip.tags.length === 0) {
      errors.push('At least one tag is required');
    }

    if (!tip.author || tip.author.trim().length < 2) {
      errors.push('Author name must be at least 2 characters long');
    }

    if (tip.priority !== undefined && (tip.priority < 1 || tip.priority > 10)) {
      errors.push('Priority must be between 1 and 10');
    }

    // Validate URLs if provided
    if (tip.imageUrl && !this.isValidUrl(tip.imageUrl)) {
      errors.push('Invalid image URL format');
    }

    if (tip.videoUrl && !this.isValidUrl(tip.videoUrl)) {
      errors.push('Invalid video URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeContent(content: string): string {
    // Basic HTML sanitization - remove potentially harmful tags
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}