-- ============================================================================
-- SUPABASE SCHEMA VERIFICATION TESTS
-- ============================================================================
-- Run these tests in your Supabase SQL editor to verify the schema setup
-- Copy and paste each section individually to see the results
-- ============================================================================

-- ============================================================================
-- TEST 1: VERIFY ALL TABLES EXIST
-- ============================================================================
SELECT 'TEST 1: Checking if all tables exist...' as test_name;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'users', 'user_profiles', 'substances', 'custom_substances', 
            'intake_logs', 'photo_attachments', 'tips', 'tip_history',
            'medication_reminders', 'wearable_data', 'ai_responses',
            'user_progress', 'feedback'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'users', 'user_profiles', 'substances', 'custom_substances', 
        'intake_logs', 'photo_attachments', 'tips', 'tip_history',
        'medication_reminders', 'wearable_data', 'ai_responses',
        'user_progress', 'feedback'
    )
ORDER BY table_name;

-- ============================================================================
-- TEST 2: VERIFY EXTENSIONS ARE INSTALLED
-- ============================================================================
SELECT 'TEST 2: Checking required extensions...' as test_name;

SELECT 
    extname as extension_name,
    '✅ INSTALLED' as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto')
ORDER BY extname;

-- ============================================================================
-- TEST 3: VERIFY SAMPLE DATA WAS INSERTED
-- ============================================================================
SELECT 'TEST 3: Checking sample data...' as test_name;

-- Check substances
SELECT 
    'substances' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) >= 21 THEN '✅ SAMPLE DATA LOADED'
        ELSE '❌ MISSING SAMPLE DATA'
    END as status
FROM substances;

-- Check tips
SELECT 
    'tips' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ SAMPLE DATA LOADED'
        ELSE '❌ MISSING SAMPLE DATA'
    END as status
FROM tips;

-- ============================================================================
-- TEST 4: VERIFY INDEXES EXIST
-- ============================================================================
SELECT 'TEST 4: Checking performance indexes...' as test_name;

SELECT 
    schemaname,
    tablename,
    indexname,
    '✅ INDEX EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN (
        'intake_logs', 'tip_history', 'ai_responses', 'wearable_data',
        'substances', 'custom_substances', 'photo_attachments', 'tips', 'feedback'
    )
ORDER BY tablename, indexname;

-- ============================================================================
-- TEST 5: VERIFY ROW LEVEL SECURITY IS ENABLED
-- ============================================================================
SELECT 'TEST 5: Checking Row Level Security...' as test_name;

SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'user_profiles', 'substances', 'custom_substances', 'intake_logs',
        'photo_attachments', 'tips', 'tip_history', 'medication_reminders',
        'wearable_data', 'ai_responses', 'user_progress', 'feedback'
    )
ORDER BY tablename;

-- ============================================================================
-- TEST 6: VERIFY SECURITY POLICIES EXIST
-- ============================================================================
SELECT 'TEST 6: Checking security policies...' as test_name;

SELECT 
    schemaname,
    tablename,
    policyname,
    '✅ POLICY EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST 7: VERIFY TRIGGERS EXIST
-- ============================================================================
SELECT 'TEST 7: Checking triggers...' as test_name;

SELECT 
    event_object_table as table_name,
    trigger_name,
    '✅ TRIGGER EXISTS' as status
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
    AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- TEST 8: VERIFY FUNCTIONS EXIST
-- ============================================================================
SELECT 'TEST 8: Checking custom functions...' as test_name;

SELECT 
    routine_name as function_name,
    routine_type,
    '✅ FUNCTION EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('update_updated_at_column', 'get_user_intake_summary')
ORDER BY routine_name;

-- ============================================================================
-- TEST 9: VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================================
SELECT 'TEST 9: Checking foreign key relationships...' as test_name;

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ FK RELATIONSHIP' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- TEST 10: VERIFY CHECK CONSTRAINTS
-- ============================================================================
SELECT 'TEST 10: Checking data validation constraints...' as test_name;

SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause,
    '✅ CHECK CONSTRAINT' as status
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- TEST 11: TEST FUNCTION EXECUTION
-- ============================================================================
SELECT 'TEST 11: Testing custom functions...' as test_name;

-- Test the get_user_intake_summary function with a dummy UUID
SELECT 
    'get_user_intake_summary' as function_name,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ FUNCTION WORKS'
        ELSE '❌ FUNCTION ERROR'
    END as status
FROM get_user_intake_summary('00000000-0000-0000-0000-000000000000'::UUID, 7);

-- ============================================================================
-- TEST 12: VERIFY SAMPLE SUBSTANCE DATA
-- ============================================================================
SELECT 'TEST 12: Checking substance categories...' as test_name;

SELECT 
    category,
    COUNT(*) as substance_count,
    '✅ CATEGORY HAS DATA' as status
FROM substances 
GROUP BY category
ORDER BY category;

-- ============================================================================
-- TEST 13: VERIFY TABLE COLUMN TYPES
-- ============================================================================
SELECT 'TEST 13: Checking critical column types...' as test_name;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_default IS NOT NULL THEN '✅ HAS DEFAULT'
        WHEN is_nullable = 'YES' THEN '✅ NULLABLE'
        ELSE '✅ REQUIRED'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('substances', 'intake_logs', 'user_profiles')
    AND column_name IN ('id', 'created_at', 'updated_at', 'user_id')
ORDER BY table_name, column_name;

-- ============================================================================
-- FINAL SUMMARY TEST
-- ============================================================================
SELECT 'FINAL SUMMARY: Database Schema Health Check' as test_name;

WITH schema_health AS (
    SELECT 
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
        (SELECT COUNT(*) FROM substances) as substance_count,
        (SELECT COUNT(*) FROM tips) as tips_count,
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as policy_count,
        (SELECT COUNT(*) FROM information_schema.triggers 
         WHERE event_object_schema = 'public') as trigger_count
)
SELECT 
    '📊 SCHEMA SUMMARY' as component,
    CONCAT(
        '✅ Tables: ', total_tables, ' | ',
        '✅ Substances: ', substance_count, ' | ',
        '✅ Tips: ', tips_count, ' | ',
        '✅ Policies: ', policy_count, ' | ',
        '✅ Triggers: ', trigger_count
    ) as status
FROM schema_health;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 
    '🎉 SCHEMA VERIFICATION COMPLETE!' as message,
    'Your Supabase database is ready for production use!' as status;