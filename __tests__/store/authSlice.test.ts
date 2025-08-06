/**
 * Unit tests for authentication Redux slice
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  initializeAuth,
  signIn,
  signUp,
  signOut,
  clearError,
  updateUser,
  setLoading,
} from '../../src/store/authSlice';
import { AuthService } from '../../src/services/auth/authService';

type TestStore = ReturnType<typeof configureStore<{ auth: ReturnType<typeof authReducer> }>>;

// Mock AuthService
jest.mock('../../src/services/auth/authService');

describe('Auth Slice', () => {
  let store: TestStore;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      
      expect(state).toEqual({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isInitialized: false,
      });
    });
  });

  describe('synchronous actions', () => {
    it('should clear error', () => {
      // First set an error
      store.dispatch({ type: 'auth/signIn/rejected', payload: 'Test error' });
      
      // Then clear it
      store.dispatch(clearError());
      
      const state = store.getState().auth;
      expect(state.error).toBeNull();
    });

    it('should update user', () => {
      // First set a user
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        gender: 'male' as const,
        healthInterests: [],
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
      };

      store.dispatch({ type: 'auth/signIn/fulfilled', payload: mockUser });
      
      // Then update user
      store.dispatch(updateUser({ name: 'Jane Doe' }));
      
      const state = store.getState().auth;
      expect(state.user?.name).toBe('Jane Doe');
      expect(state.user?.email).toBe('john@example.com'); // Other fields unchanged
    });

    it('should set loading state', () => {
      store.dispatch(setLoading(true));
      
      let state = store.getState().auth;
      expect(state.isLoading).toBe(true);
      
      store.dispatch(setLoading(false));
      
      state = store.getState().auth;
      expect(state.isLoading).toBe(false);
    });
  });

  describe('async actions', () => {
    const mockUser = {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      gender: 'male' as const,
      healthInterests: [],
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
    };

    describe('initializeAuth', () => {
      it('should handle successful initialization', async () => {
        const mockInstance = {
          initializeAuth: jest.fn().mockResolvedValue(mockUser),
        };
        
        // Mock the static getInstance method
        (AuthService.getInstance as jest.Mock).mockReturnValue(mockInstance);

        await store.dispatch(initializeAuth() as any);

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.isInitialized).toBe(true);
        expect(state.user).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should handle failed initialization', async () => {
        const mockInstance = {
          initializeAuth: jest.fn().mockRejectedValue(new Error('Init failed')),
        };
        
        (AuthService.getInstance as jest.Mock).mockReturnValue(mockInstance);

        await store.dispatch(initializeAuth() as any);

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.isInitialized).toBe(true);
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBe('Failed to initialize authentication');
      });
    });

    describe('signIn', () => {
      it('should handle successful sign in', async () => {
        const mockInstance = {
          signIn: jest.fn().mockResolvedValue({
            success: true,
            user: mockUser,
            token: 'access_token',
            refreshToken: 'refresh_token'
          }),
        };
        
        (AuthService.getInstance as jest.Mock).mockReturnValue(mockInstance);

        await store.dispatch(signIn({
          method: 'email',
          credentials: { email: 'john@example.com', password: 'password' }
        }) as any);

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.user).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should handle failed sign in', async () => {
        const mockInstance = {
          signIn: jest.fn().mockResolvedValue({
            success: false,
            error: 'Invalid credentials'
          }),
        };
        
        (AuthService.getInstance as jest.Mock).mockReturnValue(mockInstance);

        await store.dispatch(signIn({
          method: 'email',
          credentials: { email: 'john@example.com', password: 'wrong' }
        }) as any);

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBe('Invalid credentials');
      });
    });

    describe('signOut', () => {
      it('should handle successful sign out', async () => {
        // First sign in
        store.dispatch({ type: 'auth/signIn/fulfilled', payload: mockUser });
        
        const mockInstance = {
          signOut: jest.fn().mockResolvedValue(undefined),
        };
        
        (AuthService.getInstance as jest.Mock).mockReturnValue(mockInstance);

        await store.dispatch(signOut() as any);

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle failed sign out', async () => {
        const mockInstance = {
          signOut: jest.fn().mockRejectedValue(new Error('Sign out failed')),
        };
        
        (AuthService.getInstance as jest.Mock).mockReturnValue(mockInstance);

        await store.dispatch(signOut() as any);

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Failed to sign out');
      });
    });
  });
});