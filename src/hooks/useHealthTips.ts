/**
 * useHealthTips Hook
 * React hook for managing health tips data and interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { HealthTip, UserAction } from '../types';
import { ContentService, ContentFilter, PaginatedTipsResponse } from '../services/content/contentService';
import { useAppSelector } from './redux';
import { selectUser } from '../store/authSlice';
import { loggingService } from '../services/logging/loggingService';

export interface UseHealthTipsOptions {
  filter?: ContentFilter;
  autoLoad?: boolean;
  enablePagination?: boolean;
}

export interface UseHealthTipsReturn {
  // Data
  tips: HealthTip[];
  loading: boolean;
  error: string | null;
  
  // Pagination (when enabled)
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // Actions
  loadTips: () => Promise<void>;
  refreshTips: () => Promise<void>;
  loadMore: () => Promise<void>;
  handleTipAction: (tipId: string, action: UserAction) => Promise<void>;
  
  // Filtering
  updateFilter: (newFilter: Partial<ContentFilter>) => void;
  clearFilter: () => void;
  
  // Individual tip operations
  getTipById: (tipId: string) => Promise<HealthTip | null>;
  createTip: (tipData: Omit<HealthTip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HealthTip>;
  updateTip: (tipId: string, updates: Partial<HealthTip>) => Promise<HealthTip>;
  deleteTip: (tipId: string) => Promise<void>;
}

export const useHealthTips = (options: UseHealthTipsOptions = {}): UseHealthTipsReturn => {
  const { filter: initialFilter, autoLoad = true, enablePagination = false } = options;
  
  const user = useAppSelector(selectUser);
  const contentService = ContentService.getInstance();
  
  // State
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentFilter>(initialFilter || {});
  const [pagination, setPagination] = useState<PaginatedTipsResponse['pagination'] | undefined>();

  // Load tips function
  const loadTips = useCallback(async (append = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);

      let result: HealthTip[] | PaginatedTipsResponse;
      
      if (enablePagination) {
        result = await contentService.getPaginatedHealthTips(filter);
        const paginatedResult = result as PaginatedTipsResponse;
        
        if (append) {
          setTips(prev => [...prev, ...paginatedResult.data]);
        } else {
          setTips(paginatedResult.data);
        }
        setPagination(paginatedResult.pagination);
      } else {
        result = await contentService.getHealthTips(filter);
        const tipsResult = result as HealthTip[];
        
        if (append) {
          setTips(prev => [...prev, ...tipsResult]);
        } else {
          setTips(tipsResult);
        }
      }

      await loggingService.logInfo('Health tips loaded successfully', {
        count: Array.isArray(result) ? result.length : result.data.length,
        filter,
        append,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load health tips';
      setError(errorMessage);
      await loggingService.logError('Failed to load health tips', err as Error, { filter });
    } finally {
      setLoading(false);
    }
  }, [contentService, filter, loading, enablePagination]);

  // Refresh tips (reload from beginning)
  const refreshTips = useCallback(async () => {
    if (enablePagination) {
      setFilter(prev => ({ ...prev, page: 1 }));
    }
    await loadTips(false);
  }, [loadTips, enablePagination]);

  // Load more tips (pagination)
  const loadMore = useCallback(async () => {
    if (!enablePagination || !pagination?.hasNext) return;
    
    setFilter(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
    await loadTips(true);
  }, [loadTips, enablePagination, pagination]);

  // Handle tip actions
  const handleTipAction = useCallback(async (tipId: string, action: UserAction) => {
    if (!user) {
      setError('User must be logged in to perform this action');
      return;
    }

    try {
      await contentService.recordEngagement(user.id, tipId, action);
      
      // Update local state for immediate feedback
      setTips(prev => prev.map(tip => {
        if (tip.id === tipId) {
          // Update tip based on action (this would normally come from backend)
          switch (action) {
            case 'view':
              return { ...tip, viewCount: (tip.viewCount || 0) + 1 };
            case 'like':
              return { ...tip, likeCount: (tip.likeCount || 0) + 1 };
            case 'complete':
              return { ...tip, completionCount: (tip.completionCount || 0) + 1 };
            case 'share':
              return { ...tip, shareCount: (tip.shareCount || 0) + 1 };
            default:
              return tip;
          }
        }
        return tip;
      }));

      await loggingService.logInfo('Tip action recorded', {
        tipId,
        action,
        userId: user.id,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record tip action';
      setError(errorMessage);
      await loggingService.logError('Failed to record tip action', err as Error, {
        tipId,
        action,
        userId: user?.id,
      });
    }
  }, [contentService, user]);

  // Update filter
  const updateFilter = useCallback((newFilter: Partial<ContentFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  // Get tip by ID
  const getTipById = useCallback(async (tipId: string): Promise<HealthTip | null> => {
    try {
      return await contentService.getHealthTipById(tipId);
    } catch (err) {
      await loggingService.logError('Failed to get tip by ID', err as Error, { tipId });
      return null;
    }
  }, [contentService]);

  // Create tip (admin function)
  const createTip = useCallback(async (tipData: Omit<HealthTip, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthTip> => {
    try {
      const newTip = await contentService.createHealthTip(tipData);
      
      // Add to local state
      setTips(prev => [newTip, ...prev]);
      
      return newTip;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tip';
      setError(errorMessage);
      throw err;
    }
  }, [contentService]);

  // Update tip (admin function)
  const updateTip = useCallback(async (tipId: string, updates: Partial<HealthTip>): Promise<HealthTip> => {
    try {
      const updatedTip = await contentService.updateHealthTip(tipId, updates);
      
      // Update local state
      setTips(prev => prev.map(tip => tip.id === tipId ? updatedTip : tip));
      
      return updatedTip;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tip';
      setError(errorMessage);
      throw err;
    }
  }, [contentService]);

  // Delete tip (admin function)
  const deleteTip = useCallback(async (tipId: string): Promise<void> => {
    try {
      await contentService.deleteHealthTip(tipId);
      
      // Remove from local state
      setTips(prev => prev.filter(tip => tip.id !== tipId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tip';
      setError(errorMessage);
      throw err;
    }
  }, [contentService]);

  // Auto-load on mount and filter changes
  useEffect(() => {
    if (autoLoad) {
      loadTips(false);
    }
  }, [filter, autoLoad]); // Note: loadTips is not in deps to avoid infinite loop

  return {
    // Data
    tips,
    loading,
    error,
    pagination,
    
    // Actions
    loadTips: () => loadTips(false),
    refreshTips,
    loadMore,
    handleTipAction,
    
    // Filtering
    updateFilter,
    clearFilter,
    
    // Individual operations
    getTipById,
    createTip,
    updateTip,
    deleteTip,
  };
};

/**
 * Hook for daily tips specifically
 */
