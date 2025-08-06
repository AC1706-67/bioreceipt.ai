/**
 * User Preferences Hook
 * React hook for managing user preferences state
 */
import { useState, useEffect, useCallback } from 'react';
import { userPreferencesService } from '../services/preferences/userPreferencesService';
import { UserPreferences, UserPreferencesUpdate } from '../models/UserPreferences';

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: UserPreferencesUpdate) => Promise<void>;
  resetPreferences: () => Promise<void>;
  exportPreferences: () => Promise<string>;
  importPreferences: (data: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserPreferences = (userId: string): UseUserPreferencesReturn => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const userPrefs = await userPreferencesService.getUserPreferences(userId);
      setPreferences(userPrefs);
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updatePreferences = useCallback(async (updates: UserPreferencesUpdate) => {
    if (!userId) return;

    try {
      setError(null);
      const updatedPrefs = await userPreferencesService.updateUserPreferences(userId, updates);
      setPreferences(updatedPrefs);
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err; // Re-throw so UI can handle it
    }
  }, [userId]);

  const resetPreferences = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);
      const defaultPrefs = await userPreferencesService.resetPreferences(userId);
      setPreferences(defaultPrefs);
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
      throw err;
    }
  }, [userId]);

  const exportPreferences = useCallback(async (): Promise<string> => {
    if (!userId) throw new Error('User ID is required');

    try {
      setError(null);
      return await userPreferencesService.exportPreferences(userId);
    } catch (err) {
      console.error('Error exporting preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to export preferences';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userId]);

  const importPreferences = useCallback(async (data: string) => {
    if (!userId) return;

    try {
      setError(null);
      const importedPrefs = await userPreferencesService.importPreferences(userId, data);
      setPreferences(importedPrefs);
    } catch (err) {
      console.error('Error importing preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to import preferences');
      throw err;
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
    refresh
  };
};

// Hook for getting content filter based on user preferences
export const useContentFilter = (userId: string) => {
  const [filter, setFilter] = useState<{
    categories: string[];
    difficulty?: string;
    maxReadingTime?: number;
    personalizedContent: boolean;
    aiRecommendations: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFilter = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const contentFilter = await userPreferencesService.getContentFilter(userId);
        setFilter(contentFilter);
      } catch (error) {
        console.error('Error loading content filter:', error);
        // Set permissive defaults on error
        setFilter({
          categories: ['nutrition', 'fitness', 'mentalWellness', 'sleep', 'recovery', 'hygiene'],
          personalizedContent: true,
          aiRecommendations: true
        });
      } finally {
        setLoading(false);
      }
    };

    loadFilter();
  }, [userId]);

  return { filter, loading };
};

// Hook for checking notification permissions
export const useNotificationPermissions = (userId: string) => {
  const checkPermission = useCallback(async (notificationType: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      return await userPreferencesService.canSendNotification(userId, notificationType);
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }, [userId]);

  const getFrequency = useCallback(async (): Promise<'low' | 'medium' | 'high'> => {
    if (!userId) return 'medium';

    try {
      return await userPreferencesService.getNotificationFrequency(userId);
    } catch (error) {
      console.error('Error getting notification frequency:', error);
      return 'medium';
    }
  }, [userId]);

  return { checkPermission, getFrequency };
};