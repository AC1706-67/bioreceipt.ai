/**
 * Authentication Navigator Component
 * Handles navigation between auth screens and main app
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  initializeAuth, 
  selectIsAuthenticated, 
  selectIsInitialized, 
  selectIsLoading 
} from '../../store/authSlice';
import { SignInScreen } from '../../screens/auth/SignInScreen';
import { SignUpScreen } from '../../screens/auth/SignUpScreen';
import { MainTabNavigator } from './MainTabNavigator';

type AuthScreen = 'signin' | 'signup' | 'profile';

export const AuthNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitialized = useAppSelector(selectIsInitialized);
  const isLoading = useAppSelector(selectIsLoading);

  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('signin');

  useEffect(() => {
    // Initialize authentication state on app start
    dispatch(initializeAuth());
  }, [dispatch]);

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  // Show main app if authenticated
  if (isAuthenticated) {
    return <MainTabNavigator />;
  }

  // Show authentication screens
  switch (currentScreen) {
    case 'signup':
      return (
        <SignUpScreen
          onNavigateToSignIn={() => setCurrentScreen('signin')}
          onSignUpSuccess={() => {
            // User will be automatically navigated to main app
            // due to isAuthenticated becoming true
          }}
        />
      );
    case 'signin':
    default:
      return (
        <SignInScreen
          onNavigateToSignUp={() => setCurrentScreen('signup')}
          onSignInSuccess={() => {
            // User will be automatically navigated to main app
            // due to isAuthenticated becoming true
          }}
        />
      );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});