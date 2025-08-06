-- Enhanced Content Management System Migration
-- Adds advanced features for content workflow, scheduling, and analytics

-- Add status column to health_tips table
ALTER TABLE health_tips 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'scheduled', 'archived'));

-- Add view tracking columns
ALTER TABLE health_tips 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;

-- Create content workflow table
CREATE TABLE IF NOT EXISTS content_workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES health_tips(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'published', 'scheduled', 'archived')),
    assigned_to UUID REFERENCES auth.users(id),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content schedule table
CREATE TABLE IF NOT EXISTS content_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES health_tips(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
    published_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content analytics table
CREATE TABLE IF NOT EXISTS health_tips_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES health_tips(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    bookmarks INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    retention_rate DECIMAL(5,2) DEFAULT 0,
    last_viewed TIMESTAMP WITH TIME ZONE,
    top_user_segments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tip_id)
);

-- Create user engagement tracking table
CREATE TABLE IF NOT EXISTS user_tip_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tip_id UUID NOT NULL REFERENCES health_tips(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'like', 'bookmark', 'complete', 'share', 'rate')),
    value INTEGER, -- For ratings or other numeric values
    session_id VARCHAR(100),
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tip_id, action) -- Prevent duplicate actions per user per tip
);

-- Create content tags table for better tag management
CREATE TABLE IF NOT EXISTS content_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for tip-tag relationships
CREATE TABLE IF NOT EXISTS health_tip_tags (
    tip_id UUID NOT NULL REFERENCES health_tips(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES content_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tip_id, tag_id)
);

-- Create content versions table for revision history
CREATE TABLE IF NOT EXISTS content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES health_tips(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    changes_summary TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tip_id, version_number)
);

-- Create extended view for health tips with analytics
CREATE OR REPLACE VIEW health_tips_extended AS
SELECT 
    ht.*,
    COALESCE(hta.views, 0) as view_count,
    COALESCE(hta.likes, 0) as like_count,
    COALESCE(hta.bookmarks, 0) as bookmark_count,
    COALESCE(hta.completions, 0) as completion_count,
    COALESCE(hta.average_rating, 0) as average_rating,
    COALESCE(hta.engagement_rate, 0) as engagement_rate,
    COALESCE(hta.retention_rate, 0) as retention_rate,
    hta.last_viewed,
    cw.status as workflow_status,
    cw.assigned_to as assigned_to,
    cs.scheduled_for,
    cs.status as schedule_status
