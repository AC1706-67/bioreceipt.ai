/**
 * Image Cache Hook
 * Provides memory caching for recently viewed photos with LRU eviction
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Image } from 'react-native';

interface CacheEntry {
  url: string;
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size?: number;
}

interface ImageCacheOptions {
  maxSize?: number; // Maximum cache size in MB
  maxEntries?: number; // Maximum number of cached images
  ttl?: number; // Time to live in milliseconds
  preloadNext?: boolean; // Preload next/previous images
  enableMetrics?: boolean; // Enable performance metrics
}

interface ImageCacheResult {
  getCachedImage: (url: string) => Promise<string | null>;
  setCachedImage: (url: string, data: any, size?: number) => void;
  preloadImages: (urls: string[]) => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => {
    size: number;
    entries: number;
    hitRate: number;
    memoryUsage: number;
  };
  isLoading: boolean;
  error: Error | null;
}

export const useImageCache = (
  options: ImageCacheOptions = {}
): ImageCacheResult => {
  const {
    maxSize = 50, // 50MB default
    maxEntries = 100,
    ttl = 30 * 60 * 1000, // 30 minutes
    preloadNext = true,
    enableMetrics = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const metricsRef = useRef({
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalSize: 0,
  });

  // Calculate cache size in bytes
  const calculateCacheSize = useCallback(() => {
    let totalSize = 0;
    cacheRef.current.forEach(entry => {
      totalSize += entry.size || 0;
    });
    return totalSize;
  }, []);

  // LRU eviction - remove least recently used entries
  const evictLRU = useCallback(() => {
    const entries = Array.from(cacheRef.current.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest entries until we're under limits
    const maxSizeBytes = maxSize * 1024 * 1024;
    let currentSize = calculateCacheSize();
    
    for (const [url, entry] of entries) {
      if (cacheRef.current.size <= maxEntries && currentSize <= maxSizeBytes) {
        break;
      }
      
      cacheRef.current.delete(url);
      currentSize -= entry.size || 0;
      metricsRef.current.totalSize -= entry.size || 0;
    }
  }, [maxSize, maxEntries, calculateCacheSize]);

  // Clean expired entries
  const cleanExpired = useCallback(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    cacheRef.current.forEach((entry, url) => {
      if (now - entry.timestamp > ttl) {
        expiredKeys.push(url);
      }
    });
    
    expiredKeys.forEach(url => {
      const entry = cacheRef.current.get(url);
      if (entry) {
        metricsRef.current.totalSize -= entry.size || 0;
        cacheRef.current.delete(url);
      }
    });
  }, [ttl]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      cleanExpired();
      evictLRU();
    }, 60000); // Clean every minute

    return () => clearInterval(interval);
  }, [cleanExpired, evictLRU]);

  // Get cached image
  const getCachedImage = useCallback(async (url: string): Promise<string | null> => {
    if (enableMetrics) {
      metricsRef.current.totalRequests++;
    }

    const entry = cacheRef.current.get(url);
    
    if (entry) {
      // Update access statistics
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      
      if (enableMetrics) {
        metricsRef.current.hits++;
      }
      
      return entry.data;
    }
    
    if (enableMetrics) {
      metricsRef.current.misses++;
    }
    
    return null;
  }, [enableMetrics]);

  // Set cached image
  const setCachedImage = useCallback((url: string, data: any, size: number = 0) => {
    try {
      const entry: CacheEntry = {
        url,
        data,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        size,
      };
      
      cacheRef.current.set(url, entry);
      metricsRef.current.totalSize += size;
      
      // Trigger cleanup if needed
      evictLRU();
    } catch (err) {
      console.error('Failed to cache image:', err);
      setError(err as Error);
    }
  }, [evictLRU]);

  // Preload images
  const preloadImages = useCallback(async (urls: string[]) => {
    if (!preloadNext || urls.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const preloadPromises = urls.map(async (url) => {
        // Check if already cached
        const cached = await getCachedImage(url);
        if (cached) return;

        return new Promise<void>((resolve, reject) => {
          Image.prefetch(url)
            .then(() => {
              // Estimate size (rough approximation)
              const estimatedSize = 500 * 1024; // 500KB average
              setCachedImage(url, url, estimatedSize);
              resolve();
            })
            .catch(reject);
        });
      });

      await Promise.allSettled(preloadPromises);
    } catch (err) {
      console.error('Failed to preload images:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [preloadNext, getCachedImage, setCachedImage]);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    metricsRef.current = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      totalSize: 0,
    };
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const metrics = metricsRef.current;
    const hitRate = metrics.totalRequests > 0 
      ? (metrics.hits / metrics.totalRequests) * 100 
      : 0;
    
    return {
      size: cacheRef.current.size,
      entries: cacheRef.current.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: Math.round(metrics.totalSize / (1024 * 1024) * 100) / 100, // MB
    };
  }, []);

  return {
    getCachedImage,
    setCachedImage,
    preloadImages,
    clearCache,
    getCacheStats,
    isLoading,
    error,
  };
};

export default useImageCache;