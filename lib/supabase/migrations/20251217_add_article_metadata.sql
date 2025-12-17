-- Add metadata column to articles table for storing frontmatter overrides and other metadata
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN articles.metadata IS 'Stores frontmatter overrides and other article metadata (e.g., custom author, categories, tags)';

