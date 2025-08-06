/**
 * Progressive Image Loading Hook
 * Implements low-res placeholder with progressive enhancement to high-res
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Image } from 'react-native';

interface ProgressiveImageOptions {
  lowResUrl?: string;
  highResUrl: string;
  placeholderColor?: string;
  blurRadius?: number;
  enableBlur?: boolean;
  transitionDuration?: number;
  enableMetrics?: boolean;
}

interface ProgressiveImageResult {
  currentImageUrl: string | null;
  isLowResLoaded: boolean;
  isHighResLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  loadingProgress: number;
  metrics: {
    lowResLoadTime: number;
    highResLoadTime: number;
    totalLoadTime: number;
  } | null;
}

export const useProgressiveImage = (
  options: ProgressiveImageOptions
): ProgressiveImageResult => {
  const {
    lowResUrl,
    highResUrl,
    placeholderColor = '#f0f0f0',
    blurRadius = 10,
    enableBlur = true,
    transitionDuration = 300,
    enableMetrics = true,
  } = options;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isLowResLoaded, setIsLowResLoaded] = useState(false);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [metrics, setMetrics] = useState<{
    lowResLoadTime: number;
    highResLoadTime: number;
    totalLoadTime: number;
  } | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const lowResStartTimeRef = useRef<number>(0);
  const highResStartTimeRef = useRef<number>(0);

  // Generate low-res URL if not provided
  const generateLowResUrl = useCallback((url: string): string => {
    // In a real implementation, you might use a service like Cloudinary
    // For now, we'll append query parameters to simulate low-res
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=50&q=30&blur=5`;
  }, []);

  const effectiveLowResUrl = lowResUrl || generateLowResUrl(highResUrl);

  // Load low-res image first
  useEffect(() => {
    if (!effectiveLowResUrl) return;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(10);
    lowResStartTimeRef.current = Date.now();

    Image.prefetch(effectiveLowResUrl)
      .then(() => {
        setCurrentImageUrl(effectiveLowResUrl);
        setIsLowResLoaded(true);
        setLoadingProgress(50);

        if (enableMetrics) {
          const loadTime = Date.now() - lowResStartTimeRef.current;
          setMetrics(prev => ({
            ...prev,
            lowResLoadTime: loadTime,
            highResLoadTime: prev?.highResLoadTime || 0,
            totalLoadTime: prev?.totalLoadTime || 0,
          }));
        }
      })
      .catch((err) => {
        console.error('Failed to load low-res image:', err);
        // Continue to high-res even if low-res fails
        setLoadingProgress(25);
      });
  }, [effectiveLowResUrl, enableMetrics]);

  // Load high-res image
  useEffect(() => {
    if (!highResUrl) return;

    // Start loading high-res after a short delay to prioritize low-res
    const timer = setTimeout(() => {
      setLoadingProgress(60);
      highResStartTimeRef.current = Date.now();

      Image.prefetch(highResUrl)
        .then(() => {
          setCurrentImageUrl(highResUrl);
          setIsHighResLoaded(true);
          setIsLoading(false);
          setLoadingProgress(100);

          if (enableMetrics) {
            const highResLoadTime = Date.now() - highResStartTimeRef.current;
            const totalLoadTime = Date.now() - startTimeRef.current;
            
            setMetrics(prev => ({
              lowResLoadTime: prev?.lowResLoadTime || 0,
              highResLoadTime,
              totalLoadTime,
            }));
          }
        })
        .catch((err) => {
          console.error('Failed to load high-res image:', err);
          setError(err as Error);
          setIsLoading(false);
          setLoadingProgress(100);

          // If low-res loaded successfully, keep it
          if (!isLowResLoaded) {
            setError(new Error('Failed to load image'));
          }
        });
    }, isLowResLoaded ? 100 : 500); // Delay high-res if low-res is still loading

    return () => clearTimeout(timer);
  }, [highResUrl, isLowResLoaded, enableMetrics]);

  // Reset state when URLs change
  useEffect(() => {
    setCurrentImageUrl(null);
    setIsLowResLoaded(false);
    setIsHighResLoaded(false);
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    setMetrics(null);
    startTimeRef.current = Date.now();
  }, [highResUrl, effectiveLowResUrl]);

  return {
    currentImageUrl,
    isLowResLoaded,
    isHighResLoaded,
    isLoading,
    error,
    loadingProgress,
    metrics,
  };
};

export default useProgressiveImage;