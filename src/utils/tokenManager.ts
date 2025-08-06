/**
 * JWT Token Management Utilities
 * Handles token storage, validation, and refresh logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { AuthTokens } from '../types';

// Storage keys
const TOKEN_STORAGE_KEY = 'auth_tokens';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Securely store authentication tokens
 */
export const storeTokens = async (tokens: AuthTokens): Promise<void> => {
  try {
    // Store access token in AsyncStorage (less sensitive, shorter lived)
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt.toISOString(),
      tokenType: tokens.tokenType,
    }));

    // Store refresh token in Keychain (more secure)
    await Keychain.setInternetCredentials(
      REFRESH_TOKEN_KEY,
      'refresh_token',
      tokens.refreshToken
    );
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw new Error('Failed to store authentication tokens');
  }
};

/**
 * Retrieve stored authentication tokens
 */
export const getTokens = async (): Promise<AuthTokens | null> => {
  try {
    // Get access token from AsyncStorage
    const tokenData = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!tokenData) {
      return null;
    }

    const parsedTokenData = JSON.parse(tokenData);

    // Get refresh token from Keychain
    const credentials = await Keychain.getInternetCredentials(REFRESH_TOKEN_KEY);
    if (!credentials || typeof credentials === 'boolean') {
      return null;
    }

    return {
      accessToken: parsedTokenData.accessToken,
      refreshToken: credentials.password,
      expiresAt: new Date(parsedTokenData.expiresAt),
      tokenType: parsedTokenData.tokenType,
    };
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return null;
  }
};

/**
 * Clear all stored tokens
 */
export const clearTokens = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    // @ts-ignore - Keychain API type issue
    await Keychain.resetInternetCredentials(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing tokens:', error);
    throw new Error('Failed to clear authentication tokens');
  }
};

/**
 * Check if access token is expired
 */
export const isTokenExpired = (token: AuthTokens): boolean => {
  const now = new Date();
  const expirationTime = new Date(token.expiresAt.getTime() - 60000); // 1 minute buffer
  return now >= expirationTime;
};

/**
 * Check if tokens exist and are valid
 */
export const hasValidTokens = async (): Promise<boolean> => {
  try {
    const tokens = await getTokens();
    if (!tokens) {
      return false;
    }

    // Check if access token is not expired
    return !isTokenExpired(tokens);
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

/**
 * Get authorization header for API requests
 */
export const getAuthHeader = async (): Promise<string | null> => {
  try {
    const tokens = await getTokens();
    if (!tokens || isTokenExpired(tokens)) {
      return null;
    }

    return `${tokens.tokenType} ${tokens.accessToken}`;
  } catch (error) {
    console.error('Error getting auth header:', error);
    return null;
  }
};

/**
 * Decode JWT token payload (without verification)
 * Note: This is for client-side use only, server should always verify
 */
export const decodeJWTPayload = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Get user ID from stored access token
 */
export const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const tokens = await getTokens();
    if (!tokens || isTokenExpired(tokens)) {
      return null;
    }

    const payload = decodeJWTPayload(tokens.accessToken);
    return payload?.sub || payload?.userId || null;
  } catch (error) {
    console.error('Error getting user ID from token:', error);
    return null;
  }
};

/**
 * Token Manager singleton for compatibility
 */
export const tokenManager = {
  storeTokens,
  getTokens,
  clearTokens,
  isTokenExpired,
  hasValidTokens,
  getAuthHeader,
  decodeJWTPayload,
  getUserIdFromToken
};