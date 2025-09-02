-- ============================================================================
-- WHAT DO I ACTUALLY HAVE IN MY DATABASE?
-- ============================================================================
-- This will show you exactly what's currently in your Supabase database
-- Copy and paste this ENTIRE file into a NEW SQL editor tab and run it
-- ============================================================================

SELECT '🔍 CHECKING WHAT TABLES EXIST IN YOUR DATABASE...' as status;

-- Show all tables that exist
SELECT 
    '📋 TABLE LIST' as section,
    table_name as table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Count records in each table (if they exist)
SELECT '📊 DATA COUNTS' as section;

-- Check substances table
SELECT 
    'substances' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'substances') 
        THEN (SELECT COUNT(*)::text FROM substances)
        ELSE 'TABLE DOES NOT EXIST'
    END as record_count;

-- Check tips table  
SELECT 
    'tips' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tips') 
        THEN (SELECT COUNT(*)::text FROM tips)
        ELSE 'TABLE DOES NOT EXIST'
    END as record_count;

-- Check intake_logs table
SELECT 
    'intake_logs' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intake_logs') 
        THEN (SELECT COUNT(*)::text FROM intake_logs)
        ELSE 'TABLE DOES NOT EXIST'
    END as record_count;

-- Check user_profiles table
SELECT 
    'user_profiles' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
        THEN (SELECT COUNT(*)::text FROM user_profiles)
        ELSE 'TABLE DOES NOT EXIST'
    END as record_count;

-- Check custom_substances table
SELECT 
    'custom_substances' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_substances') 
        THEN (SELECT COUNT(*)::text FROM custom_substances)
        ELSE 'TABLE DOES NOT EXIST'
    END as record_count;

-- Show some sample data if it exists
SELECT '📝 SAMPLE DATA' as section;

-- Show substances if they exist
SELECT 'SAMPLE SUBSTANCES:' as info;
SELECT name, category, default_unit 
FROM substances 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'substances')
LIMIT 5;

-- Show tips if they exist
SELECT 'SAMPLE TIPS:' as info;
SELECT title, category 
FROM tips 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tips')
LIMIT 3;

-- Check for duplicate tables or weird names
SELECT '🔍 CHECKING FOR UNUSUAL TABLES' as section;

SELECT 
    table_name,
    'FOUND' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN (
        'substances', 'intake_logs', 'tips', 'user_profiles', 
        'custom_substances', 'photo_attachments', 'tip_history',
        'medication_reminders', 'wearable_data', 'ai_responses',
        'user_progress', 'feedback', 'users'
    )
ORDER BY table_name;

-- Final summary
SELECT '🎯 SUMMARY' as section;

WITH table_counts AS (
    SELECT COUNT(*) as total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
data_counts AS (
    SELECT 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'substances') 
             THEN (SELECT COUNT(*) FROM substances) ELSE 0 END as substances_count,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tips') 
             THEN (SELECT COUNT(*) FROM tips) ELSE 0 END as tips_count
)
SELECT 
    CONCAT('You have ', tc.total_tables, ' tables total') as tables_info,
    CONCAT('You have ', dc.substances_count, ' substances') as substances_info,
    CONCAT('You have ', dc.tips_count, ' tips') as tips_info,
    CASE 
        WHEN tc.total_tables >= 5 AND dc.substances_count > 0 AND dc.tips_count > 0
        THEN '✅ Your database looks good!'
        WHEN tc.total_tables > 0 
        THEN '⚠️ You have tables but might be missing data'
        ELSE '❌ No tables found - schema might not have run'
    END as overall_status
FROM table_counts tc, data_counts dc;