/**
 * SCHEMA CHECKER
 * This will show us what columns actually exist in your database
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpbdmeauwzoyvllvhbjc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYmRtZWF1d3pveXZsbHZoYmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTQ2MDksImV4cCI6MjA2OTY5MDYwOX0.taOdn6KLVswfxqnsns8j1fdrRS7M0oVnS7R4-XQa9HU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('🔍 Checking your database schema...\n');
    
    const tables = ['substances', 'tips', 'intake_logs', 'user_profiles', 'custom_substances'];
    
    for (const table of tables) {
        console.log(`📋 Table: ${table}`);
        try {
            // Try to get one row to see the structure
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`❌ Error: ${error.message}\n`);
                continue;
            }
            
            if (data && data.length > 0) {
                console.log('✅ Columns found:', Object.keys(data[0]).join(', '));
                console.log('📊 Sample data:', data[0]);
            } else {
                // Table exists but is empty, try to insert a test row to see what columns are expected
                console.log('⚠️ Table is empty, trying to determine structure...');
                
                if (table === 'substances') {
                    const { error: insertError } = await supabase
                        .from(table)
                        .insert({ name: 'test' });
                    
                    if (insertError) {
                        console.log('💡 Required columns for substances:', insertError.message);
                    }
                }
            }
        } catch (err) {
            console.log(`❌ Could not access table: ${err.message}`);
        }
        console.log('');
    }
}

checkSchema();