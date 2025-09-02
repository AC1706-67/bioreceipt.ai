# 🚀 Supabase Setup for Beginners - BioReceipt.AI

## 📋 **Step-by-Step Setup (30 minutes)**

### **Step 1: Create Supabase Account (5 minutes)**

1. **Go to**: https://supabase.com
2. **Click**: "Start your project" 
3. **Sign up** with GitHub or email
4. **Create new project**:
   - Project name: `BioReceipt-ai`
   - Database password: `YourSecurePassword123!` (save this!)
   - Region: Choose closest to you
5. **Wait 2-3 minutes** for project to be ready

### **Step 2: Get Your Keys (2 minutes)**

1. **In Supabase dashboard**, click "Settings" (gear icon)
2. **Click "API"** in left sidebar
3. **Copy these 2 values** (you'll need them):
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

### **Step 3: Create Your Database (10 minutes)**

1. **In Supabase dashboard**, click "SQL Editor" in left sidebar
2. **Click "New query"**
3. **Copy and paste this ENTIRE script** into the editor:

```sql
-- BioReceipt.AI Database Setup Script
-- Copy and paste this entire script into Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create substances table
CREATE TABLE public.substances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  common_units TEXT[] DEFAULT ARRAY['mg', 'ml', 'tablets'],
  description TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create substance_intakes table
CREATE TABLE public.substance_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  substance_id UUID REFERENCES public.substances(id) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  intake_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default substances
INSERT INTO public.substances (name, category, common_units, description) VALUES
('Aspirin', 'medication', ARRAY['mg', 'tablets'], 'Pain reliever and anti-inflammatory'),
('Vitamin D', 'supplement', ARRAY['IU', 'mcg', 'tablets'], 'Essential vitamin for bone health'),
('Vitamin C', 'supplement', ARRAY['mg', 'tablets'], 'Antioxidant vitamin for immune support'),
('Ibuprofen', 'medication', ARRAY['mg', 'tablets'], 'Anti-inflammatory pain reliever'),
('Multivitamin', 'supplement', ARRAY['tablets', 'capsules'], 'Daily vitamin supplement'),
('Caffeine', 'stimulant', ARRAY['mg', 'cups'], 'Stimulant found in coffee and tea'),
('Water', 'hydration', ARRAY['ml', 'oz', 'glasses'], 'Essential for hydration'),
('Protein Powder', 'supplement', ARRAY['scoops', 'g'], 'Protein supplement for fitness');

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substance_intakes ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- User profiles: users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Substances: everyone can read, only authenticated users can add custom ones
CREATE POLICY "Anyone can view substances" ON public.substances
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add custom substances" ON public.substances
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND is_custom = true);

-- Substance intakes: users can only see/edit their own intakes
CREATE POLICY "Users can view own intakes" ON public.substance_intakes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intakes" ON public.substance_intakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intakes" ON public.substance_intakes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own intakes" ON public.substance_intakes
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_substance_intakes_user_id ON public.substance_intakes(user_id);
CREATE INDEX idx_substance_intakes_intake_time ON public.substance_intakes(intake_time);
CREATE INDEX idx_substances_category ON public.substances(category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_substance_intakes_updated_at BEFORE UPDATE ON public.substance_intakes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. **Click "RUN"** button (bottom right)
5. **Wait for "Success"** message (should take 10-20 seconds)

### **Step 4: Configure Your App (5 minutes)**

1. **In your project folder**, copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. **Open the `.env` file** and replace these lines:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Paste your actual values** from Step 2

### **Step 5: Test Connection (5 minutes)**

1. **Run this command** in your project folder:
   ```bash
   node test-connection.js
   ```

2. **You should see**: "✅ Supabase connection successful!"

## 🎉 **You're Done!**

Your database is now ready with:
- ✅ User authentication system
- ✅ Substance database (8 default substances)
- ✅ Intake logging system
- ✅ Security policies (users can only see their own data)
- ✅ Performance optimizations

## 🧪 **Test Your Setup**

1. **Start your app**:
   ```bash
   npm start
   ```

2. **Try these features**:
   - Create an account
   - Log a substance intake
   - View your intake history

## 🆘 **If Something Goes Wrong**

### **Common Issues:**

**"relation does not exist"**
- Go back to SQL Editor
- Make sure the entire script ran successfully
- Look for any red error messages

**"Invalid API key"**
- Double-check your `.env` file
- Make sure you copied the keys correctly
- No extra spaces or quotes

**"Connection failed"**
- Check your internet connection
- Verify the project URL is correct
- Make sure your Supabase project is active

### **Need Help?**
1. Check the Supabase dashboard for error messages
2. Look at the browser console for errors
3. Make sure all the tables were created in the "Table Editor"

## 🚀 **Next Steps**

Once this works, you can:
1. Deploy your app to Expo
2. Add more substances
3. Customize the interface
4. Add photo attachments

**You're now ready to launch your BioReceipt.AI app!** 🎉