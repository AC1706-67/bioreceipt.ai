/**
 * Optimized Substance Loading Hook - Advanced Loading State Management
 * Provides non-blocking loading states, optimistic updates, and intelligent caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Database } from '../config/supabase';
import { substanceDatabase } from '../services/substance/substanceDatabase';
import { substanceCacheService } from '../services/cache/substanceCacheService';
import { substancePerformanceMonitor } from '../services/performance/substancePerformanceMonitor';
import { useToast } from '../contexts/ToastContext';

type Substance = Database['public']['Tables']['substances']['Row'] & {
  substance_categories: { id: string; name: string };
};

interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  isSearching: boolean;
  isCreating: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface OptimizedSubstanceHookResult {
  substances: Substance[];
  loadingState: LoadingState;
  searchResults: Substance[];
  cacheMetrics: {
    hitRatio: number;
    optimisticUpdates: number;
  };
  
  // Actions
  loadSubstances: (force?: boolean) => Promise<void>;
  refreshSubstances: () => Promise<void>;
  searchSubstances: (query: string) => Promise<void>;
  addSubstanceOptimistically: (substance: Substance) => string;
  confirmOptimisticUpdate: (updateId: string) => void;
  failOptimisticUpdate: (updateId: string) => void;
  clearError: () => void;
}

export const useOptimizedSubstanceLoading = (userId?: string): OptimizedSubstanceHookResult => {
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [searchResults, setSearchResults] = useState<Substance[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isRefreshing: false,
    isSearching: false,
    isCreating: false,
    error: null,
    lastUpdated: null,
  });
  
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchQueryRef = useRef<string>('');

  /**
   * Load substances with intelligent caching
   */
  const loadSubstances = useCallback(async (force: boolean = false) => {
    // Prevent multiple simultaneous loads
    if (loadingState.isLoading && !force) {
      return;
    }

    setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try cache first unless forced
      if (!force) {
        const cachedSubstances = await substanceCacheService.getCachedSubstances(userId);
        if (cachedSubstances) {
          setSubstances(cachedSubstances);
          setLoadingState(prev => ({
            ...prev,
            isLoading: false,
            lastUpdated: new Date(),
          }));
          return;
        }
      }

      // Load from database with performance tracking
      const result = await substancePerformanceMonitor.trackSubstanceLoad(
        'substance_load_all',
        async () => {
          const dbResult = await substanceDatabase.getSupabaseSubstances();
          if (!dbResult.success || !dbResult.data) {
            throw new Error(dbResult.error || 'Failed to load substances');
          }
          return dbResult.data;
        },
        { userId, force }
      );

      // Cache the results
      await substanceCacheService.cacheSubstances(result, userId);
      
      setSubstances(result);
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        lastUpdated: new Date(),
      }));

    } catch (error: any) {
      console.error('Error loading substances:', error);
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load substances',
      }));

      // Show user-friendly error message
      toast.showError(
        'Failed to load substances. Please try again.',
        'Retry',
        () => loadSubstances(true)
      );
    }
  }, [userId, loadingState.isLoading, toast]);

  /**
   * Refresh substances (non-blocking background refresh)
   */
  const refreshSubstances = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, isRefreshing: true }));

    try {
      // Background refresh without blocking UI
      const result = await substancePerformanceMonitor.trackSubstanceLoad(
        'substance_refresh',
        async () => {
          const dbResult = await substanceDatabase.getSupabaseSubstances();
          if (!dbResult.success || !dbResult.data) {
            throw new Error(dbResult.error || 'Failed to refresh substances');
          }
          return dbResult.data;
        },
        { userId, background: true }
      );

      // Update cache and state
      await substanceCacheService.cacheSubstances(result, userId);
      setSubstances(result);
      
      setLoadingState(prev => ({
        ...prev,
        isRefreshing: false,
        lastUpdated: new Date(),
      }));

    } catch (error: any) {
      console.error('Error refreshing substances:', error);
      setLoadingState(prev => ({
        ...prev,
        isRefreshing: false,
        error: error.message || 'Failed to refresh substances',
      }));
    }
  }, [userId, toast]);

  /**
   * Search substances with caching and debouncing
   */
  const searchSubstances = useCallback(async (query: string) => {
    // Clear previous search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    lastSearchQueryRef.current = query;

    // Handle empty query
    if (!query.trim()) {
      setSearchResults([]);
      setLoadingState(prev => ({ ...prev, isSearching: false }));
      return;
    }

    setLoadingState(prev => ({ ...prev, isSearching: true }));

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Check if query has changed during debounce
        if (lastSearchQueryRef.current !== query) {
          return;
        }

        // Try cache first
        const cachedResults = await substanceCacheService.getCachedSearchResults(query);
        if (cachedResults) {
          setSearchResults(cachedResults);
          setLoadingState(prev => ({ ...prev, isSearching: false }));
          return;
        }

        // Create new abort controller for this search
        abortControllerRef.current = new AbortController();

        // Perform search with performance tracking
        const results = await substancePerformanceMonitor.trackSearch(
          async () => {
            // Filter from current substances (fast local search)
            const filtered = substances.filter(substance =>
              substance.name.toLowerCase().includes(query.toLowerCase()) ||
              substance.substance_categories.name.toLowerCase().includes(query.toLowerCase())
            );
            return filtered;
          },
          query,
          0 // Will be updated after filtering
        );

        // Check if search is still relevant
        if (lastSearchQueryRef.current === query && !abortControllerRef.current.signal.aborted) {
          setSearchResults(results);
          
          // Cache search results
          await substanceCacheService.cacheSearchResults(query, results);
          
          setLoadingState(prev => ({ ...prev, isSearching: false }));
        }

      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error searching substances:', error);
          setLoadingState(prev => ({
            ...prev,
            isSearching: false,
            error: error.message || 'Search failed',
          }));
        }
      }
    }, 300); // 300ms debounce

  }, [substances]);

  /**
   * Add substance optimistically for immediate UI feedback
   */
  const addSubstanceOptimistically = useCallback((substance: Substance): string => {
    const updateId = substanceCacheService.addOptimisticUpdate(substance);
    
    // Update local state immediately
    setSubstances(prev => {
      const exists = prev.some(s => s.id === substance.id);
      if (exists) return prev;
      return [...prev, substance];
    });

    setLoadingState(prev => ({ ...prev, isCreating: true }));
    
    return updateId;
  }, []);

  /**
   * Confirm optimistic update
   */
  const confirmOptimisticUpdate = useCallback((updateId: string) => {
    substanceCacheService.confirmOptimisticUpdate(updateId);
    setLoadingState(prev => ({ ...prev, isCreating: false }));
    
    // Invalidate cache to ensure consistency
    substanceCacheService.invalidateSubstanceCache(userId);
    
    // Background refresh to sync with database
    setTimeout(() => {
      refreshSubstances();
    }, 1000);
  }, [userId, refreshSubstances]);

  /**
   * Fail optimistic update
   */
  const failOptimisticUpdate = useCallback((updateId: string) => {
    substanceCacheService.failOptimisticUpdate(updateId);
    setLoadingState(prev => ({ ...prev, isCreating: false }));
    
    // Remove the failed substance from local state
    // This would require tracking which substance corresponds to which update ID
    // For now, we'll just refresh the list
    refreshSubstances();
  }, [refreshSubstances]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setLoadingState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Get cache metrics
   */
  const getCacheMetrics = useCallback(() => {
    const metrics = substanceCacheService.getMetrics();
    return {
      hitRatio: substanceCacheService.getCacheHitRatio(),
      optimisticUpdates: metrics.optimisticUpdates,
    };
  }, []);

  // Load substances on mount
  useEffect(() => {
    loadSubstances();
  }, [loadSubstances]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    substances,
    loadingState,
    searchResults,
    cacheMetrics: getCacheMetrics(),
    
    // Actions
    loadSubstances,
    refreshSubstances,
    searchSubstances,
    addSubstanceOptimistically,
    confirmOptimisticUpdate,
    failOptimisticUpdate,
    clearError,
  };
};