-- Add user_id columns to topics, outlines, and articles tables
-- This enables user-specific data isolation

-- Add user_id to topics table
ALTER TABLE topics
ADD COLUMN user_id UUID;

-- Add user_id to outlines table
ALTER TABLE outlines
ADD COLUMN user_id UUID;

-- Add user_id to articles table
ALTER TABLE articles
ADD COLUMN user_id UUID;

-- Create indexes for efficient user-based queries
CREATE INDEX idx_topics_user_id ON topics(user_id);
CREATE INDEX idx_outlines_user_id ON outlines(user_id);
CREATE INDEX idx_articles_user_id ON articles(user_id);

-- Add composite indexes for common query patterns
CREATE INDEX idx_topics_user_status ON topics(user_id, status);
CREATE INDEX idx_articles_user_status ON articles(user_id, status);
CREATE INDEX idx_articles_user_created ON articles(user_id, created_at DESC);

-- Note: Existing rows will have NULL user_id values
-- You may want to backfill existing data or handle NULL values in application logic
-- Once all existing data is migrated, you can make these columns NOT NULL:
-- ALTER TABLE topics ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE outlines ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE articles ALTER COLUMN user_id SET NOT NULL;

