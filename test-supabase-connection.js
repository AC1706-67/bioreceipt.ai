/**
 * SUPABASE CONNECTION TEST
 * Run this to check if your app can connect to your Supabase database
 * 
 * To run this test:
 * 1. Open terminal in your BioReceipt folder
 * 2. Run: node test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials (from your config file)
const SUPABASE_URL = 'https://vpbdmeauwzoyvllvhbjc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYmRtZWF1d3pveXZsbHZoYmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTQ2MDksImV4cCI6MjA2OTY5MDYwOX0.taOdn6KLVswfxqnsns8j1fdrRS7M0oVnS7R4-XQa9HU';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('🔍 TESTING SUPABASE CONNECTION...\n');
    
    try {
        // Test 1: Basic connection
        console.log('📡 Test 1: Basic Connection');
        const { data, error } = await supabase
            .from('substances')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.log('❌ Connection failed:', error.message);
            return;
        }
        
        console.log('✅ Connection successful!');
        console.log(`📊 Found ${data} substances in database\n`);
        
        // Test 2: Check if tables exist and have data
        console.log('📋 Test 2: Checking Tables and Data');
        
        const tables = [
            'substances',
            'tips', 
            'intake_logs',
            'user_profiles',
            'custom_substances'
        ];
        
        for (const table of tables) {
            try {
                const { count, error: tableError } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                if (tableError) {
                    console.log(`❌ ${table}: ${tableError.message}`);
                } else {
                    console.log(`✅ ${table}: ${count || 0} records`);
                }
            } catch (err) {
                console.log(`❌ ${table}: Table might not exist`);
            }
        }
        
        // Test 3: Sample data check
        console.log('\n📝 Test 3: Sample Data');
        
        try {
            const { data: substances, error: substanceError } = await supabase
                .from('substances')
                .select('name, category, default_unit')
                .limit(5);
            
            if (substanceError) {
                console.log('❌ Could not fetch substances:', substanceError.message);
            } else if (substances && substances.length > 0) {
                console.log('✅ Sample substances found:');
                substances.forEach(sub => {
                    console.log(`   - ${sub.name} (${sub.category}) - ${sub.default_unit}`);
                });
            } else {
                console.log('⚠️ No substances found in database');
            }
        } catch (err) {
            console.log('❌ Error fetching sample data:', err.message);
        }
        
        // Test 4: Tips check
        try {
            const { data: tips, error: tipsError } = await supabase
                .from('tips')
                .select('title, category')
                .limit(3);
            
            if (tipsError) {
                console.log('❌ Could not fetch tips:', tipsError.message);
            } else if (tips && tips.length > 0) {
                console.log('\n✅ Sample tips found:');
                tips.forEach(tip => {
                    console.log(`   - ${tip.title} (${tip.category})`);
                });
            } else {
                console.log('\n⚠️ No tips found in database');
            }
        } catch (err) {
            console.log('\n❌ Error fetching tips:', err.message);
        }
        
        // Final result
        console.log('\n🎯 FINAL RESULT:');
        console.log('✅ Your Supabase database connection is working!');
        console.log('✅ Your app should be able to connect to the database');
        console.log('✅ You can now use your app with this database');
        
    } catch (error) {
        console.log('❌ MAJOR ERROR:', error.message);
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('1. Check your Supabase URL and API key');
        console.log('2. Make sure your database schema is set up');
        console.log('3. Check your internet connection');
        console.log('4. Verify your Supabase project is active');
    }
}

// Run the test
testConnection();