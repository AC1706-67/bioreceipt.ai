/**
 * Auth Navigator - MVP Authentication Flow
 * Manages navigation between auth screens with accessibility
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { initializeAuth } from '../../store/authSlice';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import LoadingScreen from './LoadingScreen';
import { BioPulseTheme } from '../../constants/bioPulseTheme';

type AuthScreen = 'login' | 'signup' | 'forgot-password';

const AuthNavigator: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, isInitialized } = useSelector((state: any) => state.auth);
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  useEffect(() => {
    // Initialize authentication state on app start
    if (!isInitialized) {
      dispatch(initializeAuth());
    }
  }, [dispatch, isInitialized]);

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // If authenticated, this navigator shouldn't be shown
  // The parent component should handle routing to the main app
  if (isAuthenticated) {
    return null;
  }

  const handleNavigateToLogin = () => {
    setCurrentScreen('login');
  };

  const handleNavigateToSignup = () => {
    setCurrentScreen('signup');
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentScreen('forgot-password');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
          />
        );
      case 'signup':
        return (
          <SignupScreen
            onNavigateToLogin={handleNavigateToLogin}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordScreen
            onNavigateToLogin={handleNavigateToLogin}
          />
        );
      default:
        return (
          <LoginScreen
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
});

export default AuthNavigator;