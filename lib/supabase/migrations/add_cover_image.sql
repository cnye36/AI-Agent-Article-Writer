
-- Add cover_image column to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cover_image TEXT;
