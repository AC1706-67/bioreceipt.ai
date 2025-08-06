-- Add intake_media table for future photo/video attachments
-- Run this if you already have an existing BioPulse database

-- Create intake media table
CREATE TABLE IF NOT EXISTS intake_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES substance_intakes(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_intake_media_intake_id ON intake_media(intake_id);

-- Enable Row Level Security
ALTER TABLE intake_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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