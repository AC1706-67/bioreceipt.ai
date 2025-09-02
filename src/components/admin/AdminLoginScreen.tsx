/**
 * Admin Login Screen
 * Secure authentication interface for admin users
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminAuthService, AdminUser } from '../../services/admin/adminAuthService';

interface AdminLoginScreenProps {
  onLogin: (user: AdminUser) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const adminAuthService = AdminAuthService.getInstance();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    if (requiresTwoFactor && !twoFactorCode.trim()) {
      Alert.alert('Error', 'Please enter the two-factor authentication code');
      return;
    }

    try {
      setLoading(true);

      const result = await adminAuthService.login({
        username: username.trim(),
        password,
        ipAddress: '127.0.0.1', // In real app, get actual IP
        userAgent: 'Admin Panel Mobile',
        twoFactorCode: twoFactorCode.trim() || undefined
      });

      if (result.success && result.user) {
        onLogin(result.user);
      } else if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        Alert.alert(
          'Two-Factor Authentication',
          'Please enter your two-factor authentication code to continue.'
        );
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
        // Reset form on error
        setPassword('');
        setTwoFactorCode('');
        setRequiresTwoFactor(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Login failed due to system error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUsername('');
    setPassword('');
    setTwoFactorCode('');
    setRequiresTwoFactor(false);
    setShowPassword(false);
  };

  const isFormValid = () => {
    if (!username.trim() || !password.trim()) return false;
    if (requiresTwoFactor && !twoFactorCode.trim()) return false;
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Admin Login</Text>
            <Text style={styles.subtitle}>
              Sign in to access the admin panel
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                accessibilityLabel="Username input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {requiresTwoFactor && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Two-Factor Code</Text>
                <TextInput
                  style={styles.input}
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  placeholder="Enter 6-digit code"
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!loading}
                  accessibilityLabel="Two-factor authentication code input"
                />
                <Text style={styles.helperText}>
                  Enter the 6-digit code from your authenticator app
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.loginButton,
                (!isFormValid() || loading) && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={!isFormValid() || loading}
              accessibilityLabel="Login button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {requiresTwoFactor ? 'Verify & Login' : 'Login'}
                </Text>
              )}
            </TouchableOpacity>

            {requiresTwoFactor && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setRequiresTwoFactor(false)}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>← Back to Login</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>Reset Form</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.securityNotice}>
              <Text style={styles.securityTitle}>🔒 Security Notice</Text>
              <Text style={styles.securityText}>
                This is a secure admin area. All login attempts are logged and monitored.
                Unauthorized access attempts will be reported.
              </Text>
            </View>

            <View style={styles.defaultCredentials}>
              <Text style={styles.defaultTitle}>Default Credentials</Text>
              <Text style={styles.defaultText}>
                Username: admin{'\n'}
                Password: Admin123!
              </Text>
              <Text style={styles.defaultWarning}>
                ⚠️ Change default password after first login
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  passwordToggle: {
    padding: 12,
  },
  passwordToggleText: {
    fontSize: 18,
  },
  helperText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    color: '#666666',
    fontSize: 14,
  },
  footer: {
    gap: 16,
  },
  securityNotice: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#BF360C',
    lineHeight: 16,
  },
  defaultCredentials: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  defaultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  defaultText: {
    fontSize: 12,
    color: '#2E7D32',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  defaultWarning: {
    fontSize: 11,
    color: '#F57C00',
    fontWeight: '500',
  },
});