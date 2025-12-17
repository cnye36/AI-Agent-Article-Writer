-- Add embedding column to articles table for semantic similarity search
-- Only published articles will have embeddings to enable internal linking
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for fast similarity search on published articles
CREATE INDEX IF NOT EXISTS idx_articles_embedding ON articles
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL AND status = 'published';

-- Function to find similar published articles based on embedding similarity
-- Returns articles with cosine similarity > threshold (default 0.75)
-- Only searches published articles to avoid linking to drafts
CREATE OR REPLACE FUNCTION find_similar_published_articles(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.75,
  match_count int DEFAULT 5,
  exclude_article_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.slug,
    a.excerpt,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM articles a
  WHERE
    a.embedding IS NOT NULL
    AND a.status = 'published'
    AND (a.id != exclude_article_id OR exclude_article_id IS NULL)
    AND (1 - (a.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON COLUMN articles.embedding IS 'Vector embedding (1536-dim) from OpenAI text-embedding-3-small for semantic similarity search. Only populated for published articles.';
COMMENT ON FUNCTION find_similar_published_articles IS 'Find semantically similar published articles using cosine similarity. Threshold 0.75 = ~75% similar. Excludes drafts and the article itself.';

