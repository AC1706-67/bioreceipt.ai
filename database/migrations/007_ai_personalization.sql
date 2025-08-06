-- Migration: Add AI Personalization Table
-- Description: Creates table to store AI-generated personalized recommendations

-- Create ai_personalizations table
CREATE TABLE IF NOT EXISTS ai_personalizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    input_data jsonb NOT NULL,
    output_data jsonb NOT NULL,
    model text DEFAULT 'default',
    created_at timestamptz DEFAULT NOW() NOT NULL
);

-- Create index on user_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_personalizations_user_id ON ai_personalizations(user_id);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_ai_personalizations_created_at ON ai_personalizations(created_at);

-- Enable RLS
ALTER TABLE ai_personalizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own personalizations" ON ai_personalizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personalizations" ON ai_personalizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personalizations" ON ai_personalizations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personalizations" ON ai_personalizations
    FOR DELETE USING (auth.uid() = user_id);

-- Function to get user personalizations
CREATE OR REPLACE FUNCTION get_user_personalizations(
    user_uuid uuid,
    limit_count integer DEFAULT 10
)
RETURNS TABLE(
    id uuid,
    input_data jsonb,
    output_data jsonb,
    model text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        p.id,
        p.input_data,
        p.output_data,
        p.model,
        p.created_at
    FROM ai_personalizations p
    WHERE p.user_id = user_uuid
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_personalizations(uuid, integer) TO authenticated;