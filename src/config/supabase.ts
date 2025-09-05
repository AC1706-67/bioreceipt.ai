/**
 * Supabase Configuration
 * Production database setup for BioReceipt.AI
 */

import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Environment variables - loaded from @env (react-native-dotenv)
console.log('[Supabase] Environment check:', {
  SUPABASE_URL: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 20)}...` : 'MISSING',
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
});

const isValidConfig = SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL !== 'your_supabase_url_here' && 
  SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here';

if (!isValidConfig) {
  console.warn('[Supabase] Using placeholder configuration. Please update .env with real Supabase credentials.');
}

// Supabase client configuration
const supabaseConfig = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
};

// Create Supabase client (with fallback for invalid config)
export const supabase = isValidConfig 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig)
  : (undefined as unknown as ReturnType<typeof createClient>);

// Database types (generated from Supabase)
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          name: string;
          age: number | null;
          gender: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          age?: number | null;
          gender?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          age?: number | null;
          gender?: string | null;
          updated_at?: string;
        };
      };
      substance_categories: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      substances: {
        Row: {
          id: string;
          name: string;
          category_id: string;
          default_unit: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id: string;
          default_unit: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category_id?: string;
          default_unit?: string;
          description?: string | null;
        };
      };
      substance_intakes: {
        Row: {
          id: string;
          user_id: string;
          substance_id: string;
          quantity: number;
          unit: string;
          timestamp: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          substance_id: string;
          quantity: number;
          unit: string;
          timestamp: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          substance_id?: string;
          quantity?: number;
          unit?: string;
          timestamp?: string;
          notes?: string | null;
          updated_at?: string;
        };
      };
      intake_media: {
        Row: {
          id: string;
          intake_id: string;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          intake_id: string;
          url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          intake_id?: string;
          url?: string;
        };
      };
    };
  };
}

// Helper functions for common operations
export const supabaseHelpers = {
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Get user profile
   */
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create or update user profile
   */
  async upsertUserProfile(profile: Database['public']['Tables']['user_profiles']['Insert']) {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profile)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get all substance categories
   */
  async getSubstanceCategories() {
    const { data, error } = await supabase
      .from('substance_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  /**
   * Get all substances with categories
   */
  async getSubstances() {
    const { data, error } = await supabase
      .from('substances')
      .select(`
        *,
        substance_categories (
          id,
          name
        )
      `)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  /**
   * Add custom substance
   */
  async addCustomSubstance(substance: Database['public']['Tables']['substances']['Insert']) {
    const { data, error } = await supabase
      .from('substances')
      .insert(substance)
      .select(`
        *,
        substance_categories (
          id,
          name
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Log substance intake
   */
  async logIntake(intake: Database['public']['Tables']['substance_intakes']['Insert']) {
    const { data, error } = await supabase
      .from('substance_intakes')
      .insert(intake)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get user's intake history
   */
  async getIntakeHistory(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('substance_intakes')
      .select(`
        *,
        substances (
          name,
          category_id,
          default_unit,
          substance_categories (
            name
          )
        )
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  /**
   * Update intake entry
   */
  async updateIntake(id: string, updates: Database['public']['Tables']['substance_intakes']['Update']) {
    const { data, error } = await supabase
      .from('substance_intakes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete intake entry
   */
  async deleteIntake(id: string) {
    const { error } = await supabase
      .from('substance_intakes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Add media to intake (for future photo/video feature)
   */
  async addIntakeMedia(media: Database['public']['Tables']['intake_media']['Insert']) {
    const { data, error } = await supabase
      .from('intake_media')
      .insert(media)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get media for intake (for future photo/video feature)
   */
  async getIntakeMedia(intakeId: string) {
    const { data, error } = await supabase
      .from('intake_media')
      .select('*')
      .eq('intake_id', intakeId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete intake media (for future photo/video feature)
   */
  async deleteIntakeMedia(id: string) {
    const { error } = await supabase
      .from('intake_media')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Export configured client
export default supabase;
