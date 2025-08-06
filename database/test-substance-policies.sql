-- Test script for custom substance policies
-- Run this after applying the policies to verify they work

-- Test 1: Verify RLS is enabled on substances table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'substances';

-- Test 2: Check all policies on substances table
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'substances'
ORDER BY policyname;

-- Test 3: Attempt to insert a test substance (should work for authenticated users)
-- Note: This will only work when run by an authenticated user in Supabase
INSERT INTO substances (name, category, default_unit, description) 
VALUES ('Test Custom Substance', 'other', 'unit', 'Test substance for policy verification')
RETURNING id, name, category, default_unit, created_at;

-- Test 4: Verify the test substance was inserted and is readable
SELECT id, name, category, default_unit, description, created_at
FROM substances 
WHERE name = 'Test Custom Substance';

-- Clean up test data
DELETE FROM substances WHERE name = 'Test Custom Substance';