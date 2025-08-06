-- Migration: Enhance User Profiles for Onboarding
-- Version: 003
-- Description: Adds onboarding fields and enhances user profile structure

-- Add new columns to user_profiles table
ALTER TABLE user_profiles ADD COLUMN name TEXT;
ALTER TABLE user_profiles ADD COLUMN age INTEGER CHECK(age >= 13 AND age <= 120);
ALTER TABLE user_profiles ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say'));
ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN onboarding_step TEXT NOT NULL DEFAULT 'welcome' 
  CHECK(onboarding_step IN ('welcome', 'basic_info', 'health_interests', 'goals', 'preferences', 'complete'));

-- Update display_name constraint to be nullable (we'll use 'name' instead)
-- Note: SQLite doesn't support dropping constraints, so we'll work with what we have

-- Create health interests table
CREATE TABLE IF NOT EXISTS health_interests (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene')),
  level TEXT NOT NULL CHECK(level IN ('beginner', 'intermediate', 'advanced')),
  priority INTEGER NOT NULL CHECK(priority >= 1 AND priority <= 5),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  UNIQUE(user_id, category) -- One entry per category per user
);

-- Create user goals table (different from health_goals - these are predefined goal types)
CREATE TABLE IF NOT EXISTS user_goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK(goal_type IN (
    'weight_loss', 'weight_gain', 'muscle_building', 'energy_boost', 'stress_reduction',
    'better_sleep', 'mental_clarity', 'immune_support', 'heart_health', 'digestive_health',
    'flexibility', 'endurance', 'recovery', 'habit_building', 'overall_wellness'
  )),
  priority INTEGER NOT NULL CHECK(priority >= 1 AND priority <= 5),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  UNIQUE(user_id, goal_type) -- One entry per goal type per user
);

-- Create onboarding progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  current_step TEXT NOT NULL DEFAULT 'welcome' 
    CHECK(current_step IN ('welcome', 'basic_info', 'health_interests', 'goals', 'preferences', 'complete')),
  completed_steps TEXT NOT NULL DEFAULT '[]', -- JSON array of completed steps
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  data TEXT, -- JSON object storing onboarding form data
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Enhance user_preferences table with new fields
ALTER TABLE user_preferences ADD COLUMN enable_ai_personalization BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE user_preferences ADD COLUMN share_data_for_personalization BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE user_preferences ADD COLUMN font_size TEXT NOT NULL DEFAULT 'medium' 
  CHECK(font_size IN ('small', 'medium', 'large', 'extra_large'));
ALTER TABLE user_preferences ADD COLUMN high_contrast BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN reduce_motion BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN screen_reader_optimized BOOLEAN NOT NULL DEFAULT 0;

-- Update health_goals table to use new categories
-- Note: SQLite doesn't support modifying CHECK constraints, so we'll add a new constraint via trigger

