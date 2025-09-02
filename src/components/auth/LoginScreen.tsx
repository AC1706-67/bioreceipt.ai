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
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { authService } from '../../services/auth/authService';

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
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);

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

  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setIsCheckingEmail(true);
    try {
      const { exists } = await authService.checkEmailExists(email);
      setEmailExists(exists);
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailExists(null);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailExists(null); // Reset email check status
    
    if (emailError) {
      validateEmail(text);
    }
    
    // Debounced email check
    const timeoutId = setTimeout(() => {
      if (text && text.includes('@') && !emailError) {
        checkEmailExists(text);
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
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
          <Text style={styles.subtitle}>Sign in to BioReceipt.AI</Text>
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
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
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
            
            {/* Email Status Indicator */}
            {!emailError && email && email.includes('@') && (
              <View style={styles.emailStatusContainer}>
                {isCheckingEmail ? (
                  <Text style={styles.emailCheckingText}>Checking email...</Text>
                ) : emailExists === true ? (
                  <Text style={styles.emailFoundText}>✓ Email found</Text>
                ) : emailExists === false ? (
                  <View style={styles.emailNotFoundContainer}>
                    <Text style={styles.emailNotFoundText}>Email not found</Text>
                    <TouchableOpacity
                      onPress={onNavigateToSignup}
                      style={styles.createAccountLink}
                      accessible={true}
                      accessibilityLabel="Create account"
                      accessibilityHint="Navigate to signup screen"
                    >
                      <Text style={styles.createAccountText}>Create account?</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="Enter your password"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
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

          {/* Forgot Links */}
          <View style={styles.forgotLinksContainer}>
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={onNavigateToForgotPassword}
              accessible={true}
              accessibilityLabel="Forgot password"
              accessibilityHint="Navigate to password reset screen"
              accessibilityRole="button"
            >
              <Text style={styles.forgotLinkText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => {
                // Show help modal or navigate to email recovery
                Alert.alert(
                  'Forgot Your Email?',
                  'If you forgot your email address, please contact support or try common email addresses you use.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Contact Support', onPress: () => {
                      // In a real app, this would open email client or support chat
                      Alert.alert('Support', 'Please email support@BioReceipt.ai for assistance.');
                    }}
                  ]
                );
              }}
              accessible={true}
              accessibilityLabel="Forgot email"
              accessibilityHint="Get help recovering your email address"
              accessibilityRole="button"
            >
              <Text style={styles.forgotLinkText}>Forgot Email?</Text>
            </TouchableOpacity>
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

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel={isLoading ? "Signing in..." : "Sign in"}
            accessibilityHint="Sign in to your BioReceipt account"
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
  emailStatusContainer: {
    marginTop: BioReceiptTheme.spacing.xs,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  emailCheckingText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
  emailFoundText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.success,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  emailNotFoundContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  emailNotFoundText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.warning,
    marginRight: BioReceiptTheme.spacing.sm,
  },
  createAccountLink: {
    minHeight: 32,
    justifyContent: 'center',
  },
  createAccountText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
  forgotLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.lg,
    flexWrap: 'wrap',
  },
  forgotLink: {
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
    paddingVertical: BioReceiptTheme.spacing.xs,
  },
  forgotLinkText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
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
  loginButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: BioReceiptTheme.colors.disabled,
  },
  loginButtonText: {
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
  signupLink: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
  },
});

export default LoginScreen;
