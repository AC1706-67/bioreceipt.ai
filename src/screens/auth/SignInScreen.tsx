/**
 * Sign In Screen Component
 * Handles user authentication with multiple methods
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
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { signIn, clearError, selectIsLoading, selectAuthError } from '../../store/authSlice';
import { AuthCredentials } from '../../types';
import {
  createButtonAccessibility,
  createTextInputAccessibility,
  createHeaderAccessibility,
  createAlertAccessibility,
  ACCESSIBILITY_ROLES,
  announceForAccessibility,
} from '../../utils/accessibility';

interface SignInFormData {
  email: string;
  password: string;
  phone: string;
}

interface SignInScreenProps {
  onNavigateToSignUp: () => void;
  onSignInSuccess: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onNavigateToSignUp,
  onSignInSuccess,
}) => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectAuthError);

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignInFormData>({
    defaultValues: {
      email: '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      dispatch(clearError());

      const credentials: AuthCredentials = {
        password: data.password,
      };

      if (authMethod === 'email') {
        credentials.email = data.email;
      } else {
        credentials.phone = data.phone;
      }

      const result = await dispatch(signIn({ method: authMethod, credentials }));
      
      if (signIn.fulfilled.match(result)) {
        onSignInSuccess();
      }
    } catch (err) {
      console.error('Sign in error:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      dispatch(clearError());
      // TODO: Implement Google Sign-In
      Alert.alert('Coming Soon', 'Google Sign-In will be implemented in the next phase');
    } catch (err) {
      console.error('Google sign in error:', err);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      dispatch(clearError());
      // TODO: Implement Apple Sign-In
      Alert.alert('Coming Soon', 'Apple Sign-In will be implemented in the next phase');
    } catch (err) {
      console.error('Apple sign in error:', err);
    }
  };

  const switchAuthMethod = (method: 'email' | 'phone') => {
    setAuthMethod(method);
    reset();
    dispatch(clearError());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text 
            style={styles.title}
            {...createHeaderAccessibility('Welcome Back', 1)}
          >
            Welcome Back
          </Text>
          <Text 
            style={styles.subtitle}
            accessible={true}
            accessibilityRole={ACCESSIBILITY_ROLES.TEXT}
            accessibilityLabel="Sign in to continue your wellness journey"
          >
            Sign in to continue your wellness journey
          </Text>
        </View>

        <View style={styles.authMethodSelector}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              authMethod === 'email' && styles.methodButtonActive,
            ]}
            onPress={() => switchAuthMethod('email')}
            {...createButtonAccessibility(
              'Sign in with email',
              'Double tap to switch to email sign in method',
              { selected: authMethod === 'email' }
            )}
          >
            <Text
              style={[
                styles.methodButtonText,
                authMethod === 'email' && styles.methodButtonTextActive,
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodButton,
              authMethod === 'phone' && styles.methodButtonActive,
            ]}
            onPress={() => switchAuthMethod('phone')}
            {...createButtonAccessibility(
              'Sign in with phone',
              'Double tap to switch to phone number sign in method',
              { selected: authMethod === 'phone' }
            )}
          >
            <Text
              style={[
                styles.methodButtonText,
                authMethod === 'phone' && styles.methodButtonTextActive,
              ]}
            >
              Phone
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {authMethod === 'email' ? (
            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text 
                    style={styles.inputLabel}
                    accessible={true}
                    accessibilityRole={ACCESSIBILITY_ROLES.TEXT}
                  >
                    Email
                  </Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Enter your email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    {...createTextInputAccessibility(
                      'Email address',
                      'Enter your email address to sign in',
                      true,
                      !!errors.email
                    )}
                  />
                  {errors.email && (
                    <Text 
                      style={styles.errorText}
                      {...createAlertAccessibility(errors.email.message || '', 'error')}
                    >
                      {errors.email.message}
                    </Text>
                  )}
                </View>
              )}
            />
          ) : (
            <Controller
              control={control}
              name="phone"
              rules={{
                required: 'Phone number is required',
                pattern: {
                  value: /^\+?[1-9]\d{1,14}$/,
                  message: 'Invalid phone number',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text 
                    style={styles.inputLabel}
                    accessible={true}
                    accessibilityRole={ACCESSIBILITY_ROLES.TEXT}
                  >
                    Phone Number
                  </Text>
                  <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    placeholder="Enter your phone number"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    {...createTextInputAccessibility(
                      'Phone number',
                      'Enter your phone number to sign in',
                      true,
                      !!errors.phone
                    )}
                  />
                  {errors.phone && (
                    <Text 
                      style={styles.errorText}
                      {...createAlertAccessibility(errors.phone.message || '', 'error')}
                    >
                      {errors.phone.message}
                    </Text>
                  )}
                </View>
              )}
            />
          )}

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <Text 
                  style={styles.inputLabel}
                  accessible={true}
                  accessibilityRole={ACCESSIBILITY_ROLES.TEXT}
                >
                  Password
                </Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  {...createTextInputAccessibility(
                    'Password',
                    'Enter your password. This field is secure and will hide your input',
                    true,
                    !!errors.password
                  )}
                />
                {errors.password && (
                  <Text 
                    style={styles.errorText}
                    {...createAlertAccessibility(errors.password.message || '', 'error')}
                  >
                    {errors.password.message}
                  </Text>
                )}
              </View>
            )}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onNavigateToSignUp}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  authMethodSelector: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  methodButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  signInButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dee2e6',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6c757d',
  },
  socialButtons: {
    marginBottom: 20,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  socialButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6c757d',
  },
  footerLink: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
});