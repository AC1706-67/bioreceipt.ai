/**
 * Photo Optimization Hook
 * Combines accessibility and performance optimizations for photo handling
 * Enhanced with memoization, caching, and progressive loading
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import React from 'react';
import { photoAccessibilityService } from '../services/photo/photoAccessibilityService';
import { photoPerformanceService } from '../services/photo/photoPerformanceService';
import { useImageCache } from './useImageCache';
import { useProgressiveImage } from './useProgressiveImage';
import { useLazyImageLoading } from './useLazyImageLoading';

interface PhotoOptimizationOptions {
  enableAccessibility?: boolean;
  enablePerformanceOptimization?: boolean;
  enableThumbnails?: boolean;
  cachePhotos?: boolean;
  preloadPhotos?: boolean;
  priority?: 'high' | 'normal' | 'low';
  enableLazyLoading?: boolean;
  enableProgressiveLoading?: boolean;
  enablePrefetching?: boolean;
  maxCacheSize?: number;
  enableMetrics?: boolean;
}

interface PhotoOptimizationResult {
  // Accessibility features
  accessibilityConfig: any;
  accessibilityLabels: any;
  accessibilityHints: any;
  announceToScreenReader: (message: string, priority?: 'low' | 'high') => void;
  setAccessibilityFocus: (elementRef: any) => void;
  getAnimationDuration: (defaultDuration: number) => number;
  getGestureTimeout: (defaultTimeout: number) => number;
  shouldUseSimplifiedUI: () => boolean;
  getAccessibleColors: () => any;

  // Performance features
  optimizePhoto: (url: string, options?: any) => Promise<string>;
  generateThumbnail: (url: string, size?: { width: number; height: number }) => Promise<string>;
  preloadPhotos: (urls: string[]) => Promise<void>;
  optimizeBatch: (urls: string[], options?: any) => Promise<string[]>;
  getPerformanceMetrics: () => any;
  getCacheStats: () => any;
  clearCache: () => Promise<void>;

  // Enhanced features
  createProgressiveImage: (highResUrl: string, lowResUrl?: string) => any;
  createLazyImage: (url: string, options?: any) => any;
  prefetchNextImages: (currentIndex: number, urls: string[], count?: number) => Promise<void>;
  measureRenderTime: (componentName: string) => { start: () => void; end: () => void };

  // Combined features
  isLoading: boolean;
  error: Error | null;
  optimizedPhotos: Map<string, string>;
  thumbnails: Map<string, string>;
  renderMetrics: Map<string, number>;
}

export const usePhotoOptimization = (
  options: PhotoOptimizationOptions = {}
): PhotoOptimizationResult => {
  const {
    enableAccessibility = true,
    enablePerformanceOptimization = true,
    enableThumbnails = true,
    cachePhotos = true,
    preloadPhotos = false,
    priority = 'normal',
    enableLazyLoading = true,
    enableProgressiveLoading = true,
    enablePrefetching = true,
    maxCacheSize = 50,
    enableMetrics = true,
  } = options;

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [accessibilityConfig, setAccessibilityConfig] = useState(
    enableAccessibility ? photoAccessibilityService.getSettings() : null
  );
  const [optimizedPhotos, setOptimizedPhotos] = useState<Map<string, string>>(new Map());
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [renderMetrics, setRenderMetrics] = useState<Map<string, number>>(new Map());

  // Initialize image cache
  const imageCache = useImageCache({
    maxSize: maxCacheSize,
    maxEntries: 100,
    enableMetrics,
  });

  // Performance tracking
  const renderTimersRef = useRef<Map<string, number>>(new Map());

  // Subscribe to accessibility changes
  useEffect(() => {
    if (!enableAccessibility) return;

    const unsubscribe = photoAccessibilityService.subscribe((config) => {
      setAccessibilityConfig(config);
    });

    return unsubscribe;
  }, [enableAccessibility]);

  // Configure performance service
  useEffect(() => {
    if (!enablePerformanceOptimization) return;

    photoPerformanceService.configure({
      enableMemoryCache: cachePhotos,
      enableDiskCache: cachePhotos,
      compressionQuality: priority === 'high' ? 0.9 : priority === 'normal' ? 0.8 : 0.7,
    });
  }, [enablePerformanceOptimization, cachePhotos, priority]);

  // Memoized accessibility functions
  const accessibilityLabels = useMemo(() => 
    enableAccessibility ? photoAccessibilityService.getPhotoLabels() : null,
    [enableAccessibility, accessibilityConfig]
  );

  const accessibilityHints = useMemo(() => ({
    photoPreview: 'Double tap to view full screen, long press for options menu',
    photoCapture: 'Double tap to take a photo',
    photoDelete: 'Double tap to delete this photo',
    photoGallery: 'Swipe to navigate between photos',
  }), []);

  const announceToScreenReader = useCallback((message: string, priority: 'low' | 'high' = 'low') => {
    if (!enableAccessibility) return;
    const mappedPriority = priority === 'high' ? 'high' : 'medium';
    photoAccessibilityService.announceMessage(message, mappedPriority);
  }, [enableAccessibility]);

  const setAccessibilityFocus = useCallback((elementRef: any) => {
    if (!enableAccessibility) return;
    // In React Native, focus management is handled differently
    // This would typically involve calling focus() on the element
    if (elementRef?.current?.focus) {
      elementRef.current.focus();
    }
  }, [enableAccessibility]);

  const getAnimationDuration = useCallback((defaultDuration: number) => {
    if (!enableAccessibility) return defaultDuration;
    return photoAccessibilityService.getAnimationDuration(defaultDuration);
  }, [enableAccessibility, accessibilityConfig]);

  const getGestureTimeout = useCallback((defaultTimeout: number) => {
    if (!enableAccessibility) return defaultTimeout;
    return photoAccessibilityService.getGestureTimeout(defaultTimeout);
  }, [enableAccessibility, accessibilityConfig]);

  const shouldUseSimplifiedUI = useCallback(() => {
    if (!enableAccessibility) return false;
    return photoAccessibilityService.shouldUseSimplifiedUI();
  }, [enableAccessibility, accessibilityConfig]);

  const getAccessibleColors = useCallback(() => {
    if (!enableAccessibility) return null;
    return photoAccessibilityService.getHighContrastColors();
  }, [enableAccessibility, accessibilityConfig]);

  // Performance functions
  const optimizePhoto = useCallback(async (url: string, optimizationOptions: any = {}) => {
    if (!enablePerformanceOptimization) return url;

    try {
      setIsLoading(true);
      setError(null);

      // Check if already optimized
      if (optimizedPhotos.has(url)) {
        return optimizedPhotos.get(url)!;
      }

      const optimizedUrl = await photoPerformanceService.optimizePhoto(url, {
        quality: priority === 'high' ? 0.9 : priority === 'normal' ? 0.8 : 0.7,
        stripMetadata: true,
        ...optimizationOptions,
      });

      // Cache the result
      setOptimizedPhotos(prev => new Map(prev).set(url, optimizedUrl));

      return optimizedUrl;
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to optimize photo:', error);
      return url; // Return original URL as fallback
    } finally {
      setIsLoading(false);
    }
  }, [enablePerformanceOptimization, priority, optimizedPhotos]);

  const generateThumbnail = useCallback(async (
    url: string, 
    size: { width: number; height: number } = { width: 200, height: 200 }
  ) => {
    if (!enablePerformanceOptimization || !enableThumbnails) return url;

    try {
      const thumbnailKey = `${url}_${size.width}x${size.height}`;
      
      // Check if already generated
      if (thumbnails.has(thumbnailKey)) {
        return thumbnails.get(thumbnailKey)!;
      }

      const thumbnailUrl = await photoPerformanceService.generateThumbnail(url, size);

      // Cache the result
      setThumbnails(prev => new Map(prev).set(thumbnailKey, thumbnailUrl));

      return thumbnailUrl;
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
      return url; // Return original URL as fallback
    }
  }, [enablePerformanceOptimization, enableThumbnails, thumbnails]);

  const preloadPhotosCallback = useCallback(async (urls: string[]) => {
    if (!enablePerformanceOptimization || !preloadPhotos) return;

    try {
      setIsLoading(true);
      await photoPerformanceService.preloadPhotos(urls);
      
      // Announce completion to screen reader
      if (enableAccessibility && accessibilityConfig?.isScreenReaderEnabled) {
        announceToScreenReader(`${urls.length} photos preloaded successfully`);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to preload photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [enablePerformanceOptimization, preloadPhotos, enableAccessibility, accessibilityConfig, announceToScreenReader]);

  const optimizeBatch = useCallback(async (urls: string[], optimizationOptions: any = {}) => {
    if (!enablePerformanceOptimization) return urls;

    try {
      setIsLoading(true);
      setError(null);

      const optimizedUrls = await photoPerformanceService.optimizeBatch(urls, {
        quality: priority === 'high' ? 0.9 : priority === 'normal' ? 0.8 : 0.7,
        stripMetadata: true,
        ...optimizationOptions,
      });

      // Cache the results
      setOptimizedPhotos(prev => {
        const newMap = new Map(prev);
        urls.forEach((originalUrl, index) => {
          newMap.set(originalUrl, optimizedUrls[index]);
        });
        return newMap;
      });

      // Announce completion to screen reader
      if (enableAccessibility && accessibilityConfig?.isScreenReaderEnabled) {
        announceToScreenReader(`${urls.length} photos optimized successfully`);
      }

      return optimizedUrls;
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to optimize photo batch:', error);
      return urls; // Return original URLs as fallback
    } finally {
      setIsLoading(false);
    }
  }, [enablePerformanceOptimization, priority, enableAccessibility, accessibilityConfig, announceToScreenReader]);

  const getPerformanceMetrics = useCallback(() => {
    if (!enablePerformanceOptimization) return null;
    return photoPerformanceService.getPerformanceMetrics();
  }, [enablePerformanceOptimization]);

  const getCacheStats = useCallback(() => {
    if (!enablePerformanceOptimization) return null;
    return photoPerformanceService.getCacheStats();
  }, [enablePerformanceOptimization]);

  const clearCache = useCallback(async () => {
    if (!enablePerformanceOptimization) return;

    try {
      await photoPerformanceService.clearCache();
      imageCache.clearCache();
      setOptimizedPhotos(new Map());
      setThumbnails(new Map());
      setRenderMetrics(new Map());
      
      // Announce to screen reader
      if (enableAccessibility && accessibilityConfig?.isScreenReaderEnabled) {
        announceToScreenReader('Photo cache cleared successfully');
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to clear cache:', error);
    }
  }, [enablePerformanceOptimization, enableAccessibility, accessibilityConfig, announceToScreenReader, imageCache]);

  // Enhanced features
  const createProgressiveImage = useCallback((highResUrl: string, lowResUrl?: string) => {
    if (!enableProgressiveLoading) {
      return { currentImageUrl: highResUrl, isLoading: false, isHighResLoaded: true };
    }

    return useProgressiveImage({
      highResUrl,
      lowResUrl,
      enableMetrics,
    });
  }, [enableProgressiveLoading, enableMetrics]);

  const createLazyImage = useCallback((url: string, lazyOptions: any = {}) => {
    if (!enableLazyLoading) {
      return { shouldLoad: true, isVisible: true, onLayout: () => {} };
    }

    return useLazyImageLoading({
      enabled: enableLazyLoading,
      threshold: 0.1,
      rootMargin: 100,
      ...lazyOptions,
    });
  }, [enableLazyLoading]);

  const prefetchNextImages = useCallback(async (
    currentIndex: number, 
    urls: string[], 
    count: number = 2
  ) => {
    if (!enablePrefetching || !enablePerformanceOptimization) return;

    try {
      const nextUrls: string[] = [];
      
      // Get next images
      for (let i = 1; i <= count; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < urls.length) {
          nextUrls.push(urls[nextIndex]);
        }
      }
      
      // Get previous images
      for (let i = 1; i <= count; i++) {
        const prevIndex = currentIndex - i;
        if (prevIndex >= 0) {
          nextUrls.push(urls[prevIndex]);
        }
      }

      if (nextUrls.length > 0) {
        await imageCache.preloadImages(nextUrls);
      }
    } catch (err) {
      console.error('Failed to prefetch images:', err);
    }
  }, [enablePrefetching, enablePerformanceOptimization, imageCache]);

  const measureRenderTime = useCallback((componentName: string) => {
    if (!enableMetrics) {
      return { start: () => {}, end: () => {} };
    }

    return {
      start: () => {
        renderTimersRef.current.set(componentName, performance.now());
      },
      end: () => {
        const startTime = renderTimersRef.current.get(componentName);
        if (startTime) {
          const endTime = performance.now();
          const renderTime = endTime - startTime;
          
          setRenderMetrics(prev => new Map(prev).set(componentName, renderTime));
          renderTimersRef.current.delete(componentName);
          
          // Log slow renders
          if (renderTime > 16) { // More than one frame at 60fps
            console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
          }
        }
      },
    };
  }, [enableMetrics]);

  return {
    // Accessibility features
    accessibilityConfig,
    accessibilityLabels,
    accessibilityHints,
    announceToScreenReader,
    setAccessibilityFocus,
    getAnimationDuration,
    getGestureTimeout,
    shouldUseSimplifiedUI,
    getAccessibleColors,

    // Performance features
    optimizePhoto,
    generateThumbnail,
    preloadPhotos: preloadPhotosCallback,
    optimizeBatch,
    getPerformanceMetrics,
    getCacheStats,
    clearCache,

    // Enhanced features
    createProgressiveImage,
    createLazyImage,
    prefetchNextImages,
    measureRenderTime,

    // Combined features
    isLoading,
    error,
    optimizedPhotos,
    thumbnails,
    renderMetrics,
  };
};

export default usePhotoOptimization;