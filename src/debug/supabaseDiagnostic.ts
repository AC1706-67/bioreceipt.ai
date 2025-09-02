import { supabase } from '../lib/supabase';

export async function runSupabaseDiagnostic() {
  console.log('🔍 SUPABASE DIAGNOSTIC STARTING...');
  
  // Step 1: Check environment variables
  console.log('📋 Step 1: Environment Variables');
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('SB URL:', url ? `✅ ${url}` : '❌ Missing');
  console.log('SB KEY present?', key ? '✅ Yes' : '❌ No');
  
  if (!url || !key) {
    console.log('❌ FAILED: Missing environment variables');
    return { success: false, error: 'Missing environment variables' };
  }

  // Step 2: Test basic connection
  console.log('\n📡 Step 2: Basic Connection Test');
  try {
    const { data, error } = await supabase.from('tips').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      
      // Check specific error types
      if (error.message.includes('relation "tips" does not exist')) {
        console.log('💡 SOLUTION: Run the database schema in Supabase SQL Editor');
        return { 
          success: false, 
          error: 'Database table missing',
          solution: 'Run database/supabase-production-schema.sql in Supabase SQL Editor'
        };
      }
      
      if (error.message.includes('permission denied') || error.code === 'PGRST301') {
        console.log('💡 SOLUTION: Enable RLS policies');
        return { 
          success: false, 
          error: 'Permission denied - RLS policies needed',
          solution: 'Run supabase/migrations/enable-tips-read.sql in Supabase SQL Editor'
        };
      }
      
      return { success: false, error: error.message };
    }
    
    console.log('✅ Connection successful!');
    console.log('SB health:', { rows: data?.length || 0, error: null });
    
    // Step 3: Test authentication
    console.log('\n🔐 Step 3: Authentication Test');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth session:', authError ? '❌ Error' : '✅ Working');
    
    console.log('\n🎉 DIAGNOSTIC COMPLETE - ALL SYSTEMS GO!');
    return { 
      success: true, 
      data: { connection: true, auth: !authError },
      message: 'Supabase is properly configured and connected!'
    };
    
  } catch (err: any) {
    console.log('❌ Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}