/**
 * Toast Component Tests
 * Unit tests for toast notification system
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import Toast, { ToastType } from '../Toast';

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
      })),
    },
  };
});

describe('Toast', () => {
  const defaultProps = {
    visible: true,
    message: 'Test message',
    type: 'info' as ToastType,
    onHide: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render when visible', () => {
      const { getByText } = render(<Toast {...defaultProps} />);

      expect(getByText('Test message')).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(<Toast {...defaultProps} visible={false} />);

      expect(queryByText('Test message')).toBeNull();
    });

    it('should display correct message', () => {
      const { getByText } = render(
        <Toast {...defaultProps} message="Custom message" />
      );

      expect(getByText('Custom message')).toBeTruthy();
    });

    it('should show action button when provided', () => {
      const { getByText } = render(
        <Toast
          {...defaultProps}
          actionText="Retry"
          onActionPress={jest.fn()}
        />
      );

      expect(getByText('RETRY')).toBeTruthy();
    });

    it('should not show action button when not provided', () => {
      const { queryByText } = render(<Toast {...defaultProps} />);

      expect(queryByText('RETRY')).toBeNull();
    });
  });

  describe('Toast Types', () => {
    it('should show success icon for success type', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="success" />
      );

      expect(getByText('✓')).toBeTruthy();
    });

    it('should show error icon for error type', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="error" />
      );

      expect(getByText('✕')).toBeTruthy();
    });

    it('should show warning icon for warning type', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="warning" />
      );

      expect(getByText('⚠')).toBeTruthy();
    });

    it('should show info icon for info type', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="info" />
      );

      expect(getByText('ℹ')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onActionPress when action button is pressed', () => {
      const onActionPress = jest.fn();
      const { getByText } = render(
        <Toast
          {...defaultProps}
          actionText="Retry"
          onActionPress={onActionPress}
        />
      );

      fireEvent.press(getByText('RETRY'));

      expect(onActionPress).toHaveBeenCalledTimes(1);
    });

    it('should call onHide when close button is pressed', () => {
      const onHide = jest.fn();
      const { getByText } = render(
        <Toast {...defaultProps} onHide={onHide} />
      );

      fireEvent.press(getByText('×'));

      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('should auto-hide after duration', () => {
      const onHide = jest.fn();
      render(
        <Toast {...defaultProps} onHide={onHide} duration={2000} />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('should use default duration when not specified', () => {
      const onHide = jest.fn();
      render(<Toast {...defaultProps} onHide={onHide} />);

      act(() => {
        jest.advanceTimersByTime(4000); // Default duration
      });

      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('should clear timer when component unmounts', () => {
      const onHide = jest.fn();
      const { unmount } = render(
        <Toast {...defaultProps} onHide={onHide} duration={2000} />
      );

      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onHide).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for action button', () => {
      const { getByLabelText } = render(
        <Toast
          {...defaultProps}
          actionText="Retry"
          onActionPress={jest.fn()}
        />
      );

      expect(getByLabelText('Retry')).toBeTruthy();
    });

    it('should have proper accessibility labels for close button', () => {
      const { getByLabelText } = render(<Toast {...defaultProps} />);

      expect(getByLabelText('Close notification')).toBeTruthy();
    });

    it('should have proper accessibility roles', () => {
      const { getByRole } = render(
        <Toast
          {...defaultProps}
          actionText="Retry"
          onActionPress={jest.fn()}
        />
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should trigger show animation when visible becomes true', () => {
      const { rerender } = render(
        <Toast {...defaultProps} visible={false} />
      );

      rerender(<Toast {...defaultProps} visible={true} />);

      // Animation should be triggered (mocked)
      expect(require('react-native').Animated.parallel).toHaveBeenCalled();
    });

    it('should trigger hide animation when manually hidden', () => {
      const onHide = jest.fn();
      const { getByText } = render(
        <Toast {...defaultProps} onHide={onHide} />
      );

      fireEvent.press(getByText('×'));

      expect(require('react-native').Animated.parallel).toHaveBeenCalled();
    });
  });

  describe('Message Truncation', () => {
    it('should limit message to 3 lines', () => {
      const longMessage = 'This is a very long message that should be truncated after three lines to prevent the toast from becoming too large and overwhelming the user interface';
      
      const { getByText } = render(
        <Toast {...defaultProps} message={longMessage} />
      );

      const messageElement = getByText(longMessage);
      expect(messageElement.props.numberOfLines).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const { getByText } = render(
        <Toast {...defaultProps} message="" />
      );

      expect(getByText('')).toBeTruthy();
    });

    it('should handle very short duration', () => {
      const onHide = jest.fn();
      render(
        <Toast {...defaultProps} onHide={onHide} duration={1} />
      );

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('should handle missing onActionPress', () => {
      const { getByText } = render(
        <Toast {...defaultProps} actionText="Retry" />
      );

      // Should render without crashing
      expect(getByText('RETRY')).toBeTruthy();
    });
  });
});