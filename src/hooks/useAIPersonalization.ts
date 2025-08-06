/**
 * AI Personalization Hook
 * React hook for using AI personalization features
 */
import { useState, useEffect, useCallback } from 'react';
import { aiPersonalizationIntegrationService, PersonalizationResult } from '../services/ai/aiPersonalizationIntegrationService';
import { HealthTip } from '../models/HealthTip';

interface UseAIPersonalizationReturn {
  personalizedTips: HealthTip[];
  loading: boolean;
  error: string | null;
  confidence: number;
  fallbackUsed: boolean;
  reasoning: string[];
  refreshTips: () => Promise<void>;
  recordEngagement: (tipId: string, engagementType: 'view' | 'like' | 'complete' | 'bookmark' | 'skip' | 'share', data?: any) => Promise<void>;
  insights: {
    profileCompleteness: number;
    engagementScore: number;
    preferredCategories: string[];
    recommendedImprovements: string[];
    personalizationAccuracy: number;
  } | null;
  aiServiceHealth: {
    available: boolean;
    responseTime: number;
    version: string;
    capabilities: string[];
  } | null;
}

export const useAIPersonalization = (
  userId: string,
  requestedCount: number = 5,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
    excludeViewed?: boolean;
    includeContextualFactors?: boolean;
  } = {}
): UseAIPersonalizationReturn => {
  const [personalizedTips, setPersonalizedTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [insights, setInsights] = useState<UseAIPersonalizationReturn['insights']>(null);
  const [aiServiceHealth, setAIServiceHealth] = useState<UseAIPersonalizationReturn['aiServiceHealth']>(null);

  const loadPersonalizedTips = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const result: PersonalizationResult = await aiPersonalizationIntegrationService.getPersonalizedTips(
        userId,
        requestedCount,
        {
          excludeViewed: options.excludeViewed,
          includeContextualFactors: options.includeContextualFactors,
          forceRefresh
        }
      );

      setPersonalizedTips(result.tips);
      setConfidence(result.confidence);
      setFallbackUsed(result.fallbackUsed);
      setReasoning(result.reasoning);

    } catch (err) {
      console.error('Error loading personalized tips:', err);
      setError(err instanceof Error ? err.message : 'Failed to load personalized tips');
      setPersonalizedTips([]);
    } finally {
      setLoading(false);
    }
  }, [userId, requestedCount, options.excludeViewed, options.includeContextualFactors]);

  const loadInsights = useCallback(async () => {
    if (!userId) return;

    try {
      const userInsights = await aiPersonalizationIntegrationService.getPersonalizationInsights(userId);
      setInsights(userInsights);
    } catch (err) {
      console.error('Error loading personalization insights:', err);
      setInsights(null);
    }
  }, [userId]);

  const checkAIServiceHealth = useCallback(async () => {
    try {
      const health = await aiPersonalizationIntegrationService.checkAIServiceHealth();
      setAIServiceHealth(health);
    } catch (err) {
      console.error('Error checking AI service health:', err);
      setAIServiceHealth({
        available: false,
        responseTime: -1,
        version: 'unknown',
        capabilities: []
      });
    }
  }, []);

  const refreshTips = useCallback(async () => {
    await loadPersonalizedTips(true);
  }, [loadPersonalizedTips]);

  const recordEngagement = useCallback(async (
    tipId: string,
    engagementType: 'view' | 'like' | 'complete' | 'bookmark' | 'skip' | 'share',
    engagementData: {
      timeSpent?: number;
      rating?: number;
      feedback?: string;
      context?: Record<string, any>;
    } = {}
  ) => {
    if (!userId) return;

    try {
      await aiPersonalizationIntegrationService.updatePersonalizationFromEngagement(
        userId,
        tipId,
        engagementType,
        engagementData
      );

      // Refresh insights after engagement to show updated data
      await loadInsights();

    } catch (err) {
      console.error('Error recording engagement:', err);
      // Don't throw - engagement recording failures shouldn't break the UI
    }
  }, [userId, loadInsights]);

  // Initial load
  useEffect(() => {
    loadPersonalizedTips();
    loadInsights();
    checkAIServiceHealth();
  }, [loadPersonalizedTips, loadInsights, checkAIServiceHealth]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!options.autoRefresh || !options.refreshInterval) return;

    const interval = setInterval(() => {
      loadPersonalizedTips();
    }, options.refreshInterval);

    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval, loadPersonalizedTips]);

  return {
    personalizedTips,
    loading,
    error,
    confidence,
    fallbackUsed,
    reasoning,
    refreshTips,
    recordEngagement,
    insights,
    aiServiceHealth
  };
};

// Hook for AI service configuration and management
export const useAIPersonalizationConfig = () => {
  const [config, setConfig] = useState({
    maxTipsPerRequest: 10,
    minConfidenceThreshold: 0.6,
    fallbackEnabled: true,
    learningEnabled: true,
    contextualFactorsEnabled: true
  });

  const updateConfig = useCallback((newConfig: Partial<typeof config>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    aiPersonalizationIntegrationService.updateConfiguration(updatedConfig);
  }, [config]);

  return {
    config,
    updateConfig
  };
};

// Hook for monitoring AI personalization performance
export const useAIPersonalizationMetrics = (userId: string) => {
  const [metrics, setMetrics] = useState<{
    totalPersonalizedTips: number;
    averageConfidence: number;
    fallbackRate: number;
    engagementRate: number;
    lastUpdated: Date;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        
        // This would typically come from an analytics service
        // For now, we'll create placeholder metrics
        const mockMetrics = {
          totalPersonalizedTips: 150,
          averageConfidence: 0.78,
          fallbackRate: 0.15,
          engagementRate: 0.65,
          lastUpdated: new Date()
        };

        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Error loading AI personalization metrics:', error);
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [userId]);

  return {
    metrics,
    loading
  };
};

// Hook for A/B testing AI personalization features
export const useAIPersonalizationExperiment = (
  userId: string,
  experimentName: string
) => {
  const [experimentGroup, setExperimentGroup] = useState<'control' | 'treatment' | null>(null);
  const [experimentConfig, setExperimentConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    // Simple hash-based assignment for consistent user experience
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const group = Math.abs(hash) % 2 === 0 ? 'control' : 'treatment';
    setExperimentGroup(group);

    // Set experiment-specific configuration
    const configs = {
      control: {
        minConfidenceThreshold: 0.6,
        contextualFactorsEnabled: false
      },
      treatment: {
        minConfidenceThreshold: 0.5,
        contextualFactorsEnabled: true
      }
    };

    setExperimentConfig(configs[group]);
    
    // Apply experiment configuration
    aiPersonalizationIntegrationService.updateConfiguration(configs[group]);

  }, [userId, experimentName]);

  return {
    experimentGroup,
    experimentConfig,
    isInTreatment: experimentGroup === 'treatment'
  };
};