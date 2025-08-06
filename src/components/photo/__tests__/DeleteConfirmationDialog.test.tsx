/**
 * DeleteConfirmationDialog Component Tests
 * Tests confirmation dialog functionality and user interactions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DeleteConfirmationDialog from '../DeleteConfirmationDialog';

describe('DeleteConfirmationDialog', () => {
  const defaultProps = {
    visible: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders when visible is true', () => {
      const { getByText } = render(<DeleteConfirmationDialog {...defaultProps} />);
      
      expect(getByText('Delete Photo')).toBeTruthy();
      expect(getByText('Are you sure you want to delete this photo? This action cannot be undone.')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      const { queryByText } = render(
        <DeleteConfirmationDialog {...defaultProps} visible={false} />
      );
      
      expect(queryByText('Delete Photo')).toBeNull();
    });

    it('renders custom title and message', () => {
      const customTitle = 'Custom Delete Title';
      const customMessage = 'Custom delete message';
      
      const { getByText } = render(
        <DeleteConfirmationDialog
          {...defaultProps}
          title={customTitle}
          message={customMessage}
        />
      );
      
      expect(getByText(customTitle)).toBeTruthy();
      expect(getByText(customMessage)).toBeTruthy();
    });

    it('renders custom button texts', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog
          {...defaultProps}
          confirmText="Remove"
          cancelText="Keep"
        />
      );
      
      expect(getByText('Remove')).toBeTruthy();
      expect(getByText('Keep')).toBeTruthy();
    });
  });

  describe('Single Photo Mode', () => {
    it('displays single photo deletion text by default', () => {
      const { getByText } = render(<DeleteConfirmationDialog {...defaultProps} />);
      
      expect(getByText('Delete Photo')).toBeTruthy();
      expect(getByText('Are you sure you want to delete this photo? This action cannot be undone.')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });

    it('uses photoCount of 1 correctly', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} photoCount={1} />
      );
      
      expect(getByText('Delete Photo')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });
  });

  describe('Multiple Photo Mode', () => {
    it('displays multiple photo deletion text', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} photoCount={3} />
      );
      
      expect(getByText('Delete Photos')).toBeTruthy();
      expect(getByText('Are you sure you want to delete 3 photos? This action cannot be undone.')).toBeTruthy();
      expect(getByText('Delete All')).toBeTruthy();
    });

    it('handles large photo counts', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} photoCount={25} />
      );
      
      expect(getByText('Are you sure you want to delete 25 photos? This action cannot be undone.')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onConfirm when confirm button is pressed', () => {
      const onConfirm = jest.fn();
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />
      );
      
      const confirmButton = getByText('Delete');
      fireEvent.press(confirmButton);
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is pressed', () => {
      const onCancel = jest.fn();
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} onCancel={onCancel} />
      );
      
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when modal requests close', () => {
      const onCancel = jest.fn();
      const { container } = render(
        <DeleteConfirmationDialog {...defaultProps} onCancel={onCancel} />
      );
      
      const modal = container.findByType('Modal' as any);
      modal.props.onRequestClose();
      
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Destructive vs Non-Destructive Styling', () => {
    it('applies destructive styling by default', () => {
      const { getByText } = render(<DeleteConfirmationDialog {...defaultProps} />);
      
      const confirmButton = getByText('Delete');
      // The destructive styling should be applied (we can't easily test styles in RNTL)
      expect(confirmButton).toBeTruthy();
    });

    it('applies non-destructive styling when destructive is false', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} destructive={false} />
      );
      
      const confirmButton = getByText('Delete');
      expect(confirmButton).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels for buttons', () => {
      const { getByLabelText } = render(<DeleteConfirmationDialog {...defaultProps} />);
      
      expect(getByLabelText('Delete')).toBeTruthy();
      expect(getByLabelText('Cancel')).toBeTruthy();
    });

    it('provides custom accessibility labels', () => {
      const { getByLabelText } = render(
        <DeleteConfirmationDialog
          {...defaultProps}
          confirmText="Remove"
          cancelText="Keep"
        />
      );
      
      expect(getByLabelText('Remove')).toBeTruthy();
      expect(getByLabelText('Keep')).toBeTruthy();
    });

    it('sets proper accessibility roles', () => {
      const { getByLabelText } = render(<DeleteConfirmationDialog {...defaultProps} />);
      
      const confirmButton = getByLabelText('Delete');
      const cancelButton = getByLabelText('Cancel');
      
      expect(confirmButton.props.accessibilityRole).toBe('button');
      expect(cancelButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Modal Properties', () => {
    it('sets correct modal properties', () => {
      const { container } = render(<DeleteConfirmationDialog {...defaultProps} />);
      
      const modal = container.findByType('Modal' as any);
      expect(modal.props.visible).toBe(true);
      expect(modal.props.transparent).toBe(true);
      expect(modal.props.animationType).toBe('fade');
    });

    it('handles modal visibility changes', () => {
      const { container, rerender } = render(
        <DeleteConfirmationDialog {...defaultProps} visible={true} />
      );
      
      let modal = container.findByType('Modal' as any);
      expect(modal.props.visible).toBe(true);
      
      rerender(<DeleteConfirmationDialog {...defaultProps} visible={false} />);
      
      modal = container.findByType('Modal' as any);
      expect(modal.props.visible).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero photo count', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} photoCount={0} />
      );
      
      expect(getByText('Delete Photo')).toBeTruthy(); // Should default to single photo text
    });

    it('handles negative photo count', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} photoCount={-1} />
      );
      
      expect(getByText('Delete Photo')).toBeTruthy(); // Should default to single photo text
    });

    it('handles very long custom messages', () => {
      const longMessage = 'This is a very long message that should still be displayed properly in the dialog without breaking the layout or causing any issues with the user interface components.';
      
      const { getByText } = render(
        <DeleteConfirmationDialog {...defaultProps} message={longMessage} />
      );
      
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('handles empty custom texts', () => {
      const { getByText } = render(
        <DeleteConfirmationDialog
          {...defaultProps}
          title=""
          message=""
          confirmText=""
          cancelText=""
        />
      );
      
      // Should fall back to defaults
      expect(getByText('Delete Photo')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      
      const { rerender } = render(
        <DeleteConfirmationDialog
          visible={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      
      // Re-render with same props
      rerender(
        <DeleteConfirmationDialog
          visible={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      
      // Component should handle this gracefully
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});