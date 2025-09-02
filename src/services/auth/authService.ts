/**
 * Authentication Service
 * Simple authentication for BioReceipt app
 */

import { supabase } from '../../config/supabase';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || 'User'
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            name: name || 'User'
          });

        if (profileError) {
          console.warn('Could not create user profile:', profileError.message);
        }

        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: name
          },
          error: null
        };
      }

      return { user: null, error: 'Sign up failed' };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name
          },
          error: null
        };
      }

      return { user: null, error: 'Sign in failed' };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        return {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name
        });
      } else {
        callback(null);
      }
    });
  }

  /**
   * Check if email exists in the system
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; error: string | null }> {
    try {
      // Use Supabase's password reset to check if email exists
      // This is a safe way to check without exposing user data
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://example.com/reset' // Dummy URL, we just want to check if email exists
      });

      if (error) {
        // If error message indicates user not found, email doesn't exist
        if (error.message.toLowerCase().includes('user not found') || 
            error.message.toLowerCase().includes('email not confirmed')) {
          return { exists: false, error: null };
        }
        // Other errors might indicate the email exists but there's another issue
        return { exists: true, error: error.message };
      }

      // No error means email exists and reset email was sent
      return { exists: true, error: null };
    } catch (error) {
      return { exists: false, error: (error as Error).message };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Quick anonymous sign in for testing
   */
  async signInAnonymously(): Promise<AuthResponse> {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    // Try to sign up with a test account
    return this.signUp(testEmail, testPassword, 'Test User');
  }
}

export const authService = new AuthService();
export default authService;
