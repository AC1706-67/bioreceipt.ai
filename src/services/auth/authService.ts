/**
 * Authentication Service
 * Handles sign-in, sign-up, token refresh, and authentication state
 * Integrated with Supabase authentication
 */

import { AuthMethod, AuthCredentials, UserRegistration, AuthResult, UserProfile, AuthTokens } from '../../types';
import { storeTokens, getTokens, clearTokens, isTokenExpired } from '../../utils/tokenManager';
import { validateData, userRegistrationSchema } from '../../utils/validation';
import { supabase, supabaseHelpers } from '../../config/supabase';

/**
 * Authentication Service Class
 */
export class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign in with credentials
   */
  public async signIn(method: AuthMethod, credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Validate credentials based on method
      if (method === 'email' && (!credentials.email || !credentials.password)) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      if (method === 'phone' && (!credentials.phone || !credentials.password)) {
        return {
          success: false,
          error: 'Phone and password are required'
        };
      }

      if ((method === 'google' || method === 'apple') && !credentials.token) {
        return {
          success: false,
          error: 'OAuth token is required'
        };
      }

      // Supabase authentication
      let authResponse;
      
      if (method === 'email') {
        authResponse = await supabase.auth.signInWithPassword({
          email: credentials.email!,
          password: credentials.password!,
        });
      } else {
        // For now, only email auth is implemented
        return {
          success: false,
          error: 'Authentication method not yet supported'
        };
      }

      if (authResponse.error) {
        return {
          success: false,
          error: authResponse.error.message
        };
      }

      if (authResponse.data.user && authResponse.data.session) {
        // Get user profile
        const userProfile = await supabaseHelpers.getUserProfile(authResponse.data.user.id);
        
        // Create tokens object
        const tokens: AuthTokens = {
          accessToken: authResponse.data.session.access_token,
          refreshToken: authResponse.data.session.refresh_token,
          expiresAt: new Date(authResponse.data.session.expires_at! * 1000),
          tokenType: 'Bearer'
        };

        // Store tokens securely
        await storeTokens(tokens);
        
        // Create user profile object
        const user: UserProfile = {
          id: authResponse.data.user.id,
          name: userProfile?.name || authResponse.data.user.email || 'User',
          email: authResponse.data.user.email,
          age: userProfile?.age || null,
          gender: userProfile?.gender || 'prefer_not_to_say',
          healthInterests: [],
          notificationPreferences: {
            enabled: true,
            dailyTipTime: '09:00',
            streakReminders: true,
            encouragementMessages: true,
            timezone: 'UTC'
          },
          createdAt: new Date(authResponse.data.user.created_at),
          updatedAt: new Date(),
          isActive: true
        };

        // Set current user
        this.currentUser = user;
        
        return {
          success: true,
          user: user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken
        };
      }

      return {
        success: false,
        error: 'Authentication failed'
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: 'Network error occurred during sign in'
      };
    }
  }

  /**
   * Sign up with user registration data
   */
  public async signUp(method: AuthMethod, userData: UserRegistration): Promise<AuthResult> {
    try {
      // Basic validation
      if (method === 'email' && (!userData.credentials.email || !userData.credentials.password)) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      if (!userData.name || userData.name.trim().length < 2) {
        return {
          success: false,
          error: 'Name must be at least 2 characters'
        };
      }

      // Supabase sign up
      let authResponse;
      
      if (method === 'email') {
        authResponse = await supabase.auth.signUp({
          email: userData.credentials.email!,
          password: userData.credentials.password!,
        });
      } else {
        return {
          success: false,
          error: 'Registration method not yet supported'
        };
      }

      if (authResponse.error) {
        return {
          success: false,
          error: authResponse.error.message
        };
      }

      if (authResponse.data.user && authResponse.data.session) {
        // Create user profile in database
        const userProfile = await supabaseHelpers.upsertUserProfile({
          id: authResponse.data.user.id,
          name: userData.name.trim(),
          age: userData.age || null,
          gender: userData.gender || 'prefer_not_to_say',
        });

        // Create tokens object
        const tokens: AuthTokens = {
          accessToken: authResponse.data.session.access_token,
          refreshToken: authResponse.data.session.refresh_token,
          expiresAt: new Date(authResponse.data.session.expires_at! * 1000),
          tokenType: 'Bearer'
        };

        // Store tokens securely
        await storeTokens(tokens);
        
        // Create user profile object
        const user: UserProfile = {
          id: authResponse.data.user.id,
          name: userData.name.trim(),
          email: authResponse.data.user.email,
          age: userData.age || null,
          gender: userData.gender || 'prefer_not_to_say',
          healthInterests: userData.healthInterests || [],
          notificationPreferences: {
            enabled: true,
            dailyTipTime: '09:00',
            streakReminders: true,
            encouragementMessages: true,
            timezone: 'UTC'
          },
          createdAt: new Date(authResponse.data.user.created_at),
          updatedAt: new Date(),
          isActive: true
        };

        // Set current user
        this.currentUser = user;
        
        return {
          success: true,
          user: user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken
        };
      }

      return {
        success: false,
        error: 'Registration failed'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: 'Network error occurred during registration'
      };
    }
  }

  /**
   * Sign out current user
   */
  public async signOut(): Promise<void> {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear stored tokens
      await clearTokens();
      
      // Clear current user
      this.currentUser = null;
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<string | null> {
    try {
      const tokens = await getTokens();
      if (!tokens) {
        return null;
      }

      // Mock API call to refresh token
      const response = await this.mockRefreshTokenAPI(tokens.refreshToken);
      
      if (response.success && response.tokens) {
        await storeTokens(response.tokens);
        return response.tokens.accessToken;
      }

      // If refresh fails, clear tokens
      await clearTokens();
      this.currentUser = null;
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      await clearTokens();
      this.currentUser = null;
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await getTokens();
      if (!tokens) {
        return false;
      }

      // If token is expired, try to refresh
      if (isTokenExpired(tokens)) {
        const newToken = await this.refreshToken();
        return newToken !== null;
      }

      return true;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }

  /**
   * Initialize authentication state on app start
   */
  public async initializeAuth(): Promise<UserProfile | null> {
    try {
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return null;
      }

      // Get user profile
      const userProfile = await supabaseHelpers.getUserProfile(session.user.id);
      
      if (userProfile) {
        // Create user profile object
        const user: UserProfile = {
          id: session.user.id,
          name: userProfile.name,
          email: session.user.email,
          age: userProfile.age,
          gender: userProfile.gender || 'prefer_not_to_say',
          healthInterests: [],
          notificationPreferences: {
            enabled: true,
            dailyTipTime: '09:00',
            streakReminders: true,
            encouragementMessages: true,
            timezone: 'UTC'
          },
          createdAt: new Date(userProfile.created_at),
          updatedAt: new Date(userProfile.updated_at),
          isActive: true
        };

        // Store tokens
        const tokens: AuthTokens = {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: new Date(session.expires_at! * 1000),
          tokenType: 'Bearer'
        };
        await storeTokens(tokens);

        this.currentUser = user;
        return user;
      }

      return null;
    } catch (error) {
      console.error('Auth initialization error:', error);
      return null;
    }
  }

  // Mock API methods - replace with actual API calls
  private async mockSignInAPI(method: AuthMethod, credentials: AuthCredentials): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    user?: UserProfile;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful response
    return {
      success: true,
      tokens: {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        tokenType: 'Bearer'
      },
      user: {
        id: 'user_' + Date.now(),
        name: 'Mock User',
        email: credentials.email,
        phone: credentials.phone,
        age: 30,
        gender: 'prefer_not_to_say',
        healthInterests: [{ category: 'fitness', level: 'beginner' }],
        notificationPreferences: {
          enabled: true,
          dailyTipTime: '09:00',
          streakReminders: true,
          encouragementMessages: true,
          timezone: 'UTC'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }
    };
  }

  private async mockSignUpAPI(method: AuthMethod, userData: UserRegistration): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    user?: UserProfile;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock successful response
    return {
      success: true,
      tokens: {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        tokenType: 'Bearer'
      },
      user: {
        id: 'user_' + Date.now(),
        name: userData.name,
        email: userData.credentials.email,
        phone: userData.credentials.phone,
        age: userData.age,
        gender: userData.gender,
        healthInterests: userData.healthInterests,
        notificationPreferences: {
          enabled: true,
          dailyTipTime: '09:00',
          streakReminders: true,
          encouragementMessages: true,
          timezone: 'UTC'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }
    };
  }

  private async mockRefreshTokenAPI(refreshToken: string): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      tokens: {
        accessToken: 'mock_refreshed_access_token_' + Date.now(),
        refreshToken: refreshToken, // Keep same refresh token
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        tokenType: 'Bearer'
      }
    };
  }

  private async getCurrentUserFromAPI(): Promise<UserProfile | null> {
    // Mock API call to get current user
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.currentUser; // Return cached user for now
  }
}