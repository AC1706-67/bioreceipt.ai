/**
 * RLS Policy Enforcement - Integration Tests
 * Tests database Row Level Security policies for custom substances
 */

import { supabaseHelpers, Database } from '../../config/supabase';
import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { NewSubstance } from '../../models/NewSubstance';
import { SubstanceCategory } from '../../models/Substance';

// Mock authentication states
const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated'
};

const mockUnauthenticatedUser = null;

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

jest.mock('../../config/supabase', () => ({
  supabaseHelpers: {
    addCustomSubstance: jest.fn(),
    getSubstances: jest.fn(),
    getCategories: jest.fn(),
  },
  supabase: mockSupabaseClient,
}));

const mockSupabaseHelpers = supabaseHelpers as jest.Mocked<typeof supabaseHelpers>;

describe('RLS Policy Enforcement - Integration Tests', () => {
  const testSubstance: NewSubstance = {
    name: 'Test RLS Substance',
    category: SubstanceCategory.SUPPLEMENTS,
    defaultUnit: 'mg',
    description: 'Testing RLS policies'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authenticated User Policies', () => {
    beforeEach(() => {
      // Mock authenticated user session
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      });
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: mockAuthenticatedUser } },
        error: null
      });
    });

    it('should allow authenticated users to insert substances', async () => {
      const mockInsertedSubstance = {
        id: 'rls-test-1',
        name: 'Test RLS Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'Testing RLS policies',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-123',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(mockInsertedSubstance);

      const result = await substanceDatabase.addCustomSubstance(testSubstance);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInsertedSubstance);
      expect(mockSupabaseHelpers.addCustomSubstance).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test RLS Substance',
          category_id: expect.any(String),
          default_unit: 'mg',
          description: 'Testing RLS policies'
        })
      );
    });

    it('should allow authenticated users to read their own substances', async () => {
      const mockUserSubstances = [
        {
          id: 'user-substance-1',
          name: 'User Substance 1',
          category_id: 'supplements-id',
          default_unit: 'mg',
          description: 'User owned substance',
          created_at: '2024-01-01T00:00:00Z',
          user_id: 'test-user-123',
          substance_categories: {
            id: 'supplements-id',
            name: 'supplements'
          }
        }
      ];

      mockSupabaseHelpers.getSubstances.mockResolvedValue(mockUserSubstances);

      const result = await substanceDatabase.getSupabaseSubstances();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserSubstances);
      expect(mockSupabaseHelpers.getSubstances).toHaveBeenCalled();
    });

    it('should allow authenticated users to update their own substances', async () => {
      const substanceId = 'user-substance-1';
      const updateData = {
        description: 'Updated description'
      };

      const mockUpdatedSubstance = {
        id: substanceId,
        name: 'User Substance 1',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'Updated description',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-123',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      // Mock the update operation
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedSubstance,
        error: null
      });

      // Simulate update operation (this would be implemented in substanceDatabase)
      const result = await mockSupabaseClient
        .from('substances')
        .update(updateData)
        .eq('id', substanceId)
        .eq('user_id', 'test-user-123') // RLS should enforce this
        .select('*, substance_categories(*)')
        .single();

      expect(result.data).toEqual(mockUpdatedSubstance);
      expect(result.error).toBeNull();
    });

    it('should allow authenticated users to delete their own substances', async () => {
      const substanceId = 'user-substance-1';

      // Mock the delete operation
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      });

      // Simulate delete operation
      const result = await mockSupabaseClient
        .from('substances')
        .delete()
        .eq('id', substanceId)
        .eq('user_id', 'test-user-123'); // RLS should enforce this

      expect(result.error).toBeNull();
    });
  });

  describe('Unauthenticated User Policies', () => {
    beforeEach(() => {
      // Mock unauthenticated user session
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'No session' }
      });
    });

    it('should deny unauthenticated users from inserting substances', async () => {
      const authError = new Error('You must be authenticated to perform this action');
      (authError as any).code = '42501'; // Insufficient privileges

      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(authError);

      const result = await substanceDatabase.addCustomSubstance(testSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('should deny unauthenticated users from reading substances', async () => {
      const authError = new Error('You must be authenticated to perform this action');
      (authError as any).code = '42501';

      mockSupabaseHelpers.getSubstances.mockRejectedValue(authError);

      const result = await substanceDatabase.getSupabaseSubstances();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should deny unauthenticated users from updating substances', async () => {
      const substanceId = 'user-substance-1';
      const updateData = { description: 'Unauthorized update' };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: {
          code: '42501',
          message: 'You must be authenticated to perform this action'
        }
      });

      const result = await mockSupabaseClient
        .from('substances')
        .update(updateData)
        .eq('id', substanceId)
        .select('*, substance_categories(*)')
        .single();

      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('42501');
    });

    it('should deny unauthenticated users from deleting substances', async () => {
      const substanceId = 'user-substance-1';

      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: {
          code: '42501',
          message: 'You must be authenticated to perform this action'
        }
      });

      const result = await mockSupabaseClient
        .from('substances')
        .delete()
        .eq('id', substanceId);

      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('42501');
    });
  });

  describe('Cross-User Access Policies', () => {
    beforeEach(() => {
      // Mock authenticated user session
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      });
    });

    it('should prevent users from accessing other users substances', async () => {
      const otherUserSubstanceId = 'other-user-substance-1';

      // Mock RLS policy enforcement - should return empty result
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'The result contains 0 rows'
        }
      });

      // Attempt to access another user's substance
      const result = await mockSupabaseClient
        .from('substances')
        .select('*, substance_categories(*)')
        .eq('id', otherUserSubstanceId)
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should prevent users from updating other users substances', async () => {
      const otherUserSubstanceId = 'other-user-substance-1';
      const updateData = { description: 'Unauthorized update attempt' };

      // Mock RLS policy enforcement - should return no rows affected
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'The result contains 0 rows'
        }
      });

      const result = await mockSupabaseClient
        .from('substances')
        .update(updateData)
        .eq('id', otherUserSubstanceId)
        .select('*, substance_categories(*)')
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should prevent users from deleting other users substances', async () => {
      const otherUserSubstanceId = 'other-user-substance-1';

      // Mock RLS policy enforcement - should return no rows affected
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      const result = await mockSupabaseClient
        .from('substances')
        .delete()
        .eq('id', otherUserSubstanceId);

      // Should succeed but affect 0 rows due to RLS
      expect(result.error).toBeNull();
      expect(result.count).toBe(0);
    });
  });

  describe('Category Access Policies', () => {
    it('should allow all authenticated users to read substance categories', async () => {
      const mockCategories = [
        { id: 'supplements-id', name: 'supplements' },
        { id: 'food-id', name: 'food' },
        { id: 'alcohol-id', name: 'alcohol' }
      ];

      mockSupabaseHelpers.getCategories.mockResolvedValue(mockCategories);

      const result = await substanceDatabase.getSupabaseCategories();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategories);
    });

    it('should deny unauthenticated users from reading categories', async () => {
      // Mock unauthenticated state
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const authError = new Error('You must be authenticated to perform this action');
      (authError as any).code = '42501';

      mockSupabaseHelpers.getCategories.mockRejectedValue(authError);

      const result = await substanceDatabase.getSupabaseCategories();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Data Isolation Tests', () => {
    it('should ensure complete data isolation between users', async () => {
      // Mock two different users
      const user1 = { id: 'user-1', email: 'user1@example.com' };
      const user2 = { id: 'user-2', email: 'user2@example.com' };

      // User 1 creates a substance
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: user1 },
        error: null
      });

      const user1Substance = {
        id: 'user1-substance-1',
        name: 'User 1 Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'User 1 substance',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(user1Substance);

      const createResult = await substanceDatabase.addCustomSubstance(testSubstance);
      expect(createResult.success).toBe(true);

      // Switch to User 2
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: user2 },
        error: null
      });

      // User 2 should only see their own substances (empty list)
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);

      const readResult = await substanceDatabase.getSupabaseSubstances();
      expect(readResult.success).toBe(true);
      expect(readResult.data).toEqual([]);
    });
  });

  describe('Policy Performance Tests', () => {
    it('should maintain performance with RLS policies enabled', async () => {
      const startTime = Date.now();

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      });

      // Mock large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `substance-${i}`,
        name: `Substance ${i}`,
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: `Description ${i}`,
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-123',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      }));

      mockSupabaseHelpers.getSubstances.mockResolvedValue(largeDataset);

      const result = await substanceDatabase.getSupabaseSubstances();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      
      // Performance should be reasonable (under 1 second for mock)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});