CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- BioPulse.AI Core Tables (Substance Tracking Only)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 150),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS substances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN (
    'alcohol', 'caffeine', 'supplements', 'medications', 
    'recreational', 'food', 'other'
  )),
  default_unit TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS substance_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  substance_id UUID REFERENCES substances(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_substance_intakes_user_id ON substance_intakes(user_id);
CREATE INDEX IF NOT EXISTS idx_substance_intakes_timestamp ON substance_intakes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_substance_intakes_substance_id ON substance_intakes(substance_id);
CREATE INDEX IF NOT EXISTS idx_substances_category ON substances(category);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_intakes ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Substances Policies
DROP POLICY IF EXISTS "Authenticated users can view substances" ON substances;
CREATE POLICY "Authenticated users can view substances" ON substances
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert substances" ON substances;
CREATE POLICY "Authenticated users can insert substances" ON substances
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Substance Intakes Policies
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

-- Utility Functions and Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_substance_intakes_updated_at ON substance_intakes;
CREATE TRIGGER update_substance_intakes_updated_at 
  BEFORE UPDATE ON substance_intakes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BioPulse Substance Data (21 substances)
INSERT INTO substances (name, category, default_unit, description) VALUES
('Beer', 'alcohol', 'ml', 'Standard beer'),
('Wine', 'alcohol', 'ml', 'Wine (red, white, rosé)'),
('Spirits', 'alcohol', 'ml', 'Hard liquor (vodka, whiskey, etc.)'),
('Cocktail', 'alcohol', 'ml', 'Mixed alcoholic drink'),
('Coffee', 'caffeine', 'ml', 'Regular coffee'),
('Tea', 'caffeine', 'ml', 'Black, green, or herbal tea'),
('Energy Drink', 'caffeine', 'ml', 'Caffeinated energy drink'),
('Soda', 'caffeine', 'ml', 'Caffeinated soft drink'),
('Vitamin D', 'supplements', 'IU', 'Vitamin D supplement'),
('Vitamin C', 'supplements', 'mg', 'Vitamin C supplement'),
('Multivitamin', 'supplements', 'tablet', 'Daily multivitamin'),
('Protein Powder', 'supplements', 'scoop', 'Protein supplement'),
('Creatine', 'supplements', 'g', 'Creatine supplement'),
('Fish Oil', 'supplements', 'capsule', 'Omega-3 supplement'),
('Ibuprofen', 'medications', 'mg', 'Pain reliever'),
('Acetaminophen', 'medications', 'mg', 'Pain reliever/fever reducer'),
('Aspirin', 'medications', 'mg', 'Pain reliever/blood thinner'),
('Antihistamine', 'medications', 'mg', 'Allergy medication'),
('Water', 'food', 'ml', 'Plain water'),
('Meal', 'food', 'serving', 'Complete meal'),
('Snack', 'food', 'serving', 'Light snack')
ON CONFLICT (name) DO NOTHING;

-- BioPulse Analytics Function
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
    s.category,
    SUM(si.quantity) as total_quantity,
    s.default_unit,
    COUNT(*) as intake_count,
    MAX(si.timestamp) as last_intake
  FROM substance_intakes si
  JOIN substances s ON si.substance_id = s.id
  WHERE si.user_id = user_uuid
    AND si.timestamp >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY s.id, s.name, s.category, s.default_unit
  ORDER BY last_intake DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant Permissions
GRANT EXECUTE ON FUNCTION get_user_intake_summary(UUID, INTEGER) TO authenticated;