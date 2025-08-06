-- Custom Substance Addition - Database Policy Updates
-- Run this SQL in your Supabase SQL editor to enable custom substance creation

-- Enable pgcrypto extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Row Level Security on substances table
ALTER TABLE substances ENABLE ROW LEVEL SECURITY;

-- Add policy to allow authenticated users to insert custom substances
CREATE POLICY "Authenticated users can insert substances" ON substances
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Verify existing policies are still in place
-- This should show the read policy and the new insert policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'substances';