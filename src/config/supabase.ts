/**
 * Supabase Configuration
 * Production database setup for BioPulse.AI
 */

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Environment variables - replace with your actual Supabase credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vpbdmeauwzoyvllvhbjc.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYmRtZWF1d3pveXZsbHZoYmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTQ2MDksImV4cCI6MjA2OTY5MDYwOX0.taOdn6KLVswfxqnsns8j1fdrRS7M0oVnS7R4-XQa9HU';

// Supabase client configuration
const supabaseConfig = {
  auth: {
    storage: Platform.OS === 'web' ? undefined : require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
};

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig);

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