/**
 * Quick test to verify Supabase connection
 * Run with: node test-connection.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpbdmeauwzoyvllvhbjc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYmRtZWF1d3pveXZsbHZoYmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTQ2MDksImV4cCI6MjA2OTY5MDYwOX0.taOdn6KLVswfxqnsns8j1fdrRS7M0oVnS7R4-XQa9HU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🧪 Testing BioReceipt.AI Database Connection...\n');

  try {
    // Test 1: Check substance categories
    console.log('1️⃣ Testing substance categories...');
    const { data: categories, error: catError } = await supabase
      .from('substance_categories')
      .select('*')
      .order('name');
    
    if (catError) throw catError;
    console.log(`✅ Found ${categories.length} categories:`, categories.map(c => c.name).join(', '));

    // Test 2: Check substances
    console.log('\n2️⃣ Testing substances...');
    const { data: substances, error: subError } = await supabase
      .from('substances')
      .select(`
        name,
        substance_categories (name)
      `)
      .limit(5);
    
    if (subError) throw subError;
    console.log(`✅ Found ${substances.length} substances (showing first 5):`);
    substances.forEach(s => {
      console.log(`   - ${s.name} (${s.substance_categories.name})`);
    });

    // Test 3: Check total substance count
    console.log('\n3️⃣ Checking total substance count...');
    const { count, error: countError } = await supabase
      .from('substances')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    console.log(`✅ Total substances in database: ${count}`);

    console.log('\n🎉 SUCCESS! Your BioReceipt.AI database is ready to go!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run your app: npm start or expo start');
    console.log('   2. Create a user account');
    console.log('   3. Try logging a substance intake');
    console.log('   4. Check your Supabase dashboard to see the data');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your Supabase project URL');
    console.log('   2. Verify your anon key is correct');
    console.log('   3. Make sure you ran the database schema SQL');
  }
}

testConnection();