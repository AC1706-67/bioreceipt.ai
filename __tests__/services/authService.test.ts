/**
 * Unit tests for authentication service
 */

import { AuthService } from '../../src/services/auth/authService';
import { AuthMethod, UserRegistration } from '../../src/types';
import * as tokenManager from '../../src/utils/tokenManager';

// Mock token manager
jest.mock('../../src/utils/tokenManager');
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = AuthService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('signIn', () => {
    it('should sign in successfully with email', async () => {
      mockTokenManager.storeTokens.mockResolvedValue();

      const result = await authService.signIn('email', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(mockTokenManager.storeTokens).toHaveBeenCalled();
    });

    it('should fail with missing email credentials', async () => {
      const result = await authService.signIn('email', {
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should sign in successfully with phone', async () => {
      mockTokenManager.storeTokens.mockResolvedValue();

      const result = await authService.signIn('phone', {
        phone: '+1234567890',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should fail with missing phone credentials', async () => {
      const result = await authService.signIn('phone', {
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone and password are required');
    });

    it('should sign in successfully with OAuth', async () => {
      mockTokenManager.storeTokens.mockResolvedValue();

      const result = await authService.signIn('google', {
        token: 'oauth_token_123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should fail with missing OAuth token', async () => {
      const result = await authService.signIn('google', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth token is required');
    });
  });

  describe('signUp', () => {
    const validUserData: UserRegistration = {
      name: 'John Doe',
      age: 30,
      gender: 'male',
      healthInterests: [{ category: 'fitness', level: 'beginner' }],
      authMethod: 'email',
      credentials: {
        email: 'john@example.com',
        password: 'password123',
      },
    };

    it('should sign up successfully', async () => {
      mockTokenManager.storeTokens.mockResolvedValue();

      const result = await authService.signUp('email', validUserData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.name).toBe('John Doe');
      expect(mockTokenManager.storeTokens).toHaveBeenCalled();
    });

    it('should fail with invalid user data', async () => {
      const invalidUserData = {
        ...validUserData,
        age: 12, // Below minimum age
      };

      const result = await authService.signUp('email', invalidUserData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Must be at least 13 years old');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockTokenManager.clearTokens.mockResolvedValue();

      await expect(authService.signOut()).resolves.not.toThrow();
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should throw error if token clearing fails', async () => {
      mockTokenManager.clearTokens.mockRejectedValue(new Error('Clear failed'));

      await expect(authService.signOut()).rejects.toThrow('Failed to sign out');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid tokens', async () => {
      mockTokenManager.getTokens.mockResolvedValue({
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer',
      });
      mockTokenManager.isTokenExpired.mockReturnValue(false);

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false for no tokens', async () => {
      mockTokenManager.getTokens.mockResolvedValue(null);

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should try to refresh expired tokens', async () => {
      mockTokenManager.getTokens.mockResolvedValue({
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 3600000),
        tokenType: 'Bearer',
      });
      mockTokenManager.isTokenExpired.mockReturnValue(true);

      // Mock successful refresh
      const refreshSpy = jest
        .spyOn(authService, 'refreshToken')
        .mockResolvedValue('new_token');

      const result = await authService.isAuthenticated();

      expect(refreshSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', () => {
      const user = authService.getCurrentUser();
      // Initially null since no user is signed in
      expect(user).toBeNull();
    });
  });
});
