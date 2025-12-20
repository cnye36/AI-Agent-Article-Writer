-- Fix search_vector to exclude base64 image data URLs
-- This prevents tsvector from exceeding PostgreSQL's 1MB limit when articles contain large base64 images

-- Function to strip base64 image data URLs from content
CREATE OR REPLACE FUNCTION strip_base64_images(content_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove data:image/*;base64,<base64_data> patterns
  -- This regex matches data:image/ followed by any characters, then ;base64, followed by base64 data
  -- Base64 data can be very long, so we remove the entire pattern
  RETURN regexp_replace(
    content_text,
    'data:image/[^;]+;base64,[A-Za-z0-9+/=]+',
    '[IMAGE]',
    'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop the existing generated column
ALTER TABLE articles DROP COLUMN IF EXISTS search_vector;

-- Recreate search_vector with base64 images stripped
ALTER TABLE articles
ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(strip_base64_images(content), '')), 'C')
) STORED;

-- Recreate the GIN index
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search_vector);

-- Add comment for documentation
COMMENT ON FUNCTION strip_base64_images IS 'Strips base64 image data URLs from content to prevent tsvector size limit errors. Replaces data URLs with [IMAGE] placeholder.';

