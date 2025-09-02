/**
 * Signup Screen - MVP User Registration UI
 * Accessible signup interface with validation
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
import { useDispatch, useSelector } from 'react-redux';
import { signUp, clearError } from '../../store/authSlice';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { authService } from '../../services/auth/authService';

interface Props {
  onNavigateToLogin: () => void;
}

const SignupScreen: React.FC<Props> = ({ onNavigateToLogin }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: any) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Name is required' }));
      return false;
    }
    if (name.trim().length < 2) {
      setErrors(prev => ({ ...prev, name: 'Name must be at least 2 characters' }));
      return false;
    }
    setErrors(prev => ({ ...prev, name: '' }));
    return true;
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      return false;
    }
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return false;
    }
    setErrors(prev => ({ ...prev, email: '' }));
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      return false;
    }
    if (password.length < 8) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setErrors(prev => ({ 
        ...prev, 
        password: 'Password must contain uppercase, lowercase, and number' 
      }));
      return false;
    }
    setErrors(prev => ({ ...prev, password: '' }));
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): boolean => {
    if (!confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your password' }));
      return false;
    }
    if (confirmPassword !== password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return false;
    }
    setErrors(prev => ({ ...prev, confirmPassword: '' }));
    return true;
  };

  const validateAge = (age: string): boolean => {
    if (!age) {
      setErrors(prev => ({ ...prev, age: 'Age is required' }));
      return false;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      setErrors(prev => ({ ...prev, age: 'Please enter a valid age (13-120)' }));
      return false;
    }
    setErrors(prev => ({ ...prev, age: '' }));
    return true;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    switch (field) {
      case 'name':
        if (errors.name) validateName(value);
        break;
      case 'email':
        setEmailExists(null); // Reset email check status
        if (errors.email) validateEmail(value);
        
        // Debounced email check
        const timeoutId = setTimeout(() => {
          if (value && value.includes('@') && !errors.email) {
            checkEmailExists(value);
          }
        }, 1000);
        
        return () => clearTimeout(timeoutId);
        break;
      case 'password':
        if (errors.password) validatePassword(value);
        if (formData.confirmPassword && errors.confirmPassword) {
          validateConfirmPassword(formData.confirmPassword, value);
        }
        break;
      case 'confirmPassword':
        if (errors.confirmPassword) validateConfirmPassword(value, formData.password);
        break;
      case 'age':
        if (errors.age) validateAge(value);
        break;
    }
  };

  const handleSignup = async () => {
    // Clear previous errors
    dispatch(clearError());
    
    // Validate all fields
    const isNameValid = validateName(formData.name);
    const isEmailValid = validateEmail(formData.email);
    const isPasswordValid = validatePassword(formData.password);
    const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword, formData.password);
    const isAgeValid = validateAge(formData.age);
    
    if (!acceptedTerms) {
      // Focus on terms checkbox for accessibility
      return;
    }

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isAgeValid) {
      return;
    }

    try {
      await dispatch(signUp({
        method: 'email',
        userData: {
          name: formData.name.trim(),
          age: parseInt(formData.age),
          gender: 'prefer_not_to_say', // Default for MVP
          credentials: {
            email: formData.email,
            password: formData.password,
          },
          healthInterests: [], // Default empty for MVP
        }
      })).unwrap();
    } catch (error) {
      console.error('Signup error:', error);
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join BioReceipt.AI today</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter your full name"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              accessible={true}
              accessibilityLabel="Full name input"
              accessibilityHint="Enter your full name for your profile"
              testID="signup-name-input"
            />
            {errors.name ? (
              <Text 
                style={styles.errorText}
                accessible={true}
                accessibilityRole="alert"
              >
                {errors.name}
              </Text>
            ) : null}
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              placeholder="Enter your email"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessible={true}
              accessibilityLabel="Email address input"
              accessibilityHint="Enter your email address for your account"
              testID="signup-email-input"
            />
            {errors.email ? (
              <Text 
                style={styles.errorText}
                accessible={true}
                accessibilityRole="alert"
              >
                {errors.email}
              </Text>
            ) : null}
            
            {/* Email Status Indicator */}
            {!errors.email && formData.email && formData.email.includes('@') && (
              <View style={styles.emailStatusContainer}>
                {isCheckingEmail ? (
                  <Text style={styles.emailCheckingText}>Checking email...</Text>
                ) : emailExists === true ? (
                  <View style={styles.emailExistsContainer}>
                    <Text style={styles.emailExistsText}>Email already registered</Text>
                    <TouchableOpacity
                      onPress={onNavigateToLogin}
                      style={styles.loginLink}
                      accessible={true}
                      accessibilityLabel="Sign in instead"
                      accessibilityHint="Navigate to login screen"
                    >
                      <Text style={styles.loginLinkText}>Sign in instead?</Text>
                    </TouchableOpacity>
                  </View>
                ) : emailExists === false ? (
                  <Text style={styles.emailAvailableText}>✓ Email available</Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Age Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={[styles.input, errors.age ? styles.inputError : null]}
              value={formData.age}
              onChangeText={(text) => handleInputChange('age', text)}
              placeholder="Enter your age"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              keyboardType="numeric"
              maxLength={3}
              accessible={true}
              accessibilityLabel="Age input"
              accessibilityHint="Enter your age for personalized recommendations"
              testID="signup-age-input"
            />
            {errors.age ? (
              <Text 
                style={styles.errorText}
                accessible={true}
                accessibilityRole="alert"
              >
                {errors.age}
              </Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              placeholder="Create a strong password"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              secureTextEntry
              accessible={true}
              accessibilityLabel="Password input"
              accessibilityHint="Create a password with uppercase, lowercase, and number"
              testID="signup-password-input"
            />
            {errors.password ? (
              <Text 
                style={styles.errorText}
                accessible={true}
                accessibilityRole="alert"
              >
                {errors.password}
              </Text>
            ) : null}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              placeholder="Confirm your password"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              secureTextEntry
              accessible={true}
              accessibilityLabel="Confirm password input"
              accessibilityHint="Re-enter your password to confirm"
              testID="signup-confirm-password-input"
            />
            {errors.confirmPassword ? (
              <Text 
                style={styles.errorText}
                accessible={true}
                accessibilityRole="alert"
              >
                {errors.confirmPassword}
              </Text>
            ) : null}
          </View>

          {/* Terms and Conditions */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            accessible={true}
            accessibilityLabel={acceptedTerms ? "Terms accepted" : "Accept terms and conditions"}
            accessibilityHint="Toggle acceptance of terms and conditions"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
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

          {/* Signup Button */}
          <TouchableOpacity
            style={[
              styles.signupButton, 
              (isLoading || !acceptedTerms) && styles.signupButtonDisabled
            ]}
            onPress={handleSignup}
            disabled={isLoading || !acceptedTerms}
            accessible={true}
            accessibilityLabel={isLoading ? "Creating account..." : "Create account"}
            accessibilityHint="Create your BioReceipt account"
            accessibilityRole="button"
            testID="signup-submit-button"
          >
            <Text style={styles.signupButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={onNavigateToLogin}
            accessible={true}
            accessibilityLabel="Sign in"
            accessibilityHint="Navigate to login screen"
            accessibilityRole="button"
          >
            <Text style={styles.loginLink}>Sign In</Text>
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
  emailAvailableText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.success,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  emailExistsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  emailExistsText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.warning,
    marginRight: BioReceiptTheme.spacing.sm,
  },
  loginLink: {
    minHeight: 32,
    justifyContent: 'center',
  },
  loginLinkText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.lg,
    minHeight: 44, // Accessibility: minimum touch target
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: 4,
    marginRight: BioReceiptTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BioReceiptTheme.colors.primary,
    borderColor: BioReceiptTheme.colors.primary,
  },
  checkmark: {
    color: BioReceiptTheme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    flex: 1,
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
  signupButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  signupButtonDisabled: {
    backgroundColor: BioReceiptTheme.colors.disabled,
  },
  signupButtonText: {
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
});

export default SignupScreen;