FROM health_tips ht
LEFT JOIN health_tips_analytics hta ON ht.id = hta.tip_id
LEFT JOIN content_workflow cw ON ht.id = cw.tip_id
LEFT JOIN content_schedule cs ON ht.id = cs.tip_id AND cs.status = 'pending';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_tips_status ON health_tips(status);
CREATE INDEX IF NOT EXISTS idx_health_tips_category_status ON health_tips(category, status);
CREATE INDEX IF NOT EXISTS idx_health_tips_created_at ON health_tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_tips_updated_at ON health_tips(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_workflow_tip_id ON content_workflow(tip_id);
CREATE INDEX IF NOT EXISTS idx_content_workflow_status ON content_workflow(status);
CREATE INDEX IF NOT EXISTS idx_content_workflow_assigned_to ON content_workflow(assigned_to);

CREATE INDEX IF NOT EXISTS idx_content_schedule_scheduled_for ON content_schedule(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_schedule_status ON content_schedule(status);

CREATE INDEX IF NOT EXISTS idx_user_tip_engagement_user_id ON user_tip_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tip_engagement_tip_id ON user_tip_engagement(tip_id);
CREATE INDEX IF NOT EXISTS idx_user_tip_engagement_action ON user_tip_engagement(action);
CREATE INDEX IF NOT EXISTS idx_user_tip_engagement_created_at ON user_tip_engagement(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_tip_tags_tip_id ON health_tip_tags(tip_id);
CREATE INDEX IF NOT EXISTS idx_health_tip_tags_tag_id ON health_tip_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_content_versions_tip_id ON content_versions(tip_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_version ON content_versions(tip_id, version_number DESC);

-- Create triggers for updating analytics
CREATE OR REPLACE FUNCTION update_tip_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert analytics record
    INSERT INTO health_tips_analytics (tip_id, views, likes, bookmarks, completions, last_viewed)
    VALUES (
        NEW.tip_id,
        CASE WHEN NEW.action = 'view' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'like' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'bookmark' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'complete' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'view' THEN NEW.created_at ELSE NULL END
    )
    ON CONFLICT (tip_id) DO UPDATE SET
        views = health_tips_analytics.views + CASE WHEN NEW.action = 'view' THEN 1 ELSE 0 END,
        likes = health_tips_analytics.likes + CASE WHEN NEW.action = 'like' THEN 1 ELSE 0 END,
        bookmarks = health_tips_analytics.bookmarks + CASE WHEN NEW.action = 'bookmark' THEN 1 ELSE 0 END,
        completions = health_tips_analytics.completions + CASE WHEN NEW.action = 'complete' THEN 1 ELSE 0 END,
        last_viewed = CASE 
            WHEN NEW.action = 'view' AND (health_tips_analytics.last_viewed IS NULL OR NEW.created_at > health_tips_analytics.last_viewed)
            THEN NEW.created_at 
            ELSE health_tips_analytics.last_viewed 
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_tip_analytics ON user_tip_engagement;
CREATE TRIGGER trigger_update_tip_analytics
    AFTER INSERT ON user_tip_engagement
    FOR EACH ROW
    EXECUTE FUNCTION update_tip_analytics();

-- Create function to update engagement rates
CREATE OR REPLACE FUNCTION calculate_engagement_rates()
RETURNS void AS $$
BEGIN
    UPDATE health_tips_analytics 
    SET 
        engagement_rate = CASE 
            WHEN views > 0 THEN ROUND(((likes + bookmarks + completions)::decimal / views * 100), 2)
            ELSE 0 
        END,
        retention_rate = CASE 
            WHEN views > 0 THEN ROUND((completions::decimal / views * 100), 2)
            ELSE 0 
        END,
        updated_at = NOW()
    WHERE views > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to update content workflow
CREATE OR REPLACE FUNCTION update_content_workflow()
RETURNS TRIGGER AS $$
BEGIN
    -- Update workflow when tip status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE content_workflow 
        SET 
            status = NEW.status,
            updated_at = NOW()
        WHERE tip_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workflow updates
DROP TRIGGER IF EXISTS trigger_update_content_workflow ON health_tips;
CREATE TRIGGER trigger_update_content_workflow
    AFTER UPDATE ON health_tips
    FOR EACH ROW
    EXECUTE FUNCTION update_content_workflow();

-- Create function to handle scheduled content publishing
CREATE OR REPLACE FUNCTION publish_scheduled_content()
RETURNS void AS $$
DECLARE
    scheduled_item RECORD;
BEGIN
    -- Get all pending scheduled items that are due
    FOR scheduled_item IN 
        SELECT cs.id, cs.tip_id, cs.scheduled_for
        FROM content_schedule cs
        WHERE cs.status = 'pending' 
        AND cs.scheduled_for <= NOW()
    LOOP
        BEGIN
            -- Update the tip status to published
            UPDATE health_tips 
            SET 
                status = 'published',
                is_active = true,
                updated_at = NOW()
            WHERE id = scheduled_item.tip_id;
            
            -- Update the schedule status
            UPDATE content_schedule 
            SET 
                status = 'published',
                published_at = NOW(),
                updated_at = NOW()
            WHERE id = scheduled_item.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Mark as failed if there's an error
            UPDATE content_schedule 
            SET 
                status = 'failed',
                error_message = SQLERRM,
                updated_at = NOW()
            WHERE id = scheduled_item.id;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert some default content tags
INSERT INTO content_tags (name, description, color) VALUES
('beginner', 'Content suitable for beginners', '#4CAF50'),
('intermediate', 'Content for intermediate level', '#FF9800'),
('advanced', 'Advanced level content', '#F44336'),
('quick-tip', 'Quick tips that can be read in under 2 minutes', '#2196F3'),
('daily-habit', 'Tips for building daily healthy habits', '#9C27B0'),
('science-backed', 'Tips backed by scientific research', '#607D8B'),
('mental-health', 'Mental health and wellness tips', '#E91E63'),
('physical-health', 'Physical health and fitness tips', '#FF5722'),
('nutrition', 'Nutrition and diet related tips', '#8BC34A'),
('lifestyle', 'General lifestyle improvement tips', '#795548')
ON CONFLICT (name) DO NOTHING;

-- Create RLS policies for content management
ALTER TABLE content_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_tips_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tip_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_tip_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Policies for content_workflow (admin and content creators only)
CREATE POLICY "Content workflow visible to authenticated users" ON content_workflow
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Content workflow manageable by admins" ON content_workflow
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Policies for content_schedule (admin only)
CREATE POLICY "Content schedule visible to admins" ON content_schedule
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Policies for analytics (admin and content creators)
CREATE POLICY "Analytics visible to authenticated users" ON health_tips_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Analytics manageable by system" ON health_tips_analytics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Analytics updatable by system" ON health_tips_analytics
    FOR UPDATE USING (true);

-- Policies for user engagement (users can manage their own)
CREATE POLICY "Users can manage their own engagement" ON user_tip_engagement
    FOR ALL USING (auth.uid() = user_id);

-- Policies for tags (readable by all, manageable by admins)
CREATE POLICY "Tags visible to all" ON content_tags
    FOR SELECT USING (true);

CREATE POLICY "Tags manageable by admins" ON content_tags
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Policies for tip-tag relationships
CREATE POLICY "Tip tags visible to all" ON health_tip_tags
    FOR SELECT USING (true);

CREATE POLICY "Tip tags manageable by admins" ON health_tip_tags
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Policies for content versions (admin and content creators)
CREATE POLICY "Content versions visible to authenticated users" ON content_versions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Content versions manageable by admins" ON content_versions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Update existing health_tips table status for existing records
UPDATE health_tips 
SET status = CASE 
    WHEN is_active = true THEN 'published'
    ELSE 'draft'
END
WHERE status IS NULL;

-- Create initial workflow entries for existing tips
INSERT INTO content_workflow (tip_id, status, created_at, updated_at)
SELECT 
    id,
    CASE 
        WHEN is_active = true THEN 'published'
        ELSE 'draft'
    END,
    created_at,
    updated_at
FROM health_tips
WHERE id NOT IN (SELECT tip_id FROM content_workflow);

-- Create initial analytics entries for existing tips
INSERT INTO health_tips_analytics (tip_id, created_at, updated_at)
SELECT id, created_at, updated_at
FROM health_tips
WHERE id NOT IN (SELECT tip_id FROM health_tips_analytics);

COMMENT ON TABLE content_workflow IS 'Tracks the workflow status and approval process for health tips';
COMMENT ON TABLE content_schedule IS 'Manages scheduled publication of health tips';
COMMENT ON TABLE health_tips_analytics IS 'Stores analytics and engagement metrics for health tips';
COMMENT ON TABLE user_tip_engagement IS 'Tracks user interactions with health tips';
COMMENT ON TABLE content_tags IS 'Master list of available content tags';
COMMENT ON TABLE health_tip_tags IS 'Junction table linking health tips to tags';
COMMENT ON TABLE content_versions IS 'Stores revision history for health tips';