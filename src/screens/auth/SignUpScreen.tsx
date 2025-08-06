/**
 * Sign Up Screen Component
 * Handles user registration with profile setup
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
import { signUp, clearError, selectIsLoading, selectAuthError } from '../../store/authSlice';
import { UserRegistration, Gender, HealthInterest, HealthCategory, SkillLevel } from '../../types';

interface SignUpFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  age: string;
  gender: Gender;
}

interface SignUpScreenProps {
  onNavigateToSignIn: () => void;
  onSignUpSuccess: () => void;
}

const HEALTH_CATEGORIES: { value: HealthCategory; label: string }[] = [
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'mental_wellness', label: 'Mental Wellness' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'hygiene', label: 'Hygiene' },
];

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onNavigateToSignIn,
  onSignUpSuccess,
}) => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectAuthError);

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [currentStep, setCurrentStep] = useState(1);
  const [healthInterests, setHealthInterests] = useState<HealthInterest[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<SignUpFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      age: '',
      gender: 'prefer_not_to_say',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: SignUpFormData) => {
    if (healthInterests.length === 0) {
      Alert.alert('Health Interests Required', 'Please select at least one health interest.');
      return;
    }

    try {
      dispatch(clearError());

      const userData: UserRegistration = {
        name: data.name,
        age: parseInt(data.age, 10),
        gender: data.gender,
        healthInterests,
        authMethod,
        credentials: {
          password: data.password,
        },
      };

      if (authMethod === 'email') {
        userData.credentials.email = data.email;
      } else {
        userData.credentials.phone = data.phone;
      }

      const result = await dispatch(signUp({ method: authMethod, userData }));
      
      if (signUp.fulfilled.match(result)) {
        onSignUpSuccess();
      }
    } catch (err) {
      console.error('Sign up error:', err);
    }
  };

  const switchAuthMethod = (method: 'email' | 'phone') => {
    setAuthMethod(method);
    reset();
    dispatch(clearError());
  };

  const toggleHealthInterest = (category: HealthCategory, level: SkillLevel) => {
    setHealthInterests(prev => {
      const existingIndex = prev.findIndex(interest => interest.category === category);
      
      if (existingIndex >= 0) {
        // If category exists, update level or remove if same level
        if (prev[existingIndex].level === level) {
          return prev.filter((_, index) => index !== existingIndex);
        } else {
          const updated = [...prev];
          updated[existingIndex] = { category, level };
          return updated;
        }
      } else {
        // Add new interest
        return [...prev, { category, level }];
      }
    });
  };

  const renderStep1 = () => (
    <>
      <View style={styles.authMethodSelector}>
        <TouchableOpacity
          style={[
            styles.methodButton,
            authMethod === 'email' && styles.methodButtonActive,
          ]}
          onPress={() => switchAuthMethod('email')}
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

      <Controller
        control={control}
        name="name"
        rules={{
          required: 'Name is required',
          minLength: { value: 2, message: 'Name must be at least 2 characters' },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter your full name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name.message}</Text>
            )}
          </View>
        )}
      />

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
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
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
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Enter your phone number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone.message}</Text>
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
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Enter your password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        rules={{
          required: 'Please confirm your password',
          validate: value => value === password || 'Passwords do not match',
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Confirm your password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setCurrentStep(2)}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Controller
        control={control}
        name="age"
        rules={{
          required: 'Age is required',
          validate: value => {
            const age = parseInt(value, 10);
            if (isNaN(age)) return 'Please enter a valid age';
            if (age < 13) return 'Must be at least 13 years old';
            if (age > 120) return 'Please enter a valid age';
            return true;
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={[styles.input, errors.age && styles.inputError]}
              placeholder="Enter your age"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="numeric"
            />
            {errors.age && (
              <Text style={styles.errorText}>{errors.age.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="gender"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.optionsContainer}>
              {GENDER_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    value === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => onChange(option.value)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      value === option.value && styles.optionButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Health Interests</Text>
        <Text style={styles.inputSubLabel}>Select your areas of interest and skill level</Text>
        {HEALTH_CATEGORIES.map(category => (
          <View key={category.value} style={styles.healthInterestContainer}>
            <Text style={styles.categoryLabel}>{category.label}</Text>
            <View style={styles.skillLevelContainer}>
              {SKILL_LEVELS.map(level => {
                const isSelected = healthInterests.some(
                  interest => interest.category === category.value && interest.level === level.value
                );
                return (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.skillLevelButton,
                      isSelected && styles.skillLevelButtonSelected,
                    ]}
                    onPress={() => toggleHealthInterest(category.value, level.value)}
                  >
                    <Text
                      style={[
                        styles.skillLevelButtonText,
                        isSelected && styles.skillLevelButtonTextSelected,
                      ]}
                    >
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.signUpButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Step {currentStep} of 2: {currentStep === 1 ? 'Account Details' : 'Personal Info'}
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.progressStepActive]} />
          <View style={[styles.progressStep, currentStep === 2 && styles.progressStepActive]} />
        </View>

        <View style={styles.form}>
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateToSignIn}>
            <Text style={styles.footerLink}>Sign In</Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
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
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressStep: {
    width: 60,
    height: 4,
    backgroundColor: '#dee2e6',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#3498db',
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
  inputSubLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
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
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
  },
  optionButtonSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#6c757d',
  },
  optionButtonTextSelected: {
    color: '#ffffff',
  },
  healthInterestContainer: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  skillLevelContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  skillLevelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
  },
  skillLevelButtonSelected: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  skillLevelButtonText: {
    fontSize: 12,
    color: '#6c757d',
  },
  skillLevelButtonTextSelected: {
    color: '#ffffff',
  },
  nextButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  backButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    flex: 2,
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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