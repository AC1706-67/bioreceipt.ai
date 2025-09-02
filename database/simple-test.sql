-- ============================================================================
-- SUPER SIMPLE SUPABASE TEST
-- ============================================================================
-- Copy and paste this ENTIRE file into your Supabase SQL editor and click RUN
-- This will tell us if your database setup worked correctly
-- ============================================================================

-- Test 1: Check if basic tables exist
SELECT 'TEST 1: Do we have the main tables?' as test_description;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'substances') 
        THEN '✅ substances table exists'
        ELSE '❌ substances table missing'
    END as substances_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intake_logs') 
        THEN '✅ intake_logs table exists'
        ELSE '❌ intake_logs table missing'
    END as intake_logs_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tips') 
        THEN '✅ tips table exists'
        ELSE '❌ tips table missing'
    END as tips_check;

-- Test 2: Check if we have sample data
SELECT 'TEST 2: Do we have sample data?' as test_description;

SELECT 
    (SELECT COUNT(*) FROM substances) as substances_count,
    (SELECT COUNT(*) FROM tips) as tips_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM substances) > 0 
        THEN '✅ We have substances!'
        ELSE '❌ No substances found'
    END as substances_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM tips) > 0 
        THEN '✅ We have tips!'
        ELSE '❌ No tips found'
    END as tips_status;

-- Test 3: Show some sample data
SELECT 'TEST 3: Here are some sample substances:' as test_description;

SELECT name, category, default_unit 
FROM substances 
LIMIT 5;

-- Test 4: Show some sample tips
SELECT 'TEST 4: Here are some sample tips:' as test_description;

SELECT title, category 
FROM tips 
LIMIT 3;

-- Test 5: Check if extensions are working
SELECT 'TEST 5: Are extensions installed?' as test_description;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') 
        THEN '✅ uuid-ossp extension installed'
        ELSE '❌ uuid-ossp extension missing'
    END as uuid_extension_check;

-- Final Result
SELECT 'FINAL RESULT: Your database setup status' as test_description;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('substances', 'intake_logs', 'tips', 'user_profiles')) = 4
        AND (SELECT COUNT(*) FROM substances) > 0
        AND (SELECT COUNT(*) FROM tips) > 0
        THEN '🎉 SUCCESS! Your database is set up correctly!'
        ELSE '⚠️ ISSUE: Something might be missing. Check the results above.'
    END as final_status;