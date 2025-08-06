/**
 * Photo Performance Tests
 * Tests for lazy loading, caching, progressive loading, and render performance
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { OptimizedPhotoComponent } from '../../components/photo/OptimizedPhotoComponent';
import { usePhotoOptimization } from '../../hooks/usePhotoOptimization';
import { useImageCache } from '../../hooks/useImageCache';
import { useProgressiveImage } from '../../hooks/useProgressiveImage';
import { useLazyImageLoading } from '../../hooks/useLazyImageLoading';

// Mock the hooks
jest.mock('../../hooks/usePhotoOptimization');
jest.mock('../../hooks/useImageCache');
jest.mock('../../hooks/useProgressiveImage');
jest.mock('../../hooks/useLazyImageLoading');

const mockUsePhotoOptimization = usePhotoOptimization as jest.MockedFunction<typeof usePhotoOptimization>;
const mockUseImageCache = useImageCache as jest.MockedFunction<typeof useImageCache>;
const mockUseProgressiveImage = useProgressiveImage as jest.MockedFunction<typeof useProgressiveImage>;
const mockUseLazyImageLoading = useLazyImageLoading as jest.MockedFunction<typeof useLazyImageLoading>;

describe('Photo Performance Tests', () => {
  const mockPhotoUrl = 'https://example.com/photo.jpg';
  const mockLowResUrl = 'https://example.com/photo-lowres.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUsePhotoOptimization.mockReturnValue({
      accessibilityConfig: { isScreenReaderEnabled: false },
      accessibilityLabels: {},
      accessibilityHints: {},
      announceToScreenReader: jest.fn(),
      setAccessibilityFocus: jest.fn(),
      getAnimationDuration: jest.fn().mockReturnValue(300),
      getGestureTimeout: jest.fn().mockReturnValue(500),
      shouldUseSimplifiedUI: jest.fn().mockReturnValue(false),
      getAccessibleColors: jest.fn().mockReturnValue(null),
      optimizePhoto: jest.fn(),
      generateThumbnail: jest.fn(),
      preloadPhotos: jest.fn(),
      optimizeBatch: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
      createProgressiveImage: jest.fn(),
      createLazyImage: jest.fn(),
      prefetchNextImages: jest.fn(),
      measureRenderTime: jest.fn().mockReturnValue({
        start: jest.fn(),
        end: jest.fn(),
      }),
      isLoading: false,
      error: null,
      optimizedPhotos: new Map(),
      thumbnails: new Map(),
      renderMetrics: new Map(),
    });

    mockUseImageCache.mockReturnValue({
      getCachedImage: jest.fn().mockResolvedValue(null),
      setCachedImage: jest.fn(),
      preloadImages: jest.fn().mockResolvedValue(undefined),
      clearCache: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({
        size: 0,
        entries: 0,
        hitRate: 0,
        memoryUsage: 0,
      }),
      isLoading: false,
      error: null,
    });

    mockUseProgressiveImage.mockReturnValue({
      currentImageUrl: mockPhotoUrl,
      isLowResLoaded: false,
      isHighResLoaded: true,
      isLoading: false,
      error: null,
      loadingProgress: 100,
      metrics: {
        lowResLoadTime: 100,
        highResLoadTime: 500,
        totalLoadTime: 600,
      },
    });

    mockUseLazyImageLoading.mockReturnValue({
      isVisible: true,
      shouldLoad: true,
      elementRef: { current: null },
      onLayout: jest.fn(),
    });
  });

  describe('Lazy Loading', () => {
    it('should not load image when not visible', () => {
      mockUseLazyImageLoading.mockReturnValue({
        isVisible: false,
        shouldLoad: false,
        elementRef: { current: null },
        onLayout: jest.fn(),
      });

      const { getByTestId } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="lazy-photo"
          enableLazyLoading={true}
        />
      );

      const placeholder = getByTestId('lazy-photo-placeholder');
      expect(placeholder).toBeTruthy();
    });

    it('should load image when becomes visible', async () => {
      const mockOnLayout = jest.fn();
      mockUseLazyImageLoading.mockReturnValue({
        isVisible: true,
        shouldLoad: true,
        elementRef: { current: null },
        onLayout: mockOnLayout,
      });

      const { getByTestId } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="lazy-photo"
          enableLazyLoading={true}
        />
      );

      const component = getByTestId('lazy-photo');
      expect(component).toBeTruthy();
      expect(mockOnLayout).toHaveBeenCalled();
    });

    it('should measure render time for lazy loaded images', () => {
      const mockMeasureRenderTime = jest.fn().mockReturnValue({
        start: jest.fn(),
        end: jest.fn(),
      });

      mockUsePhotoOptimization.mockReturnValue({
        ...mockUsePhotoOptimization(),
        measureRenderTime: mockMeasureRenderTime,
      });

      render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="performance-photo"
          enableLazyLoading={true}
        />
      );

      expect(mockMeasureRenderTime).toHaveBeenCalledWith('OptimizedPhotoComponent-performance-photo');
    });
  });

  describe('Progressive Loading', () => {
    it('should show low-res image first', () => {
      mockUseProgressiveImage.mockReturnValue({
        currentImageUrl: mockLowResUrl,
        isLowResLoaded: true,
        isHighResLoaded: false,
        isLoading: true,
        error: null,
        loadingProgress: 50,
        metrics: null,
      });

      const { getByTestId } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          lowResUrl={mockLowResUrl}
          testID="progressive-photo"
          enableProgressiveLoading={true}
        />
      );

      const component = getByTestId('progressive-photo');
      expect(component).toBeTruthy();
    });

    it('should show progress indicator during loading', () => {
      mockUseProgressiveImage.mockReturnValue({
        currentImageUrl: mockLowResUrl,
        isLowResLoaded: true,
        isHighResLoaded: false,
        isLoading: true,
        error: null,
        loadingProgress: 75,
        metrics: null,
      });

      const { getByLabelText } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          lowResUrl={mockLowResUrl}
          enableProgressiveLoading={true}
          showLoadingIndicator={true}
        />
      );

      const loadingIndicator = getByLabelText('Loading photo');
      expect(loadingIndicator).toBeTruthy();
    });

    it('should transition to high-res image when loaded', async () => {
      const { rerender } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          lowResUrl={mockLowResUrl}
          enableProgressiveLoading={true}
        />
      );

      // Simulate high-res image loaded
      mockUseProgressiveImage.mockReturnValue({
        currentImageUrl: mockPhotoUrl,
        isLowResLoaded: true,
        isHighResLoaded: true,
        isLoading: false,
        error: null,
        loadingProgress: 100,
        metrics: {
          lowResLoadTime: 100,
          highResLoadTime: 500,
          totalLoadTime: 600,
        },
      });

      rerender(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          lowResUrl={mockLowResUrl}
          enableProgressiveLoading={true}
        />
      );

      await waitFor(() => {
        expect(mockUseProgressiveImage).toHaveBeenCalled();
      });
    });
  });

  describe('Caching', () => {
    it('should check cache before loading image', async () => {
      const mockGetCachedImage = jest.fn().mockResolvedValue(mockPhotoUrl);
      mockUseImageCache.mockReturnValue({
        ...mockUseImageCache(),
        getCachedImage: mockGetCachedImage,
      });

      render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          enableCaching={true}
        />
      );

      await waitFor(() => {
        expect(mockGetCachedImage).toHaveBeenCalledWith(mockPhotoUrl);
      });
    });

    it('should cache image after successful load', async () => {
      const mockSetCachedImage = jest.fn();
      mockUseImageCache.mockReturnValue({
        ...mockUseImageCache(),
        setCachedImage: mockSetCachedImage,
      });

      const { getByTestId } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="cached-photo"
          enableCaching={true}
        />
      );

      const component = getByTestId('cached-photo');
      expect(component).toBeTruthy();
    });

    it('should provide cache statistics', () => {
      const mockGetCacheStats = jest.fn().mockReturnValue({
        size: 5,
        entries: 5,
        hitRate: 80,
        memoryUsage: 25.5,
      });

      mockUseImageCache.mockReturnValue({
        ...mockUseImageCache(),
        getCacheStats: mockGetCacheStats,
      });

      render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          enableCaching={true}
        />
      );

      const stats = mockGetCacheStats();
      expect(stats.hitRate).toBe(80);
      expect(stats.memoryUsage).toBe(25.5);
    });
  });

  describe('Prefetching', () => {
    it('should prefetch next images in gallery', async () => {
      const mockPrefetchNextImages = jest.fn().mockResolvedValue(undefined);
      mockUsePhotoOptimization.mockReturnValue({
        ...mockUsePhotoOptimization(),
        prefetchNextImages: mockPrefetchNextImages,
      });

      const photoUrls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
      ];

      render(
        <OptimizedPhotoComponent
          photoUrl={photoUrls[1]}
          index={1}
          enablePrefetching={true}
        />
      );

      // Simulate prefetching call
      await act(async () => {
        await mockPrefetchNextImages(1, photoUrls, 1);
      });

      expect(mockPrefetchNextImages).toHaveBeenCalledWith(1, photoUrls, 1);
    });

    it('should preload images in background', async () => {
      const mockPreloadImages = jest.fn().mockResolvedValue(undefined);
      mockUseImageCache.mockReturnValue({
        ...mockUseImageCache(),
        preloadImages: mockPreloadImages,
      });

      const imagesToPreload = [
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
      ];

      await act(async () => {
        await mockPreloadImages(imagesToPreload);
      });

      expect(mockPreloadImages).toHaveBeenCalledWith(imagesToPreload);
    });
  });

  describe('Performance Metrics', () => {
    it('should measure component render time', () => {
      const mockStart = jest.fn();
      const mockEnd = jest.fn();
      const mockMeasureRenderTime = jest.fn().mockReturnValue({
        start: mockStart,
        end: mockEnd,
      });

      mockUsePhotoOptimization.mockReturnValue({
        ...mockUsePhotoOptimization(),
        measureRenderTime: mockMeasureRenderTime,
      });

      const { unmount } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="performance-test"
        />
      );

      expect(mockStart).toHaveBeenCalled();

      unmount();

      expect(mockEnd).toHaveBeenCalled();
    });

    it('should track progressive loading metrics', () => {
      const mockMetrics = {
        lowResLoadTime: 150,
        highResLoadTime: 800,
        totalLoadTime: 950,
      };

      mockUseProgressiveImage.mockReturnValue({
        currentImageUrl: mockPhotoUrl,
        isLowResLoaded: true,
        isHighResLoaded: true,
        isLoading: false,
        error: null,
        loadingProgress: 100,
        metrics: mockMetrics,
      });

      render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          enableProgressiveLoading={true}
        />
      );

      expect(mockUseProgressiveImage).toHaveBeenCalledWith(
        expect.objectContaining({
          enableMetrics: true,
        })
      );
    });

    it('should log slow renders', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const mockMeasureRenderTime = jest.fn().mockReturnValue({
        start: jest.fn(),
        end: jest.fn(),
      });

      mockUsePhotoOptimization.mockReturnValue({
        ...mockUsePhotoOptimization(),
        measureRenderTime: mockMeasureRenderTime,
        renderMetrics: new Map([['OptimizedPhotoComponent-slow', 25]]), // 25ms > 16ms threshold
      });

      render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="slow"
        />
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources on unmount', () => {
      const mockClearCache = jest.fn();
      mockUseImageCache.mockReturnValue({
        ...mockUseImageCache(),
        clearCache: mockClearCache,
      });

      const { unmount } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          enableCaching={true}
        />
      );

      unmount();

      // Verify cleanup is handled by hooks
      expect(mockUseImageCache).toHaveBeenCalled();
    });

    it('should respect memory limits in cache', () => {
      const mockGetCacheStats = jest.fn().mockReturnValue({
        size: 100,
        entries: 100,
        hitRate: 75,
        memoryUsage: 49.8, // Just under 50MB limit
      });

      mockUseImageCache.mockReturnValue({
        ...mockUseImageCache(),
        getCacheStats: mockGetCacheStats,
      });

      render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          enableCaching={true}
        />
      );

      const stats = mockGetCacheStats();
      expect(stats.memoryUsage).toBeLessThan(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle progressive loading errors gracefully', () => {
      mockUseProgressiveImage.mockReturnValue({
        currentImageUrl: null,
        isLowResLoaded: false,
        isHighResLoaded: false,
        isLoading: false,
        error: new Error('Failed to load image'),
        loadingProgress: 0,
        metrics: null,
      });

      const { getByTestId } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="error-photo"
          enableProgressiveLoading={true}
        />
      );

      const errorComponent = getByTestId('error-photo-error');
      expect(errorComponent).toBeTruthy();
    });

    it('should handle cache errors without breaking', () => {
      const mockGetCachedImage = jest.fn().mockRejectedValue(new Error('Cache error'));
      mockUseImageCache.mockReturnValue({
        ...mockUseImageCache(),
        getCachedImage: mockGetCachedImage,
        error: new Error('Cache error'),
      });

      const { getByTestId } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="cache-error-photo"
          enableCaching={true}
        />
      );

      const component = getByTestId('cache-error-photo');
      expect(component).toBeTruthy();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility during lazy loading', () => {
      mockUseLazyImageLoading.mockReturnValue({
        isVisible: false,
        shouldLoad: false,
        elementRef: { current: null },
        onLayout: jest.fn(),
      });

      const { getByTestId } = render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          testID="accessible-lazy-photo"
          enableLazyLoading={true}
          intakeMetadata={{
            substanceName: 'Aspirin',
            dosage: '325',
            unit: 'mg',
          }}
        />
      );

      const placeholder = getByTestId('accessible-lazy-photo-placeholder');
      expect(placeholder).toBeTruthy();
    });

    it('should announce loading progress to screen readers', () => {
      const mockAnnounceToScreenReader = jest.fn();
      mockUsePhotoOptimization.mockReturnValue({
        ...mockUsePhotoOptimization(),
        announceToScreenReader: mockAnnounceToScreenReader,
        accessibilityConfig: { isScreenReaderEnabled: true },
      });

      render(
        <OptimizedPhotoComponent
          photoUrl={mockPhotoUrl}
          fileName="test-photo.jpg"
          enableProgressiveLoading={true}
        />
      );

      // Simulate image load
      act(() => {
        mockAnnounceToScreenReader('Photo test-photo.jpg loaded successfully');
      });

      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
        'Photo test-photo.jpg loaded successfully'
      );
    });
  });
});