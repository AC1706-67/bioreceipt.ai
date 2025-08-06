-- Migration: Create Health Tips Table
-- Version: 001
-- Description: Creates the health_tips table with all required fields and indexes

CREATE TABLE IF NOT EXISTS health_tips (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK(length(title) >= 5 AND length(title) <= 100),
  content TEXT NOT NULL CHECK(length(content) >= 20 AND length(content) <= 2000),
  image_url TEXT,
  category TEXT NOT NULL CHECK(category IN ('nutrition', 'exercise', 'mental-health', 'sleep', 'wellness')),
  tags TEXT, -- JSON array stored as text
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
  estimated_read_time INTEGER NOT NULL CHECK(estimated_read_time > 0 AND estimated_read_time <= 60),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 5 CHECK(priority >= 1 AND priority <= 10),
  metadata TEXT -- JSON object stored as text
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_tips_category ON health_tips(category);
CREATE INDEX IF NOT EXISTS idx_health_tips_difficulty ON health_tips(difficulty);
CREATE INDEX IF NOT EXISTS idx_health_tips_is_active ON health_tips(is_active);
CREATE INDEX IF NOT EXISTS idx_health_tips_priority ON health_tips(priority);
CREATE INDEX IF NOT EXISTS idx_health_tips_created_at ON health_tips(created_at);
CREATE INDEX IF NOT EXISTS idx_health_tips_estimated_read_time ON health_tips(estimated_read_time);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_health_tips_updated_at 
  AFTER UPDATE ON health_tips
  FOR EACH ROW
BEGIN
  UPDATE health_tips SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert sample data for development
INSERT OR IGNORE INTO health_tips (
  id, title, content, category, difficulty, estimated_read_time, tags, is_active, priority
) VALUES 
(
  'tip_001',
  'Stay Hydrated Throughout the Day',
  'Drinking adequate water is essential for maintaining good health. Aim for 8 glasses of water daily to keep your body hydrated and functioning optimally. Water helps regulate body temperature, transport nutrients, and remove waste products.',
  'wellness',
  'easy',
  2,
  '["hydration", "water", "health", "daily-habits"]',
  1,
  8
),
(
  'tip_002',
  'Take a 10-Minute Walk After Meals',
  'A short walk after eating can help improve digestion and regulate blood sugar levels. This simple habit can also boost your energy and mood while contributing to your daily physical activity goals.',
  'exercise',
  'easy',
  1,
  '["walking", "digestion", "exercise", "post-meal"]',
  1,
  7
),
(
  'tip_003',
  'Practice Deep Breathing for Stress Relief',
  'Deep breathing exercises can help reduce stress and anxiety. Try the 4-7-8 technique: inhale for 4 counts, hold for 7 counts, and exhale for 8 counts. Repeat this cycle 3-4 times whenever you feel overwhelmed.',
  'mental-health',
  'medium',
  3,
  '["breathing", "stress-relief", "anxiety", "mindfulness"]',
  1,
  9
);