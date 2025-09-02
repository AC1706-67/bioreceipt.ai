/**
 * Authentication Context
 * Provides authentication state throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User } from '../services/auth/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  signInAnonymously: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { user: newUser, error } = await authService.signIn(email, password);
    if (newUser) {
      setUser(newUser);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { user: newUser, error } = await authService.signUp(email, password, name);
    if (newUser) {
      setUser(newUser);
    }
    return { error };
  };

  const signOut = async () => {
    const { error } = await authService.signOut();
    if (!error) {
      setUser(null);
    }
    return { error };
  };

  const signInAnonymously = async () => {
    const { user: newUser, error } = await authService.signInAnonymously();
    if (newUser) {
      setUser(newUser);
    }
    return { error };
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInAnonymously
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}