export const useDailyTips = () => {
  const user = useAppSelector(selectUser);
  const contentService = ContentService.getInstance();
  
  const [dailyTips, setDailyTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDailyTips = useCallback(async () => {
    if (!user || loading) return;

    try {
      setLoading(true);
      setError(null);
      
      const tips = await contentService.getDailyTips(user.id, 3);
      setDailyTips(tips);
      
      await loggingService.logInfo('Daily tips loaded', {
        userId: user.id,
        count: tips.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load daily tips';
      setError(errorMessage);
      await loggingService.logError('Failed to load daily tips', err as Error, {
        userId: user?.id,
      });
    } finally {
      setLoading(false);
    }
  }, [contentService, user, loading]);

  const handleTipAction = useCallback(async (tipId: string, action: UserAction) => {
    if (!user) return;

    try {
      await contentService.recordEngagement(user.id, tipId, action);
      
      // Update local state
      setDailyTips(prev => prev.map(tip => {
        if (tip.id === tipId) {
          switch (action) {
            case 'view':
              return { ...tip, viewCount: (tip.viewCount || 0) + 1 };
            case 'like':
              return { ...tip, likeCount: (tip.likeCount || 0) + 1 };
            case 'complete':
              return { ...tip, completionCount: (tip.completionCount || 0) + 1 };
            case 'share':
              return { ...tip, shareCount: (tip.shareCount || 0) + 1 };
            default:
              return tip;
          }
        }
        return tip;
      }));
    } catch (err) {
      await loggingService.logError('Failed to record daily tip action', err as Error, {
        tipId,
        action,
        userId: user.id,
      });
    }
  }, [contentService, user]);

  // Auto-load when user changes
  useEffect(() => {
    if (user) {
      loadDailyTips();
    }
  }, [user]); // Note: loadDailyTips not in deps to avoid infinite loop

  return {
    dailyTips,
    loading,
    error,
    loadDailyTips,
    handleTipAction,
    refreshDailyTips: loadDailyTips,
  };
};