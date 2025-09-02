# BioReceipt.AI Supabase Setup Guide

## ✅ Database Schema Complete
Your database is now set up with all tables and 21 substances ready to go!

## 🔧 Next Steps: Connect Your App

### 1. Update Supabase Configuration

In `src/config/supabase.ts`, replace these placeholders with your actual values:

```typescript
const SUPABASE_URL = 'YOUR_NEW_PROJECT_URL_HERE';  // Replace with your project URL
const SUPABASE_ANON_KEY = 'YOUR_NEW_ANON_KEY_HERE'; // Replace with your anon key
```

**Where to find these:**
- Go to your Supabase project dashboard
- Settings → API
- Copy **Project URL** and **anon public** key

### 2. Test Your Connection

Run your app and try:
- Creating a user account
- Logging a substance intake
- Viewing your intake history

### 3. Verify Database Setup

In Supabase dashboard, check:
- **Table Editor** → Should see 4 tables: `user_profiles`, `substance_categories`, `substances`, `substance_intakes`
- **substances** table → Should have 21 rows (Beer, Wine, Coffee, etc.)
- **substance_categories** table → Should have 7 categories (alcohol, caffeine, etc.)

## 🚀 Ready to Go!

Your BioReceipt.AI database is production-ready with:
- ✅ User authentication & profiles
- ✅ 21 pre-loaded substances
- ✅ Custom substance addition capability
- ✅ Secure Row Level Security policies
- ✅ Performance indexes
- ✅ Analytics functions

## 🔍 Quick Test

Try this in your Supabase SQL editor to verify everything works:

```sql
-- Check substances are loaded
SELECT s.name, sc.name as category 
FROM substances s 
JOIN substance_categories sc ON s.category_id = sc.id 
ORDER BY sc.name, s.name;
```

Should return 21 substances organized by category!