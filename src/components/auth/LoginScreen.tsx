/**
 * Login Screen - MVP Authentication UI
 * Simple, accessible login interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signIn, clearError } from '../../store/authSlice';
import { BioPulseTheme } from '../../constants/bioPulseTheme';

interface Props {
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
}

const LoginScreen: React.FC<Props> = ({ onNavigateToSignup, onNavigateToForgotPassword }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: any) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    // Clear previous errors
    dispatch(clearError());
    
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await dispatch(signIn({
        method: 'email',
        credentials: { email, password }
      })).unwrap();
    } catch (error) {
      // Error is handled by Redux slice
      console.error('Login error:', error);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      validateEmail(text);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      validatePassword(text);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to BioPulse.AI</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Enter your email"
              placeholderTextColor={BioPulseTheme.colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessible={true}
              accessibilityLabel="Email address input"
              accessibilityHint="Enter your email address to sign in"
              testID="login-email-input"
            />
            {emailError ? (
              <Text 
                style={styles.errorText}
                accessible={true}
                accessibilityRole="alert"
              >
                {emailError}
              </Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="Enter your password"
              placeholderTextColor={BioPulseTheme.colors.textTertiary}
              secureTextEntry
              accessible={true}
              accessibilityLabel="Password input"
              accessibilityHint="Enter your password to sign in"
              testID="login-password-input"
            />
            {passwordError ? (
              <Text 
                style={styles.errorText}
                accessible={true}
                accessibilityRole="alert"
              >
                {passwordError}
              </Text>
            ) : null}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={onNavigateToForgotPassword}
            accessible={true}
            accessibilityLabel="Forgot password"
            accessibilityHint="Navigate to password reset screen"
            accessibilityRole="button"
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text 
                style={styles.errorMessage}
                accessible={true}
                accessibilityRole="alert"
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel={isLoading ? "Signing in..." : "Sign in"}
            accessibilityHint="Sign in to your BioPulse account"
            accessibilityRole="button"
            testID="login-submit-button"
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={onNavigateToSignup}
            accessible={true}
            accessibilityLabel="Sign up"
            accessibilityHint="Navigate to account creation screen"
            accessibilityRole="button"
          >
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: BioPulseTheme.spacing.xl,
    paddingVertical: BioPulseTheme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.xl * 2,
  },
  title: {
    fontSize: BioPulseTheme.typography.fontSize['3xl'],
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.primary,
    marginBottom: BioPulseTheme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: BioPulseTheme.spacing.xl,
  },
  inputContainer: {
    marginBottom: BioPulseTheme.spacing.lg,
  },
  label: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    color: BioPulseTheme.colors.text,
    marginBottom: BioPulseTheme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    borderRadius: BioPulseTheme.borderRadius.md,
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.md,
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.text,
    backgroundColor: BioPulseTheme.colors.surface,
    minHeight: 48, // Accessibility: minimum touch target
  },
  inputError: {
    borderColor: BioPulseTheme.colors.error,
  },
  errorText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.error,
    marginTop: BioPulseTheme.spacing.xs,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: BioPulseTheme.spacing.lg,
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  forgotPasswordText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.primary,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
  },
  errorContainer: {
    backgroundColor: BioPulseTheme.colors.errorLight,
    borderRadius: BioPulseTheme.borderRadius.md,
    padding: BioPulseTheme.spacing.md,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  errorMessage: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.error,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    borderRadius: BioPulseTheme.borderRadius.md,
    paddingVertical: BioPulseTheme.spacing.md,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: BioPulseTheme.colors.disabled,
  },
  loginButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
    color: BioPulseTheme.colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: BioPulseTheme.spacing.xl,
  },
  footerText: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.textSecondary,
  },
  signupLink: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.primary,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
  },
});

export default LoginScreen;