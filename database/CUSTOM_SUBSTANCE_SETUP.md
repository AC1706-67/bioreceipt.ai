# Custom Substance Addition - Database Setup

This guide explains how to set up the database policies required for the custom substance addition feature.

## Prerequisites

- Access to your Supabase project dashboard
- SQL Editor access in Supabase

## Setup Steps

### 1. Apply Database Policies

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `custom-substance-policies.sql`
4. Click "Run" to execute the SQL

This will:
- Enable the `pgcrypto` extension (if not already enabled)
- Enable Row Level Security on the `substances` table
- Add an INSERT policy allowing authenticated users to create substances

### 2. Verify Setup (Optional)

1. In the SQL Editor, copy and paste the contents of `test-substance-policies.sql`
2. Click "Run" to execute the test script
3. Verify that:
   - RLS is enabled on the substances table
   - Both SELECT and INSERT policies exist
   - Test substance insertion works
   - Test substance is readable
   - Test cleanup completes successfully

### 3. Expected Results

After setup, your `substances` table should have:

**Row Level Security**: Enabled

**Policies**:
- `Authenticated users can view substances` (SELECT) - existing
- `Authenticated users can insert substances` (INSERT) - new

## Security Notes

- Only authenticated users can insert new substances
- All authenticated users can read all substances (global catalog)
- No user-specific ownership - substances are shared across all users
- Database constraints prevent duplicate substance names

## Troubleshooting

### Policy Already Exists Error
If you see "policy already exists", the setup was previously completed. You can verify by running the test script.

### Permission Denied Error
Ensure you're running the SQL as a user with sufficient privileges (typically the project owner or a user with RLS bypass).

### RLS Policy Violations
If inserts fail with RLS violations, verify that:
1. RLS is enabled on the substances table
2. The INSERT policy exists and is correctly configured
3. The user attempting the insert is authenticated

## Next Steps

Once the database setup is complete, you can proceed with implementing the frontend components for custom substance addition.