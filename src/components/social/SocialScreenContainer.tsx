/**
 * Social Screen Container
 * Wrapper component that provides userId and navigation handlers for SocialScreen
 */
import React from 'react';
import { SocialScreen } from './SocialScreen';

// Mock user ID - in a real app, this would come from auth context
const MOCK_USER_ID = 'user-123';

interface SocialScreenContainerProps {
  userId: string;
}

export const SocialScreenContainer: React.FC<SocialScreenContainerProps> = ({ userId }) => {
  const handleNavigateToProfile = () => {
    // Navigate to profile screen
    // navigation.navigate('Profile');
    console.log('Navigate to profile');
  };

  const handleNavigateToNotifications = () => {
    // Navigate to notifications screen
    // navigation.navigate('Notifications');
    console.log('Navigate to notifications');
  };

  const handleNavigateToChallenges = () => {
    // Navigate to challenges screen
    // navigation.navigate('Challenges');
    console.log('Navigate to challenges');
  };

  const handleNavigateToLeaderboard = () => {
    // Navigate to leaderboard screen
    // navigation.navigate('Leaderboard');
    console.log('Navigate to leaderboard');
  };

  return (
    <SocialScreen
      userId={userId || MOCK_USER_ID}
      onNavigateToProfile={handleNavigateToProfile}
      onNavigateToNotifications={handleNavigateToNotifications}
      onNavigateToChallenges={handleNavigateToChallenges}
      onNavigateToLeaderboard={handleNavigateToLeaderboard}
    />
  );
};