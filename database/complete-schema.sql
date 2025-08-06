CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- BioPulse.AI Core Tables (Substance Tracking)
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

-- Legacy Health Tips Tables (from original HealthyTipApp)
CREATE TABLE IF NOT EXISTS health_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  difficulty VARCHAR(20) DEFAULT 'easy',
  estimated_read_time INTEGER DEFAULT 2,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  tip_id UUID REFERENCES health_tips(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id VARCHAR(100),
  UNIQUE(user_id, tip_id, action)
);

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_tips_completed INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_substance_intakes_user_id ON substance_intakes(user_id);
CREATE INDEX IF NOT EXISTS idx_substance_intakes_timestamp ON substance_intakes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_substance_intakes_substance_id ON substance_intakes(substance_id);
CREATE INDEX IF NOT EXISTS idx_substances_category ON substances(category);
CREATE INDEX IF NOT EXISTS idx_health_tips_category ON health_tips(category);
CREATE INDEX IF NOT EXISTS idx_health_tips_active ON health_tips(is_active);
CREATE INDEX IF NOT EXISTS idx_user_engagements_user_id ON user_engagements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagements_tip_id ON user_engagements(tip_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

-- Health Tips Policies
DROP POLICY IF EXISTS "Authenticated users can view health tips" ON health_tips;
CREATE POLICY "Authenticated users can view health tips" ON health_tips
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

DROP POLICY IF EXISTS "Admins can manage health tips" ON health_tips;
CREATE POLICY "Admins can manage health tips" ON health_tips
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- User Engagements Policies
DROP POLICY IF EXISTS "Users can view own engagements" ON user_engagements;
CREATE POLICY "Users can view own engagements" ON user_engagements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own engagements" ON user_engagements;
CREATE POLICY "Users can insert own engagements" ON user_engagements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Progress Policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
CREATE POLICY "Users can update own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

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

DROP TRIGGER IF EXISTS update_health_tips_updated_at ON health_tips;
CREATE TRIGGER update_health_tips_updated_at 
  BEFORE UPDATE ON health_tips 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at 
  BEFORE UPDATE ON user_progress 
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

-- Health Tips Analytics View (if you want to keep health tips functionality)
CREATE OR REPLACE VIEW health_tips_extended AS
SELECT 
  ht.*,
  COALESCE(engagement_stats.view_count, 0) as view_count,
  COALESCE(engagement_stats.like_count, 0) as like_count,
  COALESCE(engagement_stats.bookmark_count, 0) as bookmark_count,
  COALESCE(engagement_stats.completion_count, 0) as completion_count
FROM health_tips ht
LEFT JOIN (
  SELECT 
    tip_id,
    COUNT(CASE WHEN action = 'view' THEN 1 END) as view_count,
    COUNT(CASE WHEN action = 'like' THEN 1 END) as like_count,
    COUNT(CASE WHEN action = 'bookmark' THEN 1 END) as bookmark_count,
    COUNT(CASE WHEN action = 'complete' THEN 1 END) as completion_count
  FROM user_engagements
  GROUP BY tip_id
) engagement_stats ON ht.id = engagement_stats.tip_id;

-- Grant Permissions
GRANT EXECUTE ON FUNCTION get_user_intake_summary(UUID, INTEGER) TO authenticated;
GRANT SELECT ON health_tips_extended TO authenticated;