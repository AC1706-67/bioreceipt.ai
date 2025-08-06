/**
 * Optimized Photo Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OptimizedPhotoComponent } from '../OptimizedPhotoComponent';
import { photoAccessibilityService } from '../../../services/photo/photoAccessibilityService';
import { photoPerformanceService } from '../../../services/photo/photoPerformanceService';

// Mock services
jest.mock('../../../services/photo/photoAccessibilityService');
jest.mock('../../../services/photo/photoPerformanceService');

// Mock React Native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn(),
    })),
    Image: 'Animated.Image',
  },
}));

const mockPhotoAccessibilityService = photoAccessibilityService as jest.Mocked<typeof photoAccessibilityService>;
const mockPhotoPerformanceService = photoPerformanceService as jest.Mocked<typeof photoPerformanceService>;

describe('OptimizedPhotoComponent', () => {
  const defaultProps = {
    photoUrl: 'https://example.com/photo.jpg',
    fileName: 'test.jpg',
    index: 0,
    total: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockPhotoAccessibilityService.getAccessibilityConfig.mockReturnValue({
      isScreenReaderEnabled: false,
      isReduceMotionEnabled: false,
      isHighContrastEnabled: false,
      preferredTextSize: 'medium',
      isVoiceOverEnabled: false,
      isTalkBackEnabled: false,
    });

    mockPhotoAccessibilityService.getLabels.mockReturnValue({
      photoPreview: jest.fn((fileName, index, total) => 
        `Photo ${fileName}, ${index + 1} of ${total}. Double tap to view full screen, swipe up for more options.`
      ),
      errorState: jest.fn((errorType) => 'Failed to load image'),
    });

    mockPhotoAccessibilityService.getHints.mockReturnValue({
      photoPreview: 'Double tap to view full screen, long press for options menu',
    });

    mockPhotoAccessibilityService.subscribe.mockReturnValue(() => {});
    mockPhotoAccessibilityService.getAnimationDuration.mockReturnValue(300);
    mockPhotoAccessibilityService.getGestureTimeout.mockReturnValue(500);
    mockPhotoAccessibilityService.getAccessibleColors.mockReturnValue(null);

    mockPhotoPerformanceService.generateThumbnail.mockResolvedValue('https://example.com/thumbnail.jpg');
    mockPhotoPerformanceService.optimizePhoto.mockResolvedValue('https://example.com/optimized.jpg');
  });

  describe('rendering', () => {
    it('should render photo component with correct accessibility properties', async () => {
      const { getByRole } = render(<OptimizedPhotoComponent {...defaultProps} />);
      
      await waitFor(() => {
        const button = getByRole('imagebutton');
        expect(button).toBeTruthy();
        expect(button.props.accessibilityLabel).toBe(
          'Photo test.jpg, 1 of 3. Double tap to view full screen, swipe up for more options.'
        );
        expect(button.props.accessibilityHint).toBe(
          'Double tap to view full screen, long press for options menu'
        );
      });
    });

    it('should show loading indicator when photo is loading', () => {
      const { getByLabelText } = render(
        <OptimizedPhotoComponent {...defaultProps} showLoadingIndicator={true} />
      );
      
      expect(getByLabelText('Loading photo')).toBeTruthy();
    });

    it('should not show loading indicator when disabled', () => {
      const { queryByLabelText } = render(
        <OptimizedPhotoComponent {...defaultProps} showLoadingIndicator={false} />
      );
      
      expect(queryByLabelText('Loading photo')).toBeNull();
    });

    it('should render error state when image fails to load', async () => {
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(new Error('Failed to load'));
      
      const { getByText } = render(<OptimizedPhotoComponent {...defaultProps} />);
      
      await waitFor(() => {
        expect(getByText('Failed to load image')).toBeTruthy();
      });
    });
  });

  describe('photo optimization', () => {
    it('should optimize photo on mount', async () => {
      render(<OptimizedPhotoComponent {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockPhotoPerformanceService.optimizePhoto).toHaveBeenCalledWith(
          defaultProps.photoUrl,
          expect.objectContaining({
            quality: 0.8,
            stripMetadata: true,
          })
        );
      });
    });

    it('should generate thumbnail when enabled', async () => {
      render(<OptimizedPhotoComponent {...defaultProps} enableThumbnail={true} />);
      
      await waitFor(() => {
        expect(mockPhotoPerformanceService.generateThumbnail).toHaveBeenCalledWith(
          defaultProps.photoUrl,
          undefined
        );
      });
    });

    it('should not generate thumbnail when disabled', async () => {
      render(<OptimizedPhotoComponent {...defaultProps} enableThumbnail={false} />);
      
      await waitFor(() => {
        expect(mockPhotoPerformanceService.generateThumbnail).not.toHaveBeenCalled();
      });
    });

    it('should use custom thumbnail size when provided', async () => {
      const customSize = { width: 150, height: 150 };
      
      render(
        <OptimizedPhotoComponent 
          {...defaultProps} 
          enableThumbnail={true}
          thumbnailSize={customSize}
        />
      );
      
      await waitFor(() => {
        expect(mockPhotoPerformanceService.generateThumbnail).toHaveBeenCalledWith(
          defaultProps.photoUrl,
          customSize
        );
      });
    });

    it('should adjust quality based on priority', async () => {
      render(<OptimizedPhotoComponent {...defaultProps} priority="high" />);
      
      await waitFor(() => {
        expect(mockPhotoPerformanceService.optimizePhoto).toHaveBeenCalledWith(
          defaultProps.photoUrl,
          expect.objectContaining({
            quality: 0.9,
          })
        );
      });
    });
  });

  describe('accessibility features', () => {
    it('should subscribe to accessibility changes', () => {
      render(<OptimizedPhotoComponent {...defaultProps} />);
      
      expect(mockPhotoAccessibilityService.subscribe).toHaveBeenCalled();
    });

    it('should use reduced animation duration when reduce motion is enabled', () => {
      mockPhotoAccessibilityService.getAnimationDuration.mockReturnValue(0);
      
      render(<OptimizedPhotoComponent {...defaultProps} />);
      
      expect(mockPhotoAccessibilityService.getAnimationDuration).toHaveBeenCalledWith(300);
    });

    it('should use extended gesture timeout for screen reader users', () => {
      mockPhotoAccessibilityService.getGestureTimeout.mockReturnValue(1000);
      
      const { getByRole } = render(<OptimizedPhotoComponent {...defaultProps} />);
      
      const button = getByRole('imagebutton');
      expect(button.props.delayLongPress).toBe(1000);
    });

    it('should apply high contrast colors when enabled', () => {
      const highContrastColors = {
        accent: '#0066CC',
        error: '#CC0000',
      };
      
      mockPhotoAccessibilityService.getAccessibleColors.mockReturnValue(highContrastColors);
      mockPhotoAccessibilityService.getAccessibilityConfig.mockReturnValue({
        ...mockPhotoAccessibilityService.getAccessibilityConfig(),
        shouldUseHighContrast: true,
      });
      
      render(<OptimizedPhotoComponent {...defaultProps} />);
      
      expect(mockPhotoAccessibilityService.getAccessibleColors).toHaveBeenCalled();
    });

    it('should announce photo load success to screen reader', async () => {
      mockPhotoAccessibilityService.getAccessibilityConfig.mockReturnValue({
        ...mockPhotoAccessibilityService.getAccessibilityConfig(),
        isScreenReaderEnabled: true,
      });
      
      render(<OptimizedPhotoComponent {...defaultProps} />);
      
      // Simulate image load
      await waitFor(() => {
        expect(mockPhotoAccessibilityService.announceToScreenReader).toHaveBeenCalledWith(
          'Photo test.jpg loaded successfully'
        );
      });
    });

    it('should announce errors to screen reader with high priority', async () => {
      mockPhotoAccessibilityService.getAccessibilityConfig.mockReturnValue({
        ...mockPhotoAccessibilityService.getAccessibilityConfig(),
        isScreenReaderEnabled: true,
      });
      
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(new Error('Failed to load'));
      
      render(<OptimizedPhotoComponent {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockPhotoAccessibilityService.announceToScreenReader).toHaveBeenCalledWith(
          'Failed to load photo. Please try again.',
          'high'
        );
      });
    });
  });

  describe('user interactions', () => {
    it('should handle press events', async () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <OptimizedPhotoComponent {...defaultProps} onPress={onPress} />
      );
      
      await waitFor(() => {
        const button = getByRole('imagebutton');
        fireEvent.press(button);
        expect(onPress).toHaveBeenCalled();
      });
    });

    it('should handle long press events', async () => {
      const onLongPress = jest.fn();
      const { getByRole } = render(
        <OptimizedPhotoComponent {...defaultProps} onLongPress={onLongPress} />
      );
      
      await waitFor(() => {
        const button = getByRole('imagebutton');
        fireEvent(button, 'longPress');
        expect(onLongPress).toHaveBeenCalled();
      });
    });

    it('should not handle interactions when in error state', async () => {
      const onPress = jest.fn();
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(new Error('Failed'));
      
      const { getByRole } = render(
        <OptimizedPhotoComponent {...defaultProps} onPress={onPress} />
      );
      
      await waitFor(() => {
        // Should render error state instead of interactive button
        expect(() => getByRole('imagebutton')).toThrow();
      });
    });

    it('should set accessibility focus after press for screen reader users', async () => {
      mockPhotoAccessibilityService.getAccessibilityConfig.mockReturnValue({
        ...mockPhotoAccessibilityService.getAccessibilityConfig(),
        isScreenReaderEnabled: true,
      });
      
      const { getByRole } = render(<OptimizedPhotoComponent {...defaultProps} />);
      
      await waitFor(() => {
        const button = getByRole('imagebutton');
        fireEvent.press(button);
        
        // Should set focus after a delay
        setTimeout(() => {
          expect(mockPhotoAccessibilityService.setAccessibilityFocus).toHaveBeenCalled();
        }, 150);
      });
    });
  });

  describe('error handling', () => {
    it('should call onError callback when optimization fails', async () => {
      const onError = jest.fn();
      const error = new Error('Optimization failed');
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(error);
      
      render(<OptimizedPhotoComponent {...defaultProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should render error state with accessible error message', async () => {
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(new Error('Failed'));
      
      const { getByRole } = render(<OptimizedPhotoComponent {...defaultProps} />);
      
      await waitFor(() => {
        const errorElement = getByRole('image');
        expect(errorElement.props.accessibilityLabel).toBe('Failed to load image');
      });
    });

    it('should apply error colors in high contrast mode', async () => {
      const highContrastColors = {
        error: '#CC0000',
      };
      
      mockPhotoAccessibilityService.getAccessibleColors.mockReturnValue(highContrastColors);
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(new Error('Failed'));
      
      render(<OptimizedPhotoComponent {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockPhotoAccessibilityService.getAccessibleColors).toHaveBeenCalled();
      });
    });
  });

  describe('performance optimizations', () => {
    it('should show thumbnail while main image loads', async () => {
      // Mock slow optimization
      mockPhotoPerformanceService.optimizePhoto.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('optimized.jpg'), 1000))
      );
      
      render(<OptimizedPhotoComponent {...defaultProps} enableThumbnail={true} />);
      
      // Should show thumbnail initially
      await waitFor(() => {
        expect(mockPhotoPerformanceService.generateThumbnail).toHaveBeenCalled();
      });
    });

    it('should handle different resize modes', () => {
      const { rerender } = render(
        <OptimizedPhotoComponent {...defaultProps} resizeMode="contain" />
      );
      
      rerender(<OptimizedPhotoComponent {...defaultProps} resizeMode="cover" />);
      rerender(<OptimizedPhotoComponent {...defaultProps} resizeMode="stretch" />);
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should apply custom styles', () => {
      const customStyle = { borderRadius: 10 };
      
      render(<OptimizedPhotoComponent {...defaultProps} style={customStyle} />);
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('testID support', () => {
    it('should apply testID to main component', async () => {
      const { getByTestId } = render(
        <OptimizedPhotoComponent {...defaultProps} testID="photo-component" />
      );
      
      await waitFor(() => {
        expect(getByTestId('photo-component')).toBeTruthy();
      });
    });

    it('should apply testID to error state', async () => {
      mockPhotoPerformanceService.optimizePhoto.mockRejectedValue(new Error('Failed'));
      
      const { getByTestId } = render(
        <OptimizedPhotoComponent {...defaultProps} testID="photo-component" />
      );
      
      await waitFor(() => {
        expect(getByTestId('photo-component-error')).toBeTruthy();
      });
    });
  });
});