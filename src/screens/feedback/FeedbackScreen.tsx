/**
 * Main Feedback Screen
 * Entry point for feedback system with navigation between submission and history
 */

import React, { useState } from 'react';
import { FeedbackSubmissionScreen } from './FeedbackSubmissionScreen';
import { FeedbackHistoryScreen } from './FeedbackHistoryScreen';

type FeedbackScreenMode = 'main' | 'submit' | 'history';

interface FeedbackScreenProps {
  onBack: () => void;
}

export const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ onBack }) => {
  const [mode, setMode] = useState<FeedbackScreenMode>('history');

  const handleSubmissionSuccess = (referenceNumber: string) => {
    // After successful submission, go back to history to show the new feedback
    setMode('history');
  };

  const handleNewFeedback = () => {
    setMode('submit');
  };

  const handleBackToHistory = () => {
    setMode('history');
  };

  switch (mode) {
    case 'submit':
      return (
        <FeedbackSubmissionScreen
          onSubmissionSuccess={handleSubmissionSuccess}
          onBack={handleBackToHistory}
        />
      );
    case 'history':
    default:
      return (
        <FeedbackHistoryScreen
          onBack={onBack}
          onNewFeedback={handleNewFeedback}
        />
      );
  }
};