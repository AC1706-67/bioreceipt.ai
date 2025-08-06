/**
 * usePersonalization Hook
 * React hook for AI-powered personalized health tips
 */

import { useState, useEffect, useCallback } from 'react';
import { HealthTip } from '../types';
import { useAppSelector } from './redux';
import { selectUser } from '../store/authSlice';
import { loggingService } from '../services/logging/loggingService';

export interface PersonalizedTipsResponse {
  tips: HealthTip[];
  personalizationScore: number;
  reasoning: string;
  fallbackUsed: boolean;
  processingTimeMs?: number;
}

export interface PersonalizationFeedback {
  tipId: string;
  feedback: 'positive' | 'negative';
  reasoning?: string;
}

export interface UsePersonalizationOptions {
  count?: number;
  autoLoad?: boolean;
  refreshInterval?: number; // in minutes
}

export interface UsePersonalizationReturn {
  // Data
  personalizedTips: HealthTip[];
  loading: boolean;
  error: string | null;
  personalizationScore: number;
  reasoning: string;
  fallbackUsed: boolean;
  
  // Actions
  loadPersonalizedTips: (forceRefresh?: boolean) => Promise<void>;
  refreshTips: () => Promise<void>;
  submitFeedback: (feedback: PersonalizationFeedback) => Promise<void>;
  
  // Profile management
  profile: any;
  updatePreferences: (preferences: any) => Promise<void>;
  loadProfile: () => Promise<void>;
}

export const usePersonalization = (options: UsePersonalizationOptions = {}): UsePersonalizationReturn => {
  const { count = 3, autoLoad = true, refreshInterval } = options;
  
  const user = useAppSelector(selectUser);
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  
  // State
  const [personalizedTips, setPersonalizedTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalizationScore, setPersonalizationScore] = useState(0);
  const [reasoning, setReasoning] = useState('');
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Get authentication headers
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const token = localStorage.getItem('authToken'); // Simplified token retrieval
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      };
    } catch (error) {
      await loggingService.logWarning('Failed to get auth token for personalization request', { error });
      return {
        'Content-Type': 'application/json',
      };
    }
  }, []);

  // Load personalized tips
  const loadPersonalizedTips = useCallback(async (forceRefresh = false) => {
    if (!user || loading) return;
    
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const params = new URLSearchParams({
        count: count.toString(),
        ...(forceRefresh && { refresh: 'true' }),
      });

      const response = await fetch(`${baseUrl}/personalization/tips?${params}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setPersonalizedTips(data.data.tips);
        setPersonalizationScore(data.data.personalizationScore);
        setReasoning(data.data.reasoning);
        setFallbackUsed(data.data.fallbackUsed);

        await loggingService.logInfo('Personalized tips loaded successfully', {
          userId: user.id,
          count: data.data.tips.length,
          personalizationScore: data.data.personalizationScore,
          fallbackUsed: data.data.fallbackUsed,
        });
      } else {
        throw new Error(data.error?.message || 'Failed to load personalized tips');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load personalized tips';
      setError(errorMessage);
      await loggingService.logError('Failed to load personalized tips', err as Error, {
        userId: user?.id,
        count,
      });
    } finally {
      setLoading(false);
    }
  }, [user, loading, count, baseUrl, getAuthHeaders]);

  // Refresh tips (force reload)
  const refreshTips = useCallback(async () => {
    await loadPersonalizedTips(true);
  }, [loadPersonalizedTips]);

  // Submit feedback
  const submitFeedback = useCallback(async (feedback: PersonalizationFeedback) => {
    if (!user) {
      setError('User must be logged in to submit feedback');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${baseUrl}/personalization/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to submit feedback');
      }

      await loggingService.logInfo('Personalization feedback submitted', {
        userId: user.id,
        tipId: feedback.tipId,
        feedback: feedback.feedback,
      });

      // Optionally refresh tips after feedback to improve future recommendations
      // await loadPersonalizedTips(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      await loggingService.logError('Failed to submit personalization feedback', err as Error, {
        userId: user.id,
        feedback,
      });
      throw err;
    }
  }, [user, baseUrl, getAuthHeaders]);

  // Load user profile
  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${baseUrl}/personalization/profile`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to load profile');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setProfile(data.data);
      }
    } catch (err) {
      await loggingService.logError('Failed to load personalization profile', err as Error, {
        userId: user.id,
      });
    }
  }, [user, baseUrl, getAuthHeaders]);

  // Update preferences
  const updatePreferences = useCallback(async (preferences: any) => {
    if (!user) {
      throw new Error('User must be logged in to update preferences');
    }

    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${baseUrl}/personalization/preferences`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to update preferences');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setProfile(data.data);
        
        // Refresh personalized tips with new preferences
        await loadPersonalizedTips(true);

        await loggingService.logInfo('Personalization preferences updated', {
          userId: user.id,
          preferences,
        });
      }
    } catch (err) {
      await loggingService.logError('Failed to update personalization preferences', err as Error, {
        userId: user.id,
        preferences,
      });
      throw err;
    }
  }, [user, baseUrl, getAuthHeaders, loadPersonalizedTips]);

  // Auto-load on mount and user changes
  useEffect(() => {
    if (autoLoad && user) {
      loadPersonalizedTips();
      loadProfile();
    }
  }, [user, autoLoad]); // Note: loadPersonalizedTips not in deps to avoid infinite loop

  // Set up refresh interval
  useEffect(() => {
    if (!refreshInterval || !user) return;

    const interval = setInterval(() => {
      loadPersonalizedTips(true);
    }, refreshInterval * 60 * 1000); // Convert minutes to milliseconds

    return () => clearInterval(interval);
  }, [refreshInterval, user]); // Note: loadPersonalizedTips not in deps

  return {
    // Data
    personalizedTips,
    loading,
    error,
    personalizationScore,
    reasoning,
    fallbackUsed,
    profile,
    
    // Actions
    loadPersonalizedTips: () => loadPersonalizedTips(false),
    refreshTips,
    submitFeedback,
    updatePreferences,
    loadProfile,
  };
};

/**
 * Hook for personalization feedback UI
 */
export const usePersonalizationFeedback = () => {
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const { submitFeedback } = usePersonalization({ autoLoad: false });

  const handleFeedback = useCallback(async (
    tipId: string,
    feedback: 'positive' | 'negative',
    reasoning?: string
  ) => {
    try {
      setSubmittingFeedback(tipId);
      setFeedbackError(null);
      setFeedbackSuccess(null);

      await submitFeedback({ tipId, feedback, reasoning });
      
      setFeedbackSuccess(`Thank you for your ${feedback} feedback!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback';
      setFeedbackError(errorMessage);
      
      // Clear error message after 5 seconds
      setTimeout(() => setFeedbackError(null), 5000);
    } finally {
      setSubmittingFeedback(null);
    }
  }, [submitFeedback]);

  return {
    handleFeedback,
    submittingFeedback,
    feedbackError,
    feedbackSuccess,
  };
};