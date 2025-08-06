/**
 * Unit tests for token manager utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {
  storeTokens,
  getTokens,
  clearTokens,
  isTokenExpired,
  hasValidTokens,
  getAuthHeader,
  decodeJWTPayload,
  getUserIdFromToken,
} from '../../src/utils/tokenManager';
import { AuthTokens } from '../../src/types';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-keychain');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('Token Manager', () => {
  const mockTokens: AuthTokens = {
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    tokenType: 'Bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeTokens', () => {
    it('should store tokens correctly', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();
      (mockKeychain.setInternetCredentials as jest.Mock).mockResolvedValue(false);

      await storeTokens(mockTokens);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'auth_tokens',
        JSON.stringify({
          accessToken: mockTokens.accessToken,
          expiresAt: mockTokens.expiresAt.toISOString(),
          tokenType: mockTokens.tokenType,
        })
      );

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'refresh_token',
        'refresh_token',
        mockTokens.refreshToken
      );
    });

    it('should throw error if storage fails', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(storeTokens(mockTokens)).rejects.toThrow('Failed to store authentication tokens');
    });
  });

  describe('getTokens', () => {
    it('should retrieve tokens correctly', async () => {
      const tokenData = {
        accessToken: mockTokens.accessToken,
        expiresAt: mockTokens.expiresAt.toISOString(),
        tokenType: mockTokens.tokenType,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(tokenData));
      (mockKeychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'refresh_token',
        password: mockTokens.refreshToken,
        service: 'refresh_token',
        storage: 'keychain',
      });

      const result = await getTokens();

      expect(result).toEqual(mockTokens);
    });

    it('should return null if no tokens stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getTokens();

      expect(result).toBeNull();
    });

    it('should return null if keychain access fails', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        accessToken: 'token',
        expiresAt: new Date().toISOString(),
        tokenType: 'Bearer',
      }));
      (mockKeychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const result = await getTokens();

      expect(result).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();
      (mockKeychain.resetInternetCredentials as jest.Mock).mockResolvedValue(undefined);

      await clearTokens();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('auth_tokens');
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const validToken: AuthTokens = {
        ...mockTokens,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const result = isTokenExpired(validToken);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken: AuthTokens = {
        ...mockTokens,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      const result = isTokenExpired(expiredToken);

      expect(result).toBe(true);
    });

    it('should return true for token expiring within buffer time', () => {
      const soonToExpireToken: AuthTokens = {
        ...mockTokens,
        expiresAt: new Date(Date.now() + 30000), // 30 seconds from now (within 1 minute buffer)
      };

      const result = isTokenExpired(soonToExpireToken);

      expect(result).toBe(true);
    });
  });

  describe('getAuthHeader', () => {
    it('should return correct auth header for valid token', async () => {
      const tokenData = {
        accessToken: mockTokens.accessToken,
        expiresAt: mockTokens.expiresAt.toISOString(),
        tokenType: mockTokens.tokenType,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(tokenData));
      (mockKeychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'refresh_token',
        password: mockTokens.refreshToken,
        service: 'refresh_token',
        storage: 'keychain',
      });

      const result = await getAuthHeader();

      expect(result).toBe(`Bearer ${mockTokens.accessToken}`);
    });

    it('should return null for expired token', async () => {
      const expiredTokenData = {
        accessToken: mockTokens.accessToken,
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        tokenType: mockTokens.tokenType,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredTokenData));
      (mockKeychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'refresh_token',
        password: mockTokens.refreshToken,
        service: 'refresh_token',
        storage: 'keychain',
      });

      const result = await getAuthHeader();

      expect(result).toBeNull();
    });
  });

  describe('decodeJWTPayload', () => {
    it('should decode valid JWT payload', () => {
      // Create a mock JWT token with base64 encoded payload
      const payload = { sub: 'user123', exp: Date.now() / 1000 + 3600 };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockJWT = `header.${encodedPayload}.signature`;

      const result = decodeJWTPayload(mockJWT);

      expect(result).toEqual(payload);
    });

    it('should return null for invalid JWT format', () => {
      const invalidJWT = 'invalid.jwt';

      const result = decodeJWTPayload(invalidJWT);

      expect(result).toBeNull();
    });
  });
});