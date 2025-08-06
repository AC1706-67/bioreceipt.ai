/**
 * Lazy Image Loading Hook
 * Implements IntersectionObserver-based lazy loading for photo thumbnails
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dimensions } from 'react-native';

interface LazyLoadingOptions {
  threshold?: number;
  rootMargin?: number;
  enabled?: boolean;
  preloadDistance?: number;
}

interface LazyLoadingResult {
  isVisible: boolean;
  shouldLoad: boolean;
  elementRef: React.RefObject<any>;
  onLayout: (event: any) => void;
}

export const useLazyImageLoading = (
  options: LazyLoadingOptions = {}
): LazyLoadingResult => {
  const {
    threshold = 0.1,
    rootMargin = 100,
    enabled = true,
    preloadDistance = 200,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!enabled);
  const [elementBounds, setElementBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const elementRef = useRef<any>(null);
  const observerRef = useRef<any>(null);

  // Get screen dimensions
  const screenHeight = Dimensions.get('window').height;

  // Handle layout to get element position
  const onLayout = useCallback((event: any) => {
    if (!enabled) return;

    const { x, y, width, height } = event.nativeEvent.layout;
    setElementBounds({ x, y, width, height });
  }, [enabled]);

  // Simulate IntersectionObserver behavior for React Native
  useEffect(() => {
    if (!enabled || !elementBounds) {
      setShouldLoad(true);
      return;
    }

    // Create a simple visibility checker
    const checkVisibility = () => {
      if (!elementBounds) return;

      // Get current scroll position (this would need to be passed from parent)
      // For now, we'll use a simplified approach
      const elementTop = elementBounds.y;
      const elementBottom = elementBounds.y + elementBounds.height;
      
      // Check if element is within viewport + preload distance
      const viewportTop = -preloadDistance;
      const viewportBottom = screenHeight + preloadDistance;
      
      const isInViewport = elementBottom >= viewportTop && elementTop <= viewportBottom;
      
      setIsVisible(isInViewport);
      
      if (isInViewport && !shouldLoad) {
        setShouldLoad(true);
      }
    };

    // Initial check
    checkVisibility();

    // Set up periodic checking (in a real implementation, this would be scroll-based)
    const interval = setInterval(checkVisibility, 100);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, elementBounds, preloadDistance, screenHeight, shouldLoad]);

  return {
    isVisible,
    shouldLoad,
    elementRef,
    onLayout,
  };
};

export default useLazyImageLoading;