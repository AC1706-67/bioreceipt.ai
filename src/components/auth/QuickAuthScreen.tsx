/**
 * Quick Authentication Screen
 * Simple auth screen to get users started quickly
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
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { TEST_EMAIL, TEST_PASSWORD } from '@env';

export default function QuickAuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      let result: any;
      if (isSignUp) {
        result = await signUp(email, password, name || 'User');
      } else {
        result = await signIn(email, password);
      }

      if (result?.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const makeTestCreds = () => {
    // Use environment variables if available, otherwise generate dynamic ones
    if (TEST_EMAIL && TEST_PASSWORD) {
      return {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      };
    }
    
    const stamp = Date.now().toString();
    return {
      // no spaces, no accidental hyphen gaps
      email: `test${stamp}@example.com`,
      password: `Test-${stamp.slice(-6)}!`,
    };
  };

  const handleQuickStart = async () => {
    setLoading(true);
    try {
      const { email, password } = makeTestCreds();
      
      // 1) Try to sign in (in case the test user already exists)
      let { error } = await supabase.auth.signInWithPassword({ email, password });
      
      // 2) If that fails because the user doesn't exist, create then sign in
      if (error) {
        console.log('[Auth] Initial sign-in failed, attempting sign-up:', error.message);
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          console.error('[Auth] Sign-up failed:', signUpError);
          return Alert.alert('Sign up error', `${signUpError.message} (Code: ${signUpError.status || 'unknown'})`);
        }
        
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          console.error('[Auth] Sign-in after signup failed:', signInError);
          return Alert.alert('Sign in error', `${signInError.message} (Code: ${signInError.status || 'unknown'})`);
        }
      }
      
      // Optional: confirm session for your log
      const { data } = await supabase.auth.getSession();
      console.log('[Supabase auth] session?', !!data.session);
      
    } catch (error) {
      Alert.alert('Error', 'Could not create test account');
      console.error('Quick start error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to BioReceipt.AI</Text>
        <Text style={styles.subtitle}>
          Track your intake and get AI-powered insights
        </Text>

        {/* Quick Start Button */}
        <TouchableOpacity 
          style={[styles.button, styles.quickStartButton]}
          onPress={handleQuickStart}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Quick Start (Test Account)</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.orText}>or</Text>

        {/* Auth Form */}
        <View style={styles.form}>
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity 
            style={styles.button}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  quickStartButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 20,
  },
  orText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchText: {
    color: '#2196F3',
    fontSize: 14,
  },
});