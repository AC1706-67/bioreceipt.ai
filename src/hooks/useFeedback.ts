/**
 * Feedback Hook
 * Custom hook for managing feedback operations
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppSelector } from './redux';
import { selectUser } from '../store/authSlice';
import { FeedbackService } from '../services/feedback/feedbackService';
import { 
  FeedbackFormData, 
  FeedbackSubmission, 
  FeedbackStats,
  FeedbackFilter 
} from '../types/feedback';

export const useFeedback = () => {
  const user = useAppSelector(selectUser);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const feedbackService = FeedbackService.getInstance();

  const submitFeedback = useCallback(async (
    formData: FeedbackFormData
  ): Promise<FeedbackSubmission | null> => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to submit feedback');
      return null;
    }

    try {
      setSubmitting(true);
      const submission = await feedbackService.submitFeedback(user.id, formData);
      
      Alert.alert(
        'Feedback Submitted',
        `Thank you for your feedback! Reference: ${submission.referenceNumber}`,
        [{ text: 'OK' }]
      );
      
      return submission;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Submission Failed',
        'We couldn\'t submit your feedback right now. Please try again later.',
        [{ text: 'OK' }]
      );
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [user, feedbackService]);

  const getUserFeedback = useCallback(async (
    filter?: FeedbackFilter
  ): Promise<FeedbackSubmission[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      return await feedbackService.getUserFeedback(user.id, filter);
    } catch (error) {
      console.error('Error loading feedback:', error);
      Alert.alert('Error', 'Failed to load feedback history');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, feedbackService]);

  const getFeedbackByReference = useCallback(async (
    referenceNumber: string
  ): Promise<FeedbackSubmission | null> => {
    try {
      setLoading(true);
      return await feedbackService.getFeedbackByReference(referenceNumber);
    } catch (error) {
      console.error('Error finding feedback:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [feedbackService]);

  const deleteFeedback = useCallback(async (
    feedbackId: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);
      await feedbackService.deleteFeedback(feedbackId, user.id);
      
      Alert.alert(
        'Feedback Deleted',
        'Your feedback has been deleted successfully.',
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      Alert.alert('Error', 'Failed to delete feedback');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, feedbackService]);

  const getFeedbackStats = useCallback(async (): Promise<FeedbackStats | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      return await feedbackService.getFeedbackStats(user.id);
    } catch (error) {
      console.error('Error loading feedback stats:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, feedbackService]);

  const getFeedbackCategories = useCallback(() => {
    return feedbackService.getFeedbackCategories();
  }, [feedbackService]);

  const getSuggestedFAQ = useCallback((category: string) => {
    return feedbackService.getSuggestedFAQ(category as any);
  }, [feedbackService]);

  return {
    // State
    loading,
    submitting,
    
    // Actions
    submitFeedback,
    getUserFeedback,
    getFeedbackByReference,
    deleteFeedback,
    getFeedbackStats,
    
    // Helpers
    getFeedbackCategories,
    getSuggestedFAQ,
  };
};