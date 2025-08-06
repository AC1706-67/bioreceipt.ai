CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 150),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Canonical substance categories
CREATE TABLE IF NOT EXISTS substance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

-- Substances master table
CREATE TABLE IF NOT EXISTS substances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES substance_categories(id) NOT NULL,
  default_unit TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Substance intakes table
CREATE TABLE IF NOT EXISTS substance_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  substance_id UUID REFERENCES substances(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,2) CHECK (quantity > 0),
  unit TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intake media table (for future photo/video attachments)
CREATE TABLE IF NOT EXISTS intake_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES substance_intakes(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_substances_category_id ON substances(category_id);
CREATE INDEX IF NOT EXISTS idx_substance_intakes_user_id ON substance_intakes(user_id);
CREATE INDEX IF NOT EXISTS idx_substance_intakes_substance_id ON substance_intakes(substance_id);
CREATE INDEX IF NOT EXISTS idx_substance_intakes_timestamp ON substance_intakes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_intake_media_intake_id ON intake_media(intake_id);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_media ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Substance categories policies
DROP POLICY IF EXISTS "Authenticated users can view categories" ON substance_categories;
CREATE POLICY "Authenticated users can view categories" ON substance_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Substances policies
DROP POLICY IF EXISTS "Authenticated users can view substances" ON substances;
CREATE POLICY "Authenticated users can view substances" ON substances
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert substances" ON substances;
CREATE POLICY "Authenticated users can insert substances" ON substances
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Substance intakes policies
DROP POLICY IF EXISTS "Users can view own intakes" ON substance_intakes;
CREATE POLICY "Users can view own intakes" ON substance_intakes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own intakes" ON substance_intakes;
CREATE POLICY "Users can insert own intakes" ON substance_intakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own intakes" ON substance_intakes;
CREATE POLICY "Users can update own intakes" ON substance_intakes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own intakes" ON substance_intakes;
CREATE POLICY "Users can delete own intakes" ON substance_intakes
  FOR DELETE USING (auth.uid() = user_id);

-- Intake media policies
DROP POLICY IF EXISTS "Users can view own intake media" ON intake_media;
CREATE POLICY "Users can view own intake media" ON intake_media
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM substance_intakes WHERE id = intake_id));

DROP POLICY IF EXISTS "Users can insert own intake media" ON intake_media;
CREATE POLICY "Users can insert own intake media" ON intake_media
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM substance_intakes WHERE id = intake_id));

DROP POLICY IF EXISTS "Users can update own intake media" ON intake_media;
CREATE POLICY "Users can update own intake media" ON intake_media
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM substance_intakes WHERE id = intake_id));

DROP POLICY IF EXISTS "Users can delete own intake media" ON intake_media;
CREATE POLICY "Users can delete own intake media" ON intake_media
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM substance_intakes WHERE id = intake_id));

-- Utility function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_substance_intakes_updated_at ON substance_intakes;
CREATE TRIGGER update_substance_intakes_updated_at 
  BEFORE UPDATE ON substance_intakes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert substance categories
INSERT INTO substance_categories (name) VALUES
('alcohol'),
('caffeine'),
('supplements'),
('medications'),
('recreational'),
('food'),
('other')
ON CONFLICT (name) DO NOTHING;

-- Insert default substances with proper category references
INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Beer', sc.id, 'ml', 'Standard beer'
FROM substance_categories sc WHERE sc.name = 'alcohol'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Wine', sc.id, 'ml', 'Wine (red, white, rosé)'
FROM substance_categories sc WHERE sc.name = 'alcohol'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Spirits', sc.id, 'ml', 'Hard liquor (vodka, whiskey, etc.)'
FROM substance_categories sc WHERE sc.name = 'alcohol'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Cocktail', sc.id, 'ml', 'Mixed alcoholic drink'
FROM substance_categories sc WHERE sc.name = 'alcohol'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Coffee', sc.id, 'ml', 'Regular coffee'
FROM substance_categories sc WHERE sc.name = 'caffeine'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Tea', sc.id, 'ml', 'Black, green, or herbal tea'
FROM substance_categories sc WHERE sc.name = 'caffeine'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Energy Drink', sc.id, 'ml', 'Caffeinated energy drink'
FROM substance_categories sc WHERE sc.name = 'caffeine'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Soda', sc.id, 'ml', 'Caffeinated soft drink'
FROM substance_categories sc WHERE sc.name = 'caffeine'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Vitamin D', sc.id, 'IU', 'Vitamin D supplement'
FROM substance_categories sc WHERE sc.name = 'supplements'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Vitamin C', sc.id, 'mg', 'Vitamin C supplement'
FROM substance_categories sc WHERE sc.name = 'supplements'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Multivitamin', sc.id, 'tablet', 'Daily multivitamin'
FROM substance_categories sc WHERE sc.name = 'supplements'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Protein Powder', sc.id, 'scoop', 'Protein supplement'
FROM substance_categories sc WHERE sc.name = 'supplements'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Creatine', sc.id, 'g', 'Creatine supplement'
FROM substance_categories sc WHERE sc.name = 'supplements'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Fish Oil', sc.id, 'capsule', 'Omega-3 supplement'
FROM substance_categories sc WHERE sc.name = 'supplements'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Ibuprofen', sc.id, 'mg', 'Pain reliever'
FROM substance_categories sc WHERE sc.name = 'medications'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Acetaminophen', sc.id, 'mg', 'Pain reliever/fever reducer'
FROM substance_categories sc WHERE sc.name = 'medications'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Aspirin', sc.id, 'mg', 'Pain reliever/blood thinner'
FROM substance_categories sc WHERE sc.name = 'medications'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Antihistamine', sc.id, 'mg', 'Allergy medication'
FROM substance_categories sc WHERE sc.name = 'medications'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Water', sc.id, 'ml', 'Plain water'
FROM substance_categories sc WHERE sc.name = 'food'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Meal', sc.id, 'serving', 'Complete meal'
FROM substance_categories sc WHERE sc.name = 'food'
ON CONFLICT (name) DO NOTHING;

INSERT INTO substances (name, category_id, default_unit, description) 
SELECT 'Snack', sc.id, 'serving', 'Light snack'
FROM substance_categories sc WHERE sc.name = 'food'
ON CONFLICT (name) DO NOTHING;

-- User intake summary function
CREATE OR REPLACE FUNCTION get_user_intake_summary(user_uuid UUID, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  substance_name TEXT,
  category TEXT,
  total_quantity DECIMAL,
  unit TEXT,
  intake_count BIGINT,
  last_intake TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name,
    sc.name,
    SUM(si.quantity) as total_quantity,
    s.default_unit,
    COUNT(*) as intake_count,
    MAX(si.timestamp) as last_intake
  FROM substance_intakes si
  JOIN substances s ON si.substance_id = s.id
  JOIN substance_categories sc ON s.category_id = sc.id
  WHERE si.user_id = user_uuid
    AND si.timestamp >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY s.id, s.name, sc.name, s.default_unit
  ORDER BY last_intake DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_intake_summary(UUID, INTEGER) TO authenticated;