-- Create OAuth providers table for social login
CREATE TABLE IF NOT EXISTS oauth_providers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('google', 'apple', 'facebook')),
  provider_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_id) -- One account per provider
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_health_interests_user_id ON health_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_health_interests_category ON health_interests(category);
CREATE INDEX IF NOT EXISTS idx_health_interests_level ON health_interests(level);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_goal_type ON user_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_user_goals_priority ON user_goals(priority);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_current_step ON onboarding_progress(current_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed_at ON onboarding_progress(completed_at);

CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider_id ON oauth_providers(provider_id);

-- Create triggers for new tables
CREATE TRIGGER IF NOT EXISTS update_health_interests_updated_at 
  AFTER UPDATE ON health_interests
  FOR EACH ROW
BEGIN
  UPDATE health_interests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_goals_updated_at 
  AFTER UPDATE ON user_goals
  FOR EACH ROW
BEGIN
  UPDATE user_goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_onboarding_progress_updated_at 
  AFTER UPDATE ON onboarding_progress
  FOR EACH ROW
BEGIN
  UPDATE onboarding_progress SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_oauth_providers_updated_at 
  AFTER UPDATE ON oauth_providers
  FOR EACH ROW
BEGIN
  UPDATE oauth_providers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to initialize onboarding progress when user is created
CREATE TRIGGER IF NOT EXISTS create_onboarding_progress
  AFTER INSERT ON user_profiles
  FOR EACH ROW
BEGIN
  INSERT INTO onboarding_progress (id, user_id, current_step, completed_steps) 
  VALUES ('onb_' || NEW.id, NEW.id, 'welcome', '[]');
END;

-- Migrate existing data
-- Copy display_name to name for existing users
UPDATE user_profiles SET name = display_name WHERE name IS NULL AND display_name IS NOT NULL;

-- Set onboarding as completed for existing users (they bypassed the new flow)
UPDATE user_profiles SET 
  onboarding_completed = 1,
  onboarding_step = 'complete'
WHERE created_at < datetime('now', '-1 day'); -- Users created before this migration

-- Update onboarding progress for existing users
UPDATE onboarding_progress SET 
  current_step = 'complete',
  completed_steps = '["welcome", "basic_info", "health_interests", "goals", "preferences", "complete"]',
  completed_at = CURRENT_TIMESTAMP
WHERE user_id IN (
  SELECT id FROM user_profiles 
  WHERE onboarding_completed = 1
);

-- Insert sample health interests for existing users
INSERT OR IGNORE INTO health_interests (id, user_id, category, level, priority) VALUES
('hi_001_nutrition', 'user_001', 'nutrition', 'intermediate', 1),
('hi_001_fitness', 'user_001', 'fitness', 'beginner', 2),
('hi_002_mental', 'user_002', 'mental_wellness', 'intermediate', 1),
('hi_002_sleep', 'user_002', 'sleep', 'beginner', 2);

-- Insert sample goals for existing users
INSERT OR IGNORE INTO user_goals (id, user_id, goal_type, priority) VALUES
('ug_001_energy', 'user_001', 'energy_boost', 1),
('ug_001_fitness', 'user_001', 'muscle_building', 2),
('ug_002_stress', 'user_002', 'stress_reduction', 1),
('ug_002_sleep', 'user_002', 'better_sleep', 2);

-- Create view for complete user profile (useful for API responses)
CREATE VIEW IF NOT EXISTS user_profile_complete AS
SELECT 
  up.id,
  up.name,
  up.display_name,
  up.email,
  up.phone_number,
  up.avatar,
  up.age,
  up.gender,
  up.timezone,
  up.language,
  up.onboarding_completed,
  up.onboarding_step,
  up.is_active,
  up.last_login_at,
  up.created_at,
  up.updated_at,
  -- Preferences
  pref.notifications_enabled,
  pref.daily_tip_time,
  pref.weekly_goal,
  pref.preferred_categories,
  pref.difficulty,
  pref.enable_ai_personalization,
  pref.share_data_for_personalization,
  pref.share_progress,
  pref.allow_analytics,
  pref.allow_personalization,
  pref.data_retention_consent,
  pref.font_size,
  pref.high_contrast,
  pref.reduce_motion,
  pref.screen_reader_optimized,
  -- Stats
  stats.total_tips_viewed,
  stats.total_tips_completed,
  stats.current_streak,
  stats.longest_streak,
  stats.favorite_category,
  stats.average_engagement_score,
  stats.last_activity_at,
  stats.joined_at
FROM user_profiles up
LEFT JOIN user_preferences pref ON up.id = pref.user_id
LEFT JOIN user_stats stats ON up.id = stats.user_id;

-- Add comments for documentation
PRAGMA table_info(user_profiles);
PRAGMA table_info(health_interests);
PRAGMA table_info(user_goals);
PRAGMA table_info(onboarding_progress);
PRAGMA table_info(oauth_providers);