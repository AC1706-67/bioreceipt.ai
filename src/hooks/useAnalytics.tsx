/**
 * Analytics Hook
 * React hook for easy analytics integration throughout the app
 */
import React, { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AnalyticsService, AnalyticsEventType, AnalyticsPrivacySettings } from '../services/analytics/analyticsService';

interface UseAnalyticsOptions {
  enableAutoTracking?: boolean;
  trackScreenViews?: boolean;
  trackAppStateChanges?: boolean;
  userId?: string;
}

interface UseAnalyticsReturn {
  trackEvent: (
    type: AnalyticsEventType,
    properties?: Record<string, any>
  ) => Promise<void>;
  trackTipEngagement: (
    tipId: string,
    action: 'view' | 'like' | 'bookmark' | 'complete' | 'share',
    additionalProperties?: Record<string, any>
  ) => Promise<void>;
  trackScreenView: (
    screenName: string,
    additionalProperties?: Record<string, any>
  ) => Promise<void>;
  trackUserAction: (
    action: string,
    additionalProperties?: Record<string, any>
  ) => Promise<void>;
  trackPerformanceMetric: (
    metricName: string,
    value: number,
    unit?: string,
    additionalProperties?: Record<string, any>
  ) => Promise<void>;
  trackError: (
    error: Error,
    context: string,
    additionalProperties?: Record<string, any>
  ) => Promise<void>;
  updatePrivacySettings: (settings: Partial<AnalyticsPrivacySettings>) => Promise<void>;
  getPrivacySettings: () => AnalyticsPrivacySettings;
  isAnalyticsEnabled: boolean;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}): UseAnalyticsReturn => {
  const {
    enableAutoTracking = true,
    trackScreenViews = true,
    trackAppStateChanges = true,
    userId
  } = options;

  const analyticsService = AnalyticsService.getInstance();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const screenStartTimeRef = useRef<Date>(new Date());
  const currentScreenRef = useRef<string>('');

  // Initialize analytics service
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        await analyticsService.initialize();
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      }
    };

    initializeAnalytics();
  }, []);

  // Track app state changes
  useEffect(() => {
    if (!enableAutoTracking || !trackAppStateChanges) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      try {
        if (previousState === 'background' && nextAppState === 'active') {
          await analyticsService.trackEvent('app_open', {
            previousState,
            timestamp: new Date().toISOString()
          }, userId);
        } else if (previousState === 'active' && nextAppState === 'background') {
          await analyticsService.trackEvent('app_close', {
            previousState,
            sessionDuration: Date.now() - screenStartTimeRef.current.getTime(),
            timestamp: new Date().toISOString()
          }, userId);
        }
      } catch (error) {
        console.error('Failed to track app state change:', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [enableAutoTracking, trackAppStateChanges, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Flush any remaining events when component unmounts
      analyticsService.flushEvents().catch(error => {
        console.error('Failed to flush analytics events on unmount:', error);
      });
    };
  }, []);

  // Track event wrapper
  const trackEvent = useCallback(async (
    type: AnalyticsEventType,
    properties: Record<string, any> = {}
  ): Promise<void> => {
    try {
      await analyticsService.trackEvent(type, properties, userId);
    } catch (error) {
      console.error('Failed to track event:', error);
      // Don't throw to avoid disrupting app functionality
    }
  }, [userId]);

  // Track tip engagement
  const trackTipEngagement = useCallback(async (
    tipId: string,
    action: 'view' | 'like' | 'bookmark' | 'complete' | 'share',
    additionalProperties: Record<string, any> = {}
  ): Promise<void> => {
    try {
      await analyticsService.trackTipEngagement(
        tipId,
        action,
        userId,
        additionalProperties
      );
    } catch (error) {
      console.error('Failed to track tip engagement:', error);
    }
  }, [userId]);

  // Track screen view
  const trackScreenView = useCallback(async (
    screenName: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> => {
    try {
      // Track previous screen duration if available
      if (currentScreenRef.current && trackScreenViews) {
        const screenDuration = Date.now() - screenStartTimeRef.current.getTime();
        await analyticsService.trackEvent('screen_view', {
          screenName: currentScreenRef.current,
          screenDuration,
          exitTimestamp: new Date().toISOString(),
          ...additionalProperties
        }, userId);
      }

      // Update current screen tracking
      currentScreenRef.current = screenName;
      screenStartTimeRef.current = new Date();

      // Track new screen view
      if (trackScreenViews) {
        await analyticsService.trackScreenView(screenName, userId, {
          enterTimestamp: new Date().toISOString(),
          ...additionalProperties
        });
      }
    } catch (error) {
      console.error('Failed to track screen view:', error);
    }
  }, [userId, trackScreenViews]);

  // Track user action
  const trackUserAction = useCallback(async (
    action: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> => {
    try {
      await analyticsService.trackUserAction(action, userId, {
        screenName: currentScreenRef.current,
        timestamp: new Date().toISOString(),
        ...additionalProperties
      });
    } catch (error) {
      console.error('Failed to track user action:', error);
    }
  }, [userId]);

  // Track performance metric
  const trackPerformanceMetric = useCallback(async (
    metricName: string,
    value: number,
    unit: string = 'ms',
    additionalProperties: Record<string, any> = {}
  ): Promise<void> => {
    try {
      await analyticsService.trackPerformanceMetric(
        metricName,
        value,
        unit,
        {
          screenName: currentScreenRef.current,
          timestamp: new Date().toISOString(),
          ...additionalProperties
        }
      );
    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }, []);

  // Track error
  const trackError = useCallback(async (
    error: Error,
    context: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> => {
    try {
      await analyticsService.trackError(error, context, userId, {
        screenName: currentScreenRef.current,
        timestamp: new Date().toISOString(),
        ...additionalProperties
      });
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }, [userId]);

  // Update privacy settings
  const updatePrivacySettings = useCallback(async (
    settings: Partial<AnalyticsPrivacySettings>
  ): Promise<void> => {
    try {
      await analyticsService.updatePrivacySettings(settings);
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      throw error;
    }
  }, []);

  // Get privacy settings
  const getPrivacySettings = useCallback((): AnalyticsPrivacySettings => {
    return analyticsService.getPrivacySettings();
  }, []);

  // Check if analytics is enabled
  const isAnalyticsEnabled = analyticsService.getPrivacySettings().enableAnalytics;

  return {
    trackEvent,
    trackTipEngagement,
    trackScreenView,
    trackUserAction,
    trackPerformanceMetric,
    trackError,
    updatePrivacySettings,
    getPrivacySettings,
    isAnalyticsEnabled
  };
};

// Higher-order component for automatic screen tracking
export const withAnalytics = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string,
  options: UseAnalyticsOptions = {}
) => {
  return (props: P) => {
    const { trackScreenView } = useAnalytics(options);

    useEffect(() => {
      trackScreenView(screenName);
    }, []);

    return <WrappedComponent {...props} />;
  };
};

// Hook for performance timing
export const usePerformanceTimer = (metricName: string, userId?: string) => {
  const { trackPerformanceMetric } = useAnalytics({ userId });
  const startTimeRef = useRef<number | null>(null);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const end = useCallback(async (additionalProperties?: Record<string, any>) => {
    if (startTimeRef.current !== null) {
      const duration = performance.now() - startTimeRef.current;
      await trackPerformanceMetric(metricName, duration, 'ms', additionalProperties);
      startTimeRef.current = null;
    }
  }, [metricName, trackPerformanceMetric]);

  const measure = useCallback(async (
    operation: () => Promise<any>,
    additionalProperties?: Record<string, any>
  ): Promise<any> => {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      await trackPerformanceMetric(metricName, duration, 'ms', {
        success: true,
        ...additionalProperties
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      await trackPerformanceMetric(metricName, duration, 'ms', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...additionalProperties
      });
      throw error;
    }
  }, [metricName, trackPerformanceMetric]);

  return { start, end, measure };
};

// Hook for error boundary analytics
export const useErrorBoundaryAnalytics = (userId?: string) => {
  const { trackError } = useAnalytics({ userId });

  const logError = useCallback(async (
    error: Error,
    errorInfo: { componentStack: string },
    additionalProperties?: Record<string, any>
  ) => {
    await trackError(error, 'error_boundary', {
      componentStack: errorInfo.componentStack,
      ...additionalProperties
    });
  }, [trackError]);

  return { logError };
};