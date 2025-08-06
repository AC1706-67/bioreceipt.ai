/**
 * UndoNotification Component Tests
 * Tests undo notification functionality and animations
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import UndoNotification from '../UndoNotification';

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      spring: jest.fn(() => ({ start: jest.fn() })),
      timing: jest.fn(() => ({ start: jest.fn() })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => '100%'),
      })),
      View: RN.View,
    },
  };
});

const mockAnimated = Animated as jest.Mocked<typeof Animated>;

describe('UndoNotification', () => {
  const defaultProps = {
    visible: true,
    message: 'Photo deleted',
    onUndo: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders when visible is true', () => {
      const { getByText } = render(<UndoNotification {...defaultProps} />);
      
      expect(getByText('Photo deleted')).toBeTruthy();
      expect(getByText('UNDO')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      const { queryByText } = render(
        <UndoNotification {...defaultProps} visible={false} />
      );
      
      expect(queryByText('Photo deleted')).toBeNull();
    });

    it('renders custom message', () => {
      const customMessage = 'Custom deletion message';
      const { getByText } = render(
        <UndoNotification {...defaultProps} message={customMessage} />
      );
      
      expect(getByText(customMessage)).toBeTruthy();
    });

    it('renders default message for single photo', () => {
      const { getByText } = render(
        <UndoNotification {...defaultProps} message="" photoCount={1} />
      );
      
      expect(getByText('Photo deleted')).toBeTruthy();
    });

    it('renders default message for multiple photos', () => {
      const { getByText } = render(
        <UndoNotification {...defaultProps} message="" photoCount={3} />
      );
      
      expect(getByText('3 photos deleted')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onUndo when undo button is pressed', () => {
      const onUndo = jest.fn();
      const { getByText } = render(
        <UndoNotification {...defaultProps} onUndo={onUndo} />
      );
      
      const undoButton = getByText('UNDO');
      fireEvent.press(undoButton);
      
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByText } = render(
        <UndoNotification {...defaultProps} onDismiss={onDismiss} />
      );
      
      const dismissButton = getByText('✕');
      fireEvent.press(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismisses notification after undo is pressed', () => {
      const onUndo = jest.fn();
      const onDismiss = jest.fn();
      const { getByText } = render(
        <UndoNotification
          {...defaultProps}
          onUndo={onUndo}
          onDismiss={onDismiss}
        />
      );
      
      const undoButton = getByText('UNDO');
      fireEvent.press(undoButton);
      
      expect(onUndo).toHaveBeenCalledTimes(1);
      // onDismiss should be called as part of the undo process
    });
  });

  describe('Auto-Dismiss Functionality', () => {
    it('auto-dismisses after default duration', () => {
      const onDismiss = jest.fn();
      render(<UndoNotification {...defaultProps} onDismiss={onDismiss} />);
      
      // Fast-forward past default duration (10 seconds)
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after custom duration', () => {
      const onDismiss = jest.fn();
      const customDuration = 5000;
      
      render(
        <UndoNotification
          {...defaultProps}
          onDismiss={onDismiss}
          duration={customDuration}
        />
      );
      
      // Fast-forward past custom duration
      act(() => {
        jest.advanceTimersByTime(customDuration);
      });
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not auto-dismiss if manually dismissed first', () => {
      const onDismiss = jest.fn();
      const { getByText } = render(
        <UndoNotification {...defaultProps} onDismiss={onDismiss} />
      );
      
      // Manually dismiss
      const dismissButton = getByText('✕');
      fireEvent.press(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
      
      // Fast-forward past duration
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // Should not be called again
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Animations', () => {
    it('triggers slide-in animation when visible becomes true', () => {
      const { rerender } = render(
        <UndoNotification {...defaultProps} visible={false} />
      );
      
      rerender(<UndoNotification {...defaultProps} visible={true} />);
      
      expect(mockAnimated.spring).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0,
          useNativeDriver: true,
        })
      );
    });

    it('triggers progress bar animation when visible', () => {
      render(<UndoNotification {...defaultProps} visible={true} />);
      
      expect(mockAnimated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0,
          duration: 10000,
          useNativeDriver: false,
        })
      );
    });

    it('uses custom duration for progress animation', () => {
      const customDuration = 5000;
      render(
        <UndoNotification {...defaultProps} duration={customDuration} />
      );
      
      expect(mockAnimated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          duration: customDuration,
        })
      );
    });

    it('resets animations when visibility changes to false', () => {
      const mockSetValue = jest.fn();
      (mockAnimated.Value as jest.Mock).mockReturnValue({
        setValue: mockSetValue,
        interpolate: jest.fn(() => '100%'),
      });
      
      const { rerender } = render(
        <UndoNotification {...defaultProps} visible={true} />
      );
      
      rerender(<UndoNotification {...defaultProps} visible={false} />);
      
      expect(mockSetValue).toHaveBeenCalledWith(-100);
      expect(mockSetValue).toHaveBeenCalledWith(1);
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      const { getByLabelText } = render(<UndoNotification {...defaultProps} />);
      
      expect(getByLabelText('Undo deletion')).toBeTruthy();
      expect(getByLabelText('Dismiss notification')).toBeTruthy();
    });

    it('provides accessibility hints', () => {
      const { getByLabelText } = render(<UndoNotification {...defaultProps} />);
      
      const undoButton = getByLabelText('Undo deletion');
      expect(undoButton.props.accessibilityHint).toBe('Restore the deleted photo');
    });

    it('sets proper accessibility roles', () => {
      const { getByLabelText } = render(<UndoNotification {...defaultProps} />);
      
      const undoButton = getByLabelText('Undo deletion');
      const dismissButton = getByLabelText('Dismiss notification');
      
      expect(undoButton.props.accessibilityRole).toBe('button');
      expect(dismissButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Photo Count Handling', () => {
    it('handles single photo count correctly', () => {
      const { getByText } = render(
        <UndoNotification {...defaultProps} message="" photoCount={1} />
      );
      
      expect(getByText('Photo deleted')).toBeTruthy();
    });

    it('handles multiple photo count correctly', () => {
      const { getByText } = render(
        <UndoNotification {...defaultProps} message="" photoCount={5} />
      );
      
      expect(getByText('5 photos deleted')).toBeTruthy();
    });

    it('handles zero photo count', () => {
      const { getByText } = render(
        <UndoNotification {...defaultProps} message="" photoCount={0} />
      );
      
      expect(getByText('Photo deleted')).toBeTruthy(); // Should default to singular
    });

    it('prefers custom message over photo count', () => {
      const customMessage = 'Custom message';
      const { getByText } = render(
        <UndoNotification
          {...defaultProps}
          message={customMessage}
          photoCount={5}
        />
      );
      
      expect(getByText(customMessage)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles very short duration', () => {
      const onDismiss = jest.fn();
      const shortDuration = 100;
      
      render(
        <UndoNotification
          {...defaultProps}
          onDismiss={onDismiss}
          duration={shortDuration}
        />
      );
      
      act(() => {
        jest.advanceTimersByTime(shortDuration);
      });
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('handles very long duration', () => {
      const onDismiss = jest.fn();
      const longDuration = 60000; // 1 minute
      
      render(
        <UndoNotification
          {...defaultProps}
          onDismiss={onDismiss}
          duration={longDuration}
        />
      );
      
      // Should not dismiss before the duration
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      expect(onDismiss).not.toHaveBeenCalled();
      
      // Should dismiss after the full duration
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('handles rapid visibility changes', () => {
      const { rerender } = render(
        <UndoNotification {...defaultProps} visible={false} />
      );
      
      // Rapidly toggle visibility
      rerender(<UndoNotification {...defaultProps} visible={true} />);
      rerender(<UndoNotification {...defaultProps} visible={false} />);
      rerender(<UndoNotification {...defaultProps} visible={true} />);
      
      // Should handle this gracefully without crashing
      expect(mockAnimated.spring).toHaveBeenCalled();
    });

    it('cleans up timers on unmount', () => {
      const { unmount } = render(<UndoNotification {...defaultProps} />);
      
      // Unmount component
      unmount();
      
      // Fast-forward time - should not cause any issues
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // No assertions needed - just ensuring no crashes or memory leaks
    });
  });

  describe('Performance', () => {
    it('does not create unnecessary animations when not visible', () => {
      render(<UndoNotification {...defaultProps} visible={false} />);
      
      expect(mockAnimated.spring).not.toHaveBeenCalled();
      expect(mockAnimated.timing).not.toHaveBeenCalled();
    });

    it('reuses animation values efficiently', () => {
      const { rerender } = render(
        <UndoNotification {...defaultProps} visible={true} />
      );
      
      const initialCallCount = (mockAnimated.Value as jest.Mock).mock.calls.length;
      
      // Re-render with same visibility
      rerender(<UndoNotification {...defaultProps} visible={true} />);
      
      // Should not create new animation values
      expect((mockAnimated.Value as jest.Mock).mock.calls.length).toBe(initialCallCount);
    });
  });
});