-- Migration: Create Users Table
-- Version: 002
-- Description: Creates the user_profiles table with all required fields and indexes

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL CHECK(length(display_name) >= 2 AND length(display_name) <= 50),
  email TEXT UNIQUE,
  phone_number TEXT,
  start_date DATETIME NOT NULL,
  avatar TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  language TEXT NOT NULL DEFAULT 'en' CHECK(length(language) = 2),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint checks
  CONSTRAINT email_format CHECK (email IS NULL OR email LIKE '%@%.%'),
  CONSTRAINT phone_format CHECK (phone_number IS NULL OR length(phone_number) >= 10),
  CONSTRAINT start_date_valid CHECK (start_date <= CURRENT_TIMESTAMP)
);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  notifications_enabled BOOLEAN NOT NULL DEFAULT 1,
  daily_tip_time TEXT NOT NULL DEFAULT '09:00' CHECK(daily_tip_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  weekly_goal INTEGER NOT NULL DEFAULT 7 CHECK(weekly_goal >= 1 AND weekly_goal <= 21),
  preferred_categories TEXT, -- JSON array stored as text
  difficulty TEXT NOT NULL DEFAULT 'mixed' CHECK(difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  share_progress BOOLEAN NOT NULL DEFAULT 0,
  allow_analytics BOOLEAN NOT NULL DEFAULT 1,
  allow_personalization BOOLEAN NOT NULL DEFAULT 1,
  data_retention_consent BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create health goals table
CREATE TABLE IF NOT EXISTS health_goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) >= 3 AND length(title) <= 100),
  description TEXT CHECK(length(description) <= 500),
  category TEXT NOT NULL CHECK(category IN ('nutrition', 'exercise', 'mental-health', 'sleep', 'wellness')),
  target_value REAL CHECK(target_value > 0),
  current_value REAL NOT NULL DEFAULT 0 CHECK(current_value >= 0),
  unit TEXT CHECK(length(unit) <= 20),
  target_date DATETIME CHECK(target_date > CURRENT_TIMESTAMP),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create user stats table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY NOT NULL,
  total_tips_viewed INTEGER NOT NULL DEFAULT 0,
  total_tips_completed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  favorite_category TEXT,
  average_engagement_score REAL NOT NULL DEFAULT 0.0,
  last_activity_at DATETIME,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_notifications ON user_preferences(notifications_enabled);

CREATE INDEX IF NOT EXISTS idx_health_goals_user_id ON health_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_health_goals_category ON health_goals(category);
CREATE INDEX IF NOT EXISTS idx_health_goals_is_active ON health_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_health_goals_target_date ON health_goals(target_date);

CREATE INDEX IF NOT EXISTS idx_user_stats_current_streak ON user_stats(current_streak);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_activity ON user_stats(last_activity_at);

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_user_profiles_updated_at 
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
BEGIN
  UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_preferences_updated_at 
  AFTER UPDATE ON user_preferences
  FOR EACH ROW
BEGIN
  UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_health_goals_updated_at 
  AFTER UPDATE ON health_goals
  FOR EACH ROW
BEGIN
  UPDATE health_goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to initialize user preferences and stats when user is created
CREATE TRIGGER IF NOT EXISTS create_user_defaults
  AFTER INSERT ON user_profiles
  FOR EACH ROW
BEGIN
  INSERT INTO user_preferences (id, user_id) 
  VALUES ('pref_' || NEW.id, NEW.id);
  
  INSERT INTO user_stats (user_id, joined_at) 
  VALUES (NEW.id, NEW.created_at);
END;

-- Insert sample data for development
INSERT OR IGNORE INTO user_profiles (
  id, display_name, email, start_date, timezone, language
) VALUES 
(
  'user_001',
  'John Doe',
  'john.doe@example.com',
  '2024-01-15 10:00:00',
  'America/New_York',
  'en'
),
(
  'user_002',
  'Jane Smith',
  'jane.smith@example.com',
  '2024-02-01 14:30:00',
  'Europe/London',
  'en'
);