/**
 * DATABASE SETUP SCRIPT
 * This script will set up your Supabase database with the correct schema and sample data
 * 
 * To run: node setup-database.js
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://vpbdmeauwzoyvllvhbjc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYmRtZWF1d3pveXZsbHZoYmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTQ2MDksImV4cCI6MjA2OTY5MDYwOX0.taOdn6KLVswfxqnsns8j1fdrRS7M0oVnS7R4-XQa9HU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupDatabase() {
    console.log('🚀 Setting up your database...\n');
    
    try {
        // 1. Add sample substances
        console.log('📦 Adding sample substances...');
        const substances = [
            { name: 'Coffee', default_unit: 'ml', category: 'caffeine', description: 'Regular coffee' },
            { name: 'Tea', default_unit: 'ml', category: 'caffeine', description: 'Black, green, or herbal tea' },
            { name: 'Water', default_unit: 'ml', category: 'food', description: 'Plain water' },
            { name: 'Beer', default_unit: 'ml', category: 'alcohol', description: 'Standard beer' },
            { name: 'Wine', default_unit: 'ml', category: 'alcohol', description: 'Wine (red, white, rosé)' },
            { name: 'Vitamin D', default_unit: 'IU', category: 'supplements', description: 'Vitamin D supplement' },
            { name: 'Multivitamin', default_unit: 'tablet', category: 'supplements', description: 'Daily multivitamin' },
            { name: 'Ibuprofen', default_unit: 'mg', category: 'medications', description: 'Pain reliever' }
        ];

        for (const substance of substances) {
            const { error } = await supabase
                .from('substances')
                .upsert(substance, { onConflict: 'name' });
            
            if (error) {
                console.log(`⚠️ Could not add ${substance.name}:`, error.message);
            } else {
                console.log(`✅ Added ${substance.name}`);
            }
        }

        // 2. Add sample health tips
        console.log('\n💡 Adding sample health tips...');
        const tips = [
            {
                title: 'Stay Hydrated',
                content: 'Drink at least 8 glasses of water daily to maintain optimal health. Water helps regulate body temperature, transport nutrients, and remove waste.',
                prompt: 'Remember to drink water regularly throughout the day',
                category: 'hydration'
            },
            {
                title: 'Get Quality Sleep',
                content: 'Aim for 7-9 hours of sleep each night for better physical and mental health. Quality sleep improves memory, immune function, and mood.',
                prompt: 'Establish a consistent bedtime routine',
                category: 'sleep'
            },
            {
                title: 'Take Deep Breaths',
                content: 'Practice deep breathing exercises to reduce stress and improve focus. Deep breathing activates your parasympathetic nervous system.',
                prompt: 'Take 5 deep breaths when feeling overwhelmed',
                category: 'meditation'
            },
            {
                title: 'Move Your Body',
                content: 'Incorporate at least 30 minutes of physical activity into your daily routine. Regular exercise improves cardiovascular health and mental wellbeing.',
                prompt: 'Take a short walk or do some stretching',
                category: 'exercise'
            },
            {
                title: 'Eat Mindfully',
                content: 'Pay attention to your food choices and eat slowly to improve digestion. Mindful eating helps you recognize hunger and fullness cues.',
                prompt: 'Focus on your meal without distractions',
                category: 'nutrition'
            }
        ];

        for (const tip of tips) {
            const { error } = await supabase
                .from('tips')
                .upsert(tip, { onConflict: 'title' });
            
            if (error) {
                console.log(`⚠️ Could not add tip "${tip.title}":`, error.message);
            } else {
                console.log(`✅ Added tip: ${tip.title}`);
            }
        }

        // 3. Test the setup
        console.log('\n🧪 Testing database setup...');
        
        const { data: substanceCount } = await supabase
            .from('substances')
            .select('*', { count: 'exact', head: true });
        
        const { data: tipCount } = await supabase
            .from('tips')
            .select('*', { count: 'exact', head: true });

        console.log(`✅ Database now has ${substanceCount} substances`);
        console.log(`✅ Database now has ${tipCount} tips`);

        console.log('\n🎉 DATABASE SETUP COMPLETE!');
        console.log('✅ Your app should now work properly');
        console.log('✅ You can start logging substances and viewing tips');
        
    } catch (error) {
        console.log('❌ Setup failed:', error.message);
        console.log('\n🔧 Try the following:');
        console.log('1. Check your internet connection');
        console.log('2. Verify your Supabase project is active');
        console.log('3. Make sure you have the correct permissions');
    }
}

// Run the setup
setupDatabase();