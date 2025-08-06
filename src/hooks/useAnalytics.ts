/**
 * Analytics Hook
 * Custom hook for consistent analytics tracking across components
 */

import { useCallback, useEffect } from 'react';
import { analyticsService } from '../services/analytics/analyticsService';

interface UseAnalyticsProps {
  userId?: string;
  screenName?: string;
}

export const useAnalytics = ({ userId, screenName }: UseAnalyticsProps = {}) => {
  // Track screen view when component mounts
  useEffect(() => {
    if (screenName) {
      analyticsService.trackScreenView(screenName, userId);
    }
  }, [screenName, userId]);

  // Track tip interactions
  const trackTipInteraction = useCallback((
    interactionType: 'view' | 'like' | 'bookmark' | 'complete' | 'share',
    tipId: string,
    tipData: { title?: string; category?: string }
  ) => {
    analyticsService.trackTipInteraction(interactionType, tipId, tipData, userId);
  }, [userId]);

  // Track search
  const trackSearch = useCallback((query: string, resultsCount: number) => {
    analyticsService.trackSearch(query, resultsCount, userId);
  }, [userId]);

  // Track custom events
  const trackEvent = useCallback((eventType: string, eventData: any = {}) => {
    analyticsService.trackEvent(eventType as any, {
      ...eventData,
      userId
    });
  }, [userId]);

  // Track performance metrics
  const trackPerformance = useCallback((metric: string, value: number, additionalData: any = {}) => {
    analyticsService.trackPerformance(metric, value, {
      ...additionalData,
      userId
    });
  }, [userId]);

  // Track errors
  const trackError = useCallback((error: Error, context?: string) => {
    analyticsService.trackEvent('error_occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      userId
    });
  }, [userId]);

  // Track session events
  const trackSessionStart = useCallback(() => {
    analyticsService.trackEvent('app_launch', {
      userId,
      timestamp: new Date().toISOString()
    });
  }, [userId]);

  const trackSessionEnd = useCallback(() => {
    analyticsService.trackSessionEnd(userId);
  }, [userId]);

  return {
    trackTipInteraction,
    trackSearch,
    trackEvent,
    trackPerformance,
    trackError,
    trackSessionStart,
    trackSessionEnd
  };
};

export default useAnalytics;