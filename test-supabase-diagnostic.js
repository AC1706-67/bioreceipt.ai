// Simple Node.js script to test Supabase connection
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function runDiagnostic() {
  console.log('🔍 SUPABASE DIAGNOSTIC STARTING...');
  
  // Step 1: Check environment variables
  console.log('📋 Step 1: Environment Variables');
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('SB URL:', url ? `✅ ${url}` : '❌ Missing');
  console.log('SB KEY present?', key ? '✅ Yes' : '❌ No');
  
  if (!url || !key) {
    console.log('❌ FAILED: Missing environment variables');
    return;
  }

  // Step 2: Create client and test connection
  console.log('\n📡 Step 2: Basic Connection Test');
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('tips').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      
      // Check specific error types
      if (error.message.includes('relation "tips" does not exist')) {
        console.log('💡 SOLUTION: Run the database schema in Supabase SQL Editor');
        console.log('   File: database/supabase-production-schema.sql');
        return;
      }
      
      if (error.message.includes('permission denied') || error.code === 'PGRST301') {
        console.log('💡 SOLUTION: Enable RLS policies');
        console.log('   Run: alter table tips enable row level security;');
        console.log('   Run: create policy "anon can read tips" on tips for select to anon using (true);');
        return;
      }
      
      console.log('❌ Other error:', error);
      return;
    }
    
    console.log('✅ Connection successful!');
    console.log('SB health:', { rows: data?.length || 0, error: null });
    
    // Step 3: Test authentication
    console.log('\n🔐 Step 3: Authentication Test');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth session:', authError ? '❌ Error' : '✅ Working');
    
    console.log('\n🎉 DIAGNOSTIC COMPLETE - ALL SYSTEMS GO!');
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

runDiagnostic();