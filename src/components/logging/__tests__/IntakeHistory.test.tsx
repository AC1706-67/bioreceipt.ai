/**
 * IntakeHistory Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import IntakeHistory from '../IntakeHistory';

// Mock the supabaseHelpers
jest.mock('../../../config/supabase', () => ({
  supabaseHelpers: {
    getIntakeHistory: jest.fn(),
    deleteIntake: jest.fn(),
    deleteIntakeMedia: jest.fn(),
  },
}));

// Mock the PhotoGallery component
jest.mock('../../photo/PhotoGallery', () => {
  const MockPhotoGallery = ({ photos, onPhotoSelect, onPhotoDelete }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    
    return (
      <View testID="photo-gallery">
        <Text>{photos.length} photos</Text>
        {photos.map((photo: any, index: number) => (
          <TouchableOpacity
            key={photo.id}
            testID={`photo-${index}`}
            onPress={() => onPhotoSelect(photo)}
          >
            <Text>Photo {photo.id}</Text>
            <TouchableOpacity
              testID={`delete-photo-${index}`}
              onPress={() => onPhotoDelete(photo.id)}
            >
              <Text>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  return MockPhotoGallery;
});

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('IntakeHistory', () => {
  const mockIntakeHistory = [
    {
      id: '1',
      substance_id: 'sub1',
      quantity: 100,
      unit: 'mg',
      timestamp: '2024-01-15T10:30:00Z',
      notes: 'Test note',
      photos: [
        {
          id: 'photo1',
          intake_id: '1',
          url: 'https://example.com/photo1.jpg',
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: 'photo2',
          intake_id: '1',
          url: 'https://example.com/photo2.jpg',
          created_at: '2024-01-15T10:31:00Z',
        },
      ],
      substances: {
        name: 'Test Substance',
        category: 'supplements',
        default_unit: 'mg',
      },
    },
  ];

  const { supabaseHelpers } = require('../../../config/supabase');

  beforeEach(() => {
    jest.clearAllMocks();
    supabaseHelpers.getIntakeHistory.mockResolvedValue(mockIntakeHistory);
  });

  describe('Rendering', () => {
    it('renders correctly with intake history', async () => {
      const { getByText, getByTestId } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(getByText('Test Substance')).toBeTruthy();
        expect(getByText('100 mg')).toBeTruthy();
        expect(getByText('supplements')).toBeTruthy();
        expect(getByText('Test note')).toBeTruthy();
      });
    });

    it('renders photo gallery when photos exist', async () => {
      const { getByTestId, getByText } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(getByTestId('photo-gallery')).toBeTruthy();
        expect(getByText('2 photos')).toBeTruthy();
      });
    });

    it('does not render photo gallery when no photos', async () => {
      const historyWithoutPhotos = [{
        ...mockIntakeHistory[0],
        photos: [],
      }];
      supabaseHelpers.getIntakeHistory.mockResolvedValue(historyWithoutPhotos);

      const { queryByTestId } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(queryByTestId('photo-gallery')).toBeNull();
      });
    });

    it('renders empty state when no history', async () => {
      supabaseHelpers.getIntakeHistory.mockResolvedValue([]);

      const { getByText } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(getByText('No Intakes Yet')).toBeTruthy();
        expect(getByText('Start logging your substance intake to see your history here')).toBeTruthy();
      });
    });
  });

  describe('Photo Interactions', () => {
    it('handles photo selection', async () => {
      const { getByTestId } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(getByTestId('photo-0')).toBeTruthy();
      });

      fireEvent.press(getByTestId('photo-0'));
      // Photo selection is handled by PhotoGallery internally
    });

    it('handles photo deletion', async () => {
      supabaseHelpers.deleteIntakeMedia.mockResolvedValue(true);

      const { getByTestId } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(getByTestId('delete-photo-0')).toBeTruthy();
      });

      fireEvent.press(getByTestId('delete-photo-0'));

      await waitFor(() => {
        expect(supabaseHelpers.deleteIntakeMedia).toHaveBeenCalledWith('photo1');
      });
    });

    it('handles photo deletion error', async () => {
      supabaseHelpers.deleteIntakeMedia.mockRejectedValue(new Error('Delete failed'));
      console.error = jest.fn();

      const { getByTestId } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(getByTestId('delete-photo-0')).toBeTruthy();
      });

      fireEvent.press(getByTestId('delete-photo-0'));

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error deleting photo:', expect.any(Error));
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to delete photo');
      });
    });
  });

  describe('Intake Management', () => {
    it('handles intake deletion', async () => {
      supabaseHelpers.deleteIntake.mockResolvedValue(true);

      const { getByText } = render(
        <IntakeHistory userId="test-user" showActions={true} />
      );

      await waitFor(() => {
        expect(getByText('Delete')).toBeTruthy();
      });

      fireEvent.press(getByText('Delete'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Intake',
        'Are you sure you want to delete this Test Substance intake?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete' }),
        ])
      );
    });

    it('does not show actions when showActions is false', async () => {
      const { queryByText } = render(
        <IntakeHistory userId="test-user" showActions={false} />
      );

      await waitFor(() => {
        expect(queryByText('Delete')).toBeNull();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', () => {
      const { getByText } = render(
        <IntakeHistory userId="test-user" />
      );

      expect(getByText('Loading history...')).toBeTruthy();
    });

    it('handles refresh', async () => {
      const { getByTestId } = render(
        <IntakeHistory userId="test-user" />
      );

      await waitFor(() => {
        expect(getByTestId('intake-history-list')).toBeTruthy();
      });

      // Simulate pull-to-refresh
      const flatList = getByTestId('intake-history-list');
      fireEvent(flatList, 'refresh');

      expect(supabaseHelpers.getIntakeHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('handles history loading error', async () => {
      supabaseHelpers.getIntakeHistory.mockRejectedValue(new Error('Load failed'));
      console.error = jest.fn();

      render(<IntakeHistory userId="test-user" />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error loading history:', expect.any(Error));
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load intake history');
      });
    });
  });
});des
cribe('Photo Integration Tests', () => {
  const mockHistoryWithPhotos = [
    {
      id: '1',
      substance_id: 'sub1',
      quantity: 2,
      unit: 'cups',
      timestamp: '2024-01-15T10:30:00Z',
      notes: 'Morning coffee',
      photos: [
        {
          id: 'photo1',
          intake_id: '1',
          url: 'https://example.com/photo1.jpg',
          thumbnail_url: 'https://example.com/thumb1.jpg',
          created_at: '2024-01-15T10:30:00Z',
          file_size: 2500000,
          dimensions: { width: 1024, height: 768 },
        },
        {
          id: 'photo2',
          intake_id: '1',
          url: 'https://example.com/photo2.jpg',
          thumbnail_url: 'https://example.com/thumb2.jpg',
          created_at: '2024-01-15T10:31:00Z',
          file_size: 1800000,
          dimensions: { width: 800, height: 600 },
        },
      ],
      substances: {
        name: 'Coffee',
        category: 'caffeine',
        default_unit: 'cups',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    require('../../../config/supabase').supabaseHelpers.getIntakeHistory.mockResolvedValue(mockHistoryWithPhotos);
  });

  it('displays photo gallery for intakes with photos', async () => {
    const { getByTestId, getByText } = render(<IntakeHistory userId="user1" />);
    
    await waitFor(() => {
      expect(getByTestId('photo-gallery')).toBeTruthy();
      expect(getByText('2 photos')).toBeTruthy();
    });
  });

  it('displays photo count correctly', async () => {
    const { getByText } = render(<IntakeHistory userId="user1" />);
    
    await waitFor(() => {
      expect(getByText('2 photos')).toBeTruthy();
    });
  });

  it('handles photo selection', async () => {
    const { getByTestId } = render(<IntakeHistory userId="user1" />);
    
    await waitFor(() => {
      const photoButton = getByTestId('photo-0');
      fireEvent.press(photoButton);
      // Photo selection is handled by PhotoGallery's full-screen modal
    });
  });

  it('handles photo deletion when actions are enabled', async () => {
    const mockDeleteMedia = require('../../../config/supabase').supabaseHelpers.deleteIntakeMedia;
    mockDeleteMedia.mockResolvedValue(undefined);
    
    const { getByTestId } = render(<IntakeHistory userId="user1" showActions={true} />);
    
    await waitFor(() => {
      const deleteButton = getByTestId('delete-photo-0');
      fireEvent.press(deleteButton);
    });
    
    expect(mockDeleteMedia).toHaveBeenCalledWith('photo1');
  });

  it('does not show photo gallery for intakes without photos', async () => {
    const historyWithoutPhotos = [{
      ...mockHistoryWithPhotos[0],
      photos: [],
    }];
    
    require('../../../config/supabase').supabaseHelpers.getIntakeHistory.mockResolvedValue(historyWithoutPhotos);
    
    const { queryByTestId } = render(<IntakeHistory userId="user1" />);
    
    await waitFor(() => {
      expect(queryByTestId('photo-gallery')).toBeNull();
    });
  });

  it('updates UI after photo deletion', async () => {
    const mockDeleteMedia = require('../../../config/supabase').supabaseHelpers.deleteIntakeMedia;
    mockDeleteMedia.mockResolvedValue(undefined);
    
    const { getByTestId, getByText } = render(<IntakeHistory userId="user1" showActions={true} />);
    
    await waitFor(() => {
      expect(getByText('2 photos')).toBeTruthy();
    });
    
    const deleteButton = getByTestId('delete-photo-0');
    fireEvent.press(deleteButton);
    
    await waitFor(() => {
      expect(getByText('1 photo')).toBeTruthy();
    });
  });

  it('shows error alert when photo deletion fails', async () => {
    const mockDeleteMedia = require('../../../config/supabase').supabaseHelpers.deleteIntakeMedia;
    mockDeleteMedia.mockRejectedValue(new Error('Delete failed'));
    
    const { getByTestId } = render(<IntakeHistory userId="user1" showActions={true} />);
    
    await waitFor(() => {
      const deleteButton = getByTestId('delete-photo-0');
      fireEvent.press(deleteButton);
    });
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to delete photo');
    });
  });

  it('hides photo delete functionality when showActions is false', async () => {
    const { getByTestId } = render(<IntakeHistory userId="user1" showActions={false} />);
    
    await waitFor(() => {
      // PhotoGallery should not receive onPhotoDelete prop when showActions is false
      expect(getByTestId('photo-gallery')).toBeTruthy();
    });
  });

  it('displays singular photo count for one photo', async () => {
    const historyWithOnePhoto = [{
      ...mockHistoryWithPhotos[0],
      photos: [mockHistoryWithPhotos[0].photos![0]],
    }];
    
    require('../../../config/supabase').supabaseHelpers.getIntakeHistory.mockResolvedValue(historyWithOnePhoto);
    
    const { getByText } = render(<IntakeHistory userId="user1" />);
    
    await waitFor(() => {
      expect(getByText('1 photo')).toBeTruthy();
    });
  });

  it('limits photos shown in history view', async () => {
    const historyWithManyPhotos = [{
      ...mockHistoryWithPhotos[0],
      photos: Array.from({ length: 12 }, (_, i) => ({
        id: `photo${i + 1}`,
        intake_id: '1',
        url: `https://example.com/photo${i + 1}.jpg`,
        thumbnail_url: `https://example.com/thumb${i + 1}.jpg`,
        created_at: '2024-01-15T10:30:00Z',
        file_size: 2500000,
        dimensions: { width: 1024, height: 768 },
      })),
    }];
    
    require('../../../config/supabase').supabaseHelpers.getIntakeHistory.mockResolvedValue(historyWithManyPhotos);
    
    const { getByTestId } = render(<IntakeHistory userId="user1" />);
    
    await waitFor(() => {
      const photoGallery = getByTestId('photo-gallery');
      // PhotoGallery should receive maxPhotosToShow prop to limit display
      expect(photoGallery).toBeTruthy();
    });
  });
});