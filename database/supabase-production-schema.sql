-- ============================================================================
-- BIOPULSE PRODUCTION DATABASE SCHEMA FOR SUPABASE
-- ============================================================================
-- This schema is optimized for production use with Supabase
-- Copy and paste this entire file into your Supabase SQL editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. Users (extends Supabase auth.users)
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User Profiles (additional user data)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 150),
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Predefined Substances
CREATE TABLE substances (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    default_unit TEXT NOT NULL,  -- e.g. 'mg','ml','pill'
    category    TEXT NOT NULL CHECK (category IN (
        'alcohol', 'caffeine', 'supplements', 'medications', 
        'recreational', 'food', 'other'
    )),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Custom Substances (user-created)
CREATE TABLE custom_substances (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    unit          TEXT NOT NULL,
    category      TEXT NOT NULL DEFAULT 'other',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

-- 5. Intake Logs
CREATE TABLE intake_logs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    substance_id     UUID REFERENCES substances(id),
    custom_substance_id UUID REFERENCES custom_substances(id),
    dosage           NUMERIC NOT NULL CHECK (dosage > 0),
    unit             TEXT NOT NULL,
    notes            TEXT,
    logged_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Ensure either substance_id OR custom_substance_id is set, not both
    CHECK (
        (substance_id IS NOT NULL AND custom_substance_id IS NULL) OR
        (substance_id IS NULL AND custom_substance_id IS NOT NULL)
    )
);

-- 6. Photo Attachments
CREATE TABLE photo_attachments (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intake_log_id  UUID REFERENCES intake_logs(id) ON DELETE CASCADE,
    url            TEXT NOT NULL,
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Health Tips
CREATE TABLE tips (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    prompt       TEXT NOT NULL,
    category     TEXT,         -- e.g. 'hydration','sleep','meditation'
    image_url    TEXT,
    tags         TEXT[],
    difficulty   TEXT DEFAULT 'easy',
    estimated_read_time INTEGER DEFAULT 2,
    is_active    BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tip History (which user saw/interacted)
CREATE TABLE tip_history (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tip_id         UUID REFERENCES tips(id) ON DELETE CASCADE,
    shown_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    interacted     BOOLEAN NOT NULL DEFAULT FALSE,
    action         TEXT, -- 'view', 'like', 'bookmark', 'complete'
    UNIQUE(user_id, tip_id, action)
);

-- 9. Medication Reminders
CREATE TABLE medication_reminders (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    medication     TEXT NOT NULL,
    dosage         NUMERIC NOT NULL CHECK (dosage > 0),
    unit           TEXT NOT NULL,
    schedule_cron  TEXT NOT NULL,   -- e.g. '0 9 * * *' or ISO8601 times
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Wearable Data
CREATE TABLE wearable_data (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider       TEXT NOT NULL,    -- e.g. 'apple_health','google_fit'
    data_type      TEXT NOT NULL,    -- e.g. 'heart_rate','steps'
    value          NUMERIC NOT NULL,
    recorded_at    TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. AI Service Logs
CREATE TABLE ai_responses (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_payload  JSONB NOT NULL,
    response_payload JSONB NOT NULL,
    provider         TEXT NOT NULL,
    confidence_score NUMERIC,         -- optional
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. User Progress Tracking
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_tips_completed INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Feedback System
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tip_id UUID REFERENCES tips(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Intake logs indexes
CREATE INDEX idx_intake_logs_user_id ON intake_logs(user_id, logged_at DESC);
CREATE INDEX idx_intake_logs_substance_id ON intake_logs(substance_id);
CREATE INDEX idx_intake_logs_custom_substance_id ON intake_logs(custom_substance_id);
CREATE INDEX idx_intake_logs_logged_at ON intake_logs(logged_at DESC);

-- Tip history indexes
CREATE INDEX idx_tip_history_user_id ON tip_history(user_id, shown_at DESC);
CREATE INDEX idx_tip_history_tip_id ON tip_history(tip_id);

-- AI responses indexes
CREATE INDEX idx_ai_responses_user_id ON ai_responses(user_id, created_at DESC);
CREATE INDEX idx_ai_responses_provider ON ai_responses(provider);

-- Wearable data indexes
CREATE INDEX idx_wearable_data_user_id ON wearable_data(user_id, recorded_at DESC);
CREATE INDEX idx_wearable_data_type ON wearable_data(data_type, recorded_at DESC);

-- Substances indexes
CREATE INDEX idx_substances_category ON substances(category);
CREATE INDEX idx_substances_name ON substances(name);

-- Custom substances indexes
CREATE INDEX idx_custom_substances_user_id ON custom_substances(user_id);

-- Photo attachments indexes
CREATE INDEX idx_photo_attachments_intake_log_id ON photo_attachments(intake_log_id);

-- Tips indexes
CREATE INDEX idx_tips_category ON tips(category);
CREATE INDEX idx_tips_active ON tips(is_active);

-- Feedback indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_tip_id ON feedback(tip_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Substances Policies (public read)
CREATE POLICY "Authenticated users can view substances" ON substances
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert substances" ON substances
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Custom Substances Policies
CREATE POLICY "Users can manage own custom substances" ON custom_substances
    FOR ALL USING (auth.uid() = user_id);

-- Intake Logs Policies
CREATE POLICY "Users can manage own intake logs" ON intake_logs
    FOR ALL USING (auth.uid() = user_id);

-- Photo Attachments Policies
CREATE POLICY "Users can manage own photo attachments" ON photo_attachments
    FOR ALL USING (auth.uid() = (SELECT user_id FROM intake_logs WHERE id = intake_log_id));

-- Tips Policies
CREATE POLICY "Authenticated users can view active tips" ON tips
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Tip History Policies
CREATE POLICY "Users can manage own tip history" ON tip_history
    FOR ALL USING (auth.uid() = user_id);

-- Medication Reminders Policies
CREATE POLICY "Users can manage own medication reminders" ON medication_reminders
    FOR ALL USING (auth.uid() = user_id);

-- Wearable Data Policies
CREATE POLICY "Users can manage own wearable data" ON wearable_data
    FOR ALL USING (auth.uid() = user_id);

-- AI Responses Policies
CREATE POLICY "Users can view own AI responses" ON ai_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI responses" ON ai_responses
    FOR INSERT WITH CHECK (true);

-- User Progress Policies
CREATE POLICY "Users can manage own progress" ON user_progress
    FOR ALL USING (auth.uid() = user_id);

-- Feedback Policies
CREATE POLICY "Users can manage own feedback" ON feedback
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trigger_update_intake_logs_updated_at
    BEFORE UPDATE ON intake_logs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trigger_update_tips_updated_at
    BEFORE UPDATE ON tips
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trigger_update_medication_reminders_updated_at
    BEFORE UPDATE ON medication_reminders
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trigger_update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Get user intake summary
CREATE OR REPLACE FUNCTION get_user_intake_summary(user_uuid UUID, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    substance_name TEXT,
    category TEXT,
    total_quantity NUMERIC,
    unit TEXT,
    intake_count BIGINT,
    last_intake TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(s.name, cs.name) as substance_name,
        COALESCE(s.category, cs.category) as category,
        SUM(il.dosage) as total_quantity,
        COALESCE(s.default_unit, cs.unit) as unit,
        COUNT(*) as intake_count,
        MAX(il.logged_at) as last_intake
    FROM intake_logs il
    LEFT JOIN substances s ON il.substance_id = s.id
    LEFT JOIN custom_substances cs ON il.custom_substance_id = cs.id
    WHERE il.user_id = user_uuid
        AND il.logged_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY s.id, s.name, s.category, s.default_unit, cs.id, cs.name, cs.category, cs.unit
    ORDER BY last_intake DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_intake_summary(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert predefined substances
INSERT INTO substances (name, default_unit, category, description) VALUES
('Beer', 'ml', 'alcohol', 'Standard beer'),
('Wine', 'ml', 'alcohol', 'Wine (red, white, rosé)'),
('Spirits', 'ml', 'alcohol', 'Hard liquor (vodka, whiskey, etc.)'),
('Cocktail', 'ml', 'alcohol', 'Mixed alcoholic drink'),
('Coffee', 'ml', 'caffeine', 'Regular coffee'),
('Tea', 'ml', 'caffeine', 'Black, green, or herbal tea'),
('Energy Drink', 'ml', 'caffeine', 'Caffeinated energy drink'),
('Soda', 'ml', 'caffeine', 'Caffeinated soft drink'),
('Vitamin D', 'IU', 'supplements', 'Vitamin D supplement'),
('Vitamin C', 'mg', 'supplements', 'Vitamin C supplement'),
('Multivitamin', 'tablet', 'supplements', 'Daily multivitamin'),
('Protein Powder', 'scoop', 'supplements', 'Protein supplement'),
('Creatine', 'g', 'supplements', 'Creatine supplement'),
('Fish Oil', 'capsule', 'supplements', 'Omega-3 supplement'),
('Ibuprofen', 'mg', 'medications', 'Pain reliever'),
('Acetaminophen', 'mg', 'medications', 'Pain reliever/fever reducer'),
('Aspirin', 'mg', 'medications', 'Pain reliever/blood thinner'),
('Antihistamine', 'mg', 'medications', 'Allergy medication'),
('Water', 'ml', 'food', 'Plain water'),
('Meal', 'serving', 'food', 'Complete meal'),
('Snack', 'serving', 'food', 'Light snack')
ON CONFLICT (name) DO NOTHING;

-- Insert sample health tips
INSERT INTO tips (title, content, prompt, category) VALUES
('Stay Hydrated', 'Drink at least 8 glasses of water daily to maintain optimal health.', 'Remember to drink water regularly throughout the day', 'hydration'),
('Get Quality Sleep', 'Aim for 7-9 hours of sleep each night for better physical and mental health.', 'Establish a consistent bedtime routine', 'sleep'),
('Take Deep Breaths', 'Practice deep breathing exercises to reduce stress and improve focus.', 'Take 5 deep breaths when feeling overwhelmed', 'meditation'),
('Move Your Body', 'Incorporate at least 30 minutes of physical activity into your daily routine.', 'Take a short walk or do some stretching', 'exercise'),
('Eat Mindfully', 'Pay attention to your food choices and eat slowly to improve digestion.', 'Focus on your meal without distractions', 'nutrition')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This completes the BioPulse production database schema setup
-- All tables, indexes, policies, and sample data have been created
-- Your app is now ready to connect to this database structure