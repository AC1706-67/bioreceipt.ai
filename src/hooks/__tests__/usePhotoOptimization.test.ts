import React from 'react';
import { renderHook, act, cleanup } from '@testing-library/react-hooks';
import { usePhotoOptimization } from '../usePhotoOptimization';
import { photoAccessibilityService } from '../../services/photo/photoAccessibilityService';
import { photoPerformanceService } from '../../services/photo/photoPerformanceService';

jest.mock('../../services/photo/photoAccessibilityService');
jest.mock('../../services/photo/photoPerformanceService');

const mockPhotoAccessibilityService = photoAccessibilityService as jest.Mocked<typeof photoAccessibilityService>;
const mockPhotoPerformanceService = photoPerformanceService as jest.Mocked<typeof photoPerformanceService>;

describe('usePhotoOptimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPhotoAccessibilityService.getAccessibilityConfig.mockReturnValue({
      isScreenReaderEnabled: false,
      isReduceMotionEnabled: false,
      isHighContrastEnabled: false,
      preferredTextSize: 'medium',
      isVoiceOverEnabled: false,
      isTalkBackEnabled: false,
    });

    mockPhotoAccessibilityService.getLabels.mockReturnValue({
      photoPreview: jest.fn(),
      photoCapture: jest.fn(),
      photoDelete: jest.fn(),
      photoFullScreen: jest.fn(),
      photoGallery: jest.fn(),
      uploadProgress: jest.fn(),
      errorState: jest.fn(),
      emptyState: jest.fn(),
    });

    mockPhotoAccessibilityService.getHints.mockReturnValue({
      photoPreview: 'Double tap to view full screen',
      photoCapture: 'Double tap to take a photo',
      photoDelete: 'Double tap to delete this photo',
      photoGallery: 'Swipe to navigate between photos',
      uploadProgress: 'Upload in progress, please wait',
      retryButton: 'Double tap to retry the operation',
      settingsButton: 'Double tap to open settings',
    });

    mockPhotoAccessibilityService.subscribe.mockReturnValue(() => {});
    mockPhotoAccessibilityService.announceToScreenReader.mockImplementation(() => {});
    mockPhotoAccessibilityService.setAccessibilityFocus.mockImplementation(() => {});
    mockPhotoAccessibilityService.getAnimationDuration.mockReturnValue(300);
    mockPhotoAccessibilityService.getGestureTimeout.mockReturnValue(500);
    mockPhotoAccessibilityService.shouldUseSimplifiedUI.mockReturnValue(false);
    mockPhotoAccessibilityService.getAccessibleColors.mockReturnValue(null);

    mockPhotoPerformanceService.configure.mockImplementation(() => {});
    mockPhotoPerformanceService.optimizePhoto.mockResolvedValue('optimized-url');
    mockPhotoPerformanceService.generateThumbnail.mockResolvedValue('thumbnail-url');
    mockPhotoPerformanceService.preloadPhotos.mockResolvedValue();
    mockPhotoPerformanceService.optimizeBatch.mockResolvedValue(['batch-url-1', 'batch-url-2']);
    mockPhotoPerformanceService.getPerformanceMetrics.mockReturnValue({
      loadTime: 150,
      cacheHitRate: 0.75,
      memoryUsage: 50,
      compressionRatio: 0.6,
      thumbnailGenerationTime: 100,
    });
    mockPhotoPerformanceService.getCacheStats.mockReturnValue({
      memoryCacheSize: 10,
      cacheHits: 75,
      cacheMisses: 25,
      hitRate: 0.75,
      averageLoadTime: 150,
      averageThumbnailTime: 100,
    });
    mockPhotoPerformanceService.clearCache.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
  });

  describe('initialization', () => {
    it('should return accessibility and performance props when both services succeed', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      expect(result.current.accessibilityConfig).toBeDefined();
      expect(result.current.accessibilityLabels).toBeDefined();
      expect(result.current.accessibilityHints).toBeDefined();
      expect(result.current.optimizePhoto).toBeDefined();
      expect(result.current.generateThumbnail).toBeDefined();
      expect(result.current.preloadPhotos).toBeDefined();
      expect(result.current.optimizeBatch).toBeDefined();
      expect(result.current.getPerformanceMetrics).toBeDefined();
      expect(result.current.getCacheStats).toBeDefined();
      expect(result.current.clearCache).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle accessibility service disabled', () => {
      const { result } = renderHook(() => 
        usePhotoOptimization({ enableAccessibility: false })
      );

      expect(result.current.accessibilityConfig).toBeNull();
      expect(result.current.accessibilityLabels).toBeNull();
      expect(result.current.accessibilityHints).toBeNull();
      expect(result.current.optimizePhoto).toBeDefined();
      expect(result.current.generateThumbnail).toBeDefined();
    });

    it('should handle performance service disabled', () => {
      const { result } = renderHook(() => 
        usePhotoOptimization({ enablePerformanceOptimization: false })
      );

      expect(result.current.accessibilityConfig).toBeDefined();
      expect(result.current.optimizePhoto).toBeDefined();
      expect(result.current.getPerformanceMetrics()).toBeNull();
      expect(result.current.getCacheStats()).toBeNull();
    });
  });

  describe('accessibility features', () => {
    it('should subscribe to accessibility changes', () => {
      renderHook(() => usePhotoOptimization());

      expect(mockPhotoAccessibilityService.subscribe).toHaveBeenCalled();
    });

    it('should announce to screen reader', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      act(() => {
        result.current.announceToScreenReader('Test message', 'high');
      });

      expect(mockPhotoAccessibilityService.announceToScreenReader).toHaveBeenCalledWith('Test message', 'high');
    });

    it('should set accessibility focus', () => {
      const { result } = renderHook(() => usePhotoOptimization());
      const mockRef = { current: {} };

      act(() => {
        result.current.setAccessibilityFocus(mockRef);
      });

      expect(mockPhotoAccessibilityService.setAccessibilityFocus).toHaveBeenCalledWith(mockRef);
    });

    it('should get animation duration', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      const duration = result.current.getAnimationDuration(500);

      expect(mockPhotoAccessibilityService.getAnimationDuration).toHaveBeenCalledWith(500);
      expect(duration).toBe(300);
    });

    it('should get gesture timeout', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      const timeout = result.current.getGestureTimeout(1000);

      expect(mockPhotoAccessibilityService.getGestureTimeout).toHaveBeenCalledWith(1000);
      expect(timeout).toBe(500);
    });

    it('should check if simplified UI should be used', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      const shouldSimplify = result.current.shouldUseSimplifiedUI();

      expect(mockPhotoAccessibilityService.shouldUseSimplifiedUI).toHaveBeenCalled();
      expect(shouldSimplify).toBe(false);
    });

    it('should get accessible colors', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      const colors = result.current.getAccessibleColors();

      expect(mockPhotoAccessibilityService.getAccessibleColors).toHaveBeenCalled();
      expect(colors).toBeNull();
    });
  });

  describe('performance features', () => {
    it('should optimize photo', async () => {
      const { result } = renderHook(() => usePhotoOptimization());

      let optimizedUrl: string;
      await act(async () => {
        optimizedUrl = await result.current.optimizePhoto('test-url');
      });

      expect(mockPhotoPerformanceService.optimizePhoto).toHaveBeenCalledWith('test-url', expect.objectContaining({
        quality: 0.8,
        stripMetadata: true,
      }));
      expect(optimizedUrl!).toBe('optimized-url');
    });

    it('should generate thumbnail', async () => {
      const { result } = renderHook(() => usePhotoOptimization());

      let thumbnailUrl: string;
      await act(async () => {
        thumbnailUrl = await result.current.generateThumbnail('test-url');
      });

      expect(mockPhotoPerformanceService.generateThumbnail).toHaveBeenCalledWith('test-url', { width: 200, height: 200 });
      expect(thumbnailUrl!).toBe('thumbnail-url');
    });

    it('should preload photos', async () => {
      const { result } = renderHook(() => usePhotoOptimization({ preloadPhotos: true }));
      const urls = ['url1', 'url2'];

      await act(async () => {
        await result.current.preloadPhotos(urls);
      });

      expect(mockPhotoPerformanceService.preloadPhotos).toHaveBeenCalledWith(urls);
    });

    it('should optimize batch', async () => {
      const { result } = renderHook(() => usePhotoOptimization());
      const urls = ['url1', 'url2'];

      let optimizedUrls: string[];
      await act(async () => {
        optimizedUrls = await result.current.optimizeBatch(urls);
      });

      expect(mockPhotoPerformanceService.optimizeBatch).toHaveBeenCalledWith(urls, expect.objectContaining({
        quality: 0.8,
        stripMetadata: true,
      }));
      expect(optimizedUrls!).toEqual(['batch-url-1', 'batch-url-2']);
    });

    it('should get performance metrics', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      const metrics = result.current.getPerformanceMetrics();

      expect(mockPhotoPerformanceService.getPerformanceMetrics).toHaveBeenCalled();
      expect(metrics).toEqual({
        loadTime: 150,
        cacheHitRate: 0.75,
        memoryUsage: 50,
        compressionRatio: 0.6,
        thumbnailGenerationTime: 100,
      });
    });

    it('should get cache stats', () => {
      const { result } = renderHook(() => usePhotoOptimization());

      const stats = result.current.getCacheStats();

      expect(mockPhotoPerformanceService.getCacheStats).toHaveBeenCalled();
      expect(stats).toEqual({
        memoryCacheSize: 10,
        cacheHits: 75,
        cacheMisses: 25,
        hitRate: 0.75,
        averageLoadTime: 150,
        averageThumbnailTime: 100,
      });
    });

    it('should clear cache', async () => {
      const { result } = renderHook(() => usePhotoOptimization());

      await act(async () => {
        await result.current.clearCache();
      });

      expect(mockPhotoPerformanceService.clearCache).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle accessibility service errors gracefully', () => {
      mockPhotoAccessibilityService.getAccessibilityConfig.mockImplementation(() => {
        throw new Error('Accessibility service error');
      });

      const { result } = renderHook(() => usePhotoOptimization());

      expect(result.current.accessibilityConfig).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it('should handle performance service errors', async () => {
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(new Error('Performance service error'));

      const { result } = renderHook(() => usePhotoOptimization());

      let optimizedUrl: string;
      await act(async () => {
        optimizedUrl = await result.current.optimizePhoto('test-url');
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(optimizedUrl!).toBe('test-url');
    });

    it('should handle thumbnail generation errors', async () => {
      mockPhotoPerformanceService.generateThumbnail.mockRejectedValue(new Error('Thumbnail error'));

      const { result } = renderHook(() => usePhotoOptimization());

      let thumbnailUrl: string;
      await act(async () => {
        thumbnailUrl = await result.current.generateThumbnail('test-url');
      });

      expect(thumbnailUrl!).toBe('test-url');
    });

    it('should handle preload errors', async () => {
      mockPhotoPerformanceService.preloadPhotos.mockRejectedValue(new Error('Preload error'));

      const { result } = renderHook(() => usePhotoOptimization({ preloadPhotos: true }));

      await act(async () => {
        await result.current.preloadPhotos(['url1', 'url2']);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should handle batch optimization errors', async () => {
      mockPhotoPerformanceService.optimizeBatch.mockRejectedValue(new Error('Batch error'));

      const { result } = renderHook(() => usePhotoOptimization());
      const urls = ['url1', 'url2'];

      let optimizedUrls: string[];
      await act(async () => {
        optimizedUrls = await result.current.optimizeBatch(urls);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(optimizedUrls!).toEqual(urls);
    });

    it('should handle cache clearing errors', async () => {
      mockPhotoPerformanceService.clearCache.mockRejectedValue(new Error('Cache clear error'));

      const { result } = renderHook(() => usePhotoOptimization());

      await act(async () => {
        await result.current.clearCache();
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('configuration options', () => {
    it('should configure performance service with high priority', () => {
      renderHook(() => usePhotoOptimization({ priority: 'high' }));

      expect(mockPhotoPerformanceService.configure).toHaveBeenCalledWith(expect.objectContaining({
        compressionQuality: 0.9,
      }));
    });

    it('should configure performance service with low priority', () => {
      renderHook(() => usePhotoOptimization({ priority: 'low' }));

      expect(mockPhotoPerformanceService.configure).toHaveBeenCalledWith(expect.objectContaining({
        compressionQuality: 0.7,
      }));
    });

    it('should disable caching when requested', () => {
      renderHook(() => usePhotoOptimization({ cachePhotos: false }));

      expect(mockPhotoPerformanceService.configure).toHaveBeenCalledWith(expect.objectContaining({
        enableMemoryCache: false,
        enableDiskCache: false,
      }));
    });

    it('should disable thumbnails when requested', async () => {
      const { result } = renderHook(() => usePhotoOptimization({ enableThumbnails: false }));

      let thumbnailUrl: string;
      await act(async () => {
        thumbnailUrl = await result.current.generateThumbnail('test-url');
      });

      expect(mockPhotoPerformanceService.generateThumbnail).not.toHaveBeenCalled();
      expect(thumbnailUrl!).toBe('test-url');
    });
  });

  describe('loading states', () => {
    it('should set loading state during photo optimization', async () => {
      let resolveOptimize: (value: string) => void;
      mockPhotoPerformanceService.optimizePhoto.mockReturnValue(
        new Promise(resolve => { resolveOptimize = resolve; })
      );

      const { result } = renderHook(() => usePhotoOptimization());

      act(() => {
        result.current.optimizePhoto('test-url');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveOptimize!('optimized-url');
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during preloading', async () => {
      let resolvePreload: () => void;
      mockPhotoPerformanceService.preloadPhotos.mockReturnValue(
        new Promise(resolve => { resolvePreload = resolve; })
      );

      const { result } = renderHook(() => usePhotoOptimization({ preloadPhotos: true }));

      act(() => {
        result.current.preloadPhotos(['url1', 'url2']);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePreload!();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('caching behavior', () => {
    it('should cache optimized photos', async () => {
      const { result } = renderHook(() => usePhotoOptimization());

      await act(async () => {
        await result.current.optimizePhoto('test-url');
      });

      expect(result.current.optimizedPhotos.has('test-url')).toBe(true);
      expect(result.current.optimizedPhotos.get('test-url')).toBe('optimized-url');
    });

    it('should cache thumbnails', async () => {
      const { result } = renderHook(() => usePhotoOptimization());

      await act(async () => {
        await result.current.generateThumbnail('test-url');
      });

      const thumbnailKey = 'test-url_200x200';
      expect(result.current.thumbnails.has(thumbnailKey)).toBe(true);
      expect(result.current.thumbnails.get(thumbnailKey)).toBe('thumbnail-url');
    });

    it('should return cached results on subsequent calls', async () => {
      const { result } = renderHook(() => usePhotoOptimization());

      await act(async () => {
        await result.current.optimizePhoto('test-url');
        await result.current.optimizePhoto('test-url');
      });

      expect(mockPhotoPerformanceService.optimizePhoto).toHaveBeenCalledTimes(1);
    });
  });
});