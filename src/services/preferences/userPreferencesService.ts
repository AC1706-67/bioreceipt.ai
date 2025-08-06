/**
 * User Preferences Service - Stub Implementation
 * This is a placeholder until the full implementation is available
 */

export interface UserPreferences {
  content: {
    categories: Record<string, boolean>;
    difficulty: string;
    personalizedContent: boolean;
  };
}

class UserPreferencesService {
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Stub implementation
    return {
      content: {
        categories: {
          nutrition: true,
          fitness: true,
          mentalWellness: false,
          sleep: true,
          recovery: false,
          hygiene: true
        },
        difficulty: 'intermediate',
        personalizedContent: true
      }
    };
  }
}

export const userPreferencesService = new UserPreferencesService();