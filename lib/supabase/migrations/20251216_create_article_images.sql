-- Create article_images table
CREATE TABLE article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  url TEXT NOT NULL, -- Storing base64 for now as per current implementation, or URL if changed later
  prompt TEXT,
  is_cover BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_article_images_article_id ON article_images(article_id);
