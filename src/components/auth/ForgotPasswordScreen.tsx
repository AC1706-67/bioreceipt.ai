/**
 * Forgot Password Screen - MVP Password Reset UI
 * Accessible password reset interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { supabase } from '../../config/supabase';

interface Props {
  onNavigateToLogin: () => void;
}

const ForgotPasswordScreen: React.FC<Props> = ({ onNavigateToLogin }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');

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

  const handleResetPassword = async () => {
    setError('');
    
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://BioReceipt.ai/reset-password', // Update with your actual URL
      });

      if (error) {
        setError(error.message);
      } else {
        setIsEmailSent(true);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      validateEmail(text);
    }
  };

  if (isEmailSent) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Success Header */}
          <View style={styles.header}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent password reset instructions to {email}
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>What's next?</Text>
            <Text style={styles.instructionsText}>
              1. Check your email inbox (and spam folder)
            </Text>
            <Text style={styles.instructionsText}>
              2. Click the reset link in the email
            </Text>
            <Text style={styles.instructionsText}>
              3. Create a new password
            </Text>
            <Text style={styles.instructionsText}>
              4. Sign in with your new password
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                setIsEmailSent(false);
                setEmail('');
              }}
              accessible={true}
              accessibilityLabel="Send another email"
              accessibilityHint="Send password reset email to a different address"
              accessibilityRole="button"
            >
              <Text style={styles.resendButtonText}>Send to Different Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={onNavigateToLogin}
              accessible={true}
              accessibilityLabel="Back to login"
              accessibilityHint="Return to login screen"
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
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
              placeholder="Enter your email address"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessible={true}
              accessibilityLabel="Email address input"
              accessibilityHint="Enter the email address associated with your account"
              testID="forgot-password-email-input"
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

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel={isLoading ? "Sending reset email..." : "Send reset email"}
            accessibilityHint="Send password reset instructions to your email"
            accessibilityRole="button"
            testID="forgot-password-submit-button"
          >
            <Text style={styles.resetButtonText}>
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity
            onPress={onNavigateToLogin}
            accessible={true}
            accessibilityLabel="Back to login"
            accessibilityHint="Return to login screen"
            accessibilityRole="button"
          >
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Having trouble? The reset email may take a few minutes to arrive. 
            Check your spam folder if you don't see it in your inbox.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.xl,
    paddingVertical: BioReceiptTheme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.xl * 2,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BioReceiptTheme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  successIconText: {
    fontSize: 24,
    color: BioReceiptTheme.colors.white,
    fontWeight: 'bold',
  },
  title: {
    fontSize: BioReceiptTheme.typography.fontSize['3xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.primary,
    marginBottom: BioReceiptTheme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: BioReceiptTheme.spacing.xl,
  },
  inputContainer: {
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  label: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.text,
    backgroundColor: BioReceiptTheme.colors.surface,
    minHeight: 48, // Accessibility: minimum touch target
  },
  inputError: {
    borderColor: BioReceiptTheme.colors.error,
  },
  errorText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.error,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  errorContainer: {
    backgroundColor: BioReceiptTheme.colors.errorLight,
    borderRadius: BioReceiptTheme.borderRadius.md,
    padding: BioReceiptTheme.spacing.md,
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  errorMessage: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.error,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  resetButtonDisabled: {
    backgroundColor: BioReceiptTheme.colors.disabled,
  },
  resetButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: BioReceiptTheme.spacing.xl,
  },
  footerText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
  },
  loginLink: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
  },
  helpContainer: {
    marginTop: BioReceiptTheme.spacing.xl,
    paddingHorizontal: BioReceiptTheme.spacing.md,
  },
  helpText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: BioReceiptTheme.colors.surfaceLight,
    borderRadius: BioReceiptTheme.borderRadius.lg,
    padding: BioReceiptTheme.spacing.lg,
    marginBottom: BioReceiptTheme.spacing.xl,
  },
  instructionsTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  instructionsText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.sm,
    lineHeight: 22,
  },
  actionsContainer: {
    gap: BioReceiptTheme.spacing.md,
  },
  resendButton: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  resendButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
  },
  backButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.white,
  },
});

export default ForgotPasswordScreen;
