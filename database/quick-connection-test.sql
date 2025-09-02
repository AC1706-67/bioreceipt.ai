-- ============================================================================
-- QUICK CONNECTION TEST
-- ============================================================================
-- Run this simple test first to verify basic connectivity and setup
-- ============================================================================

-- Test 1: Basic table existence
SELECT 'Quick Test: Checking core tables...' as test;

SELECT 
    COUNT(CASE WHEN table_name = 'substances' THEN 1 END) as substances_table,
    COUNT(CASE WHEN table_name = 'intake_logs' THEN 1 END) as intake_logs_table,
    COUNT(CASE WHEN table_name = 'user_profiles' THEN 1 END) as user_profiles_table,
    COUNT(CASE WHEN table_name = 'tips' THEN 1 END) as tips_table
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Test 2: Sample data check
SELECT 'Quick Test: Sample data verification...' as test;

SELECT 
    (SELECT COUNT(*) FROM substances) as substances_count,
    (SELECT COUNT(*) FROM tips) as tips_count;

-- Test 3: Function test
SELECT 'Quick Test: Function availability...' as test;

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name = 'get_user_intake_summary';

-- Test 4: Show some sample substances
SELECT 'Quick Test: Sample substances...' as test;

SELECT 
    name,
    category,
    default_unit
FROM substances 
LIMIT 5;

-- Success message
SELECT '✅ QUICK TEST COMPLETE - Your database is working!' as result;