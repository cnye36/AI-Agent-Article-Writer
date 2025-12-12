-- Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to topics table for semantic duplicate detection
-- Using dimension 1536 for OpenAI's text-embedding-3-small model
ALTER TABLE topics
ADD COLUMN embedding vector(1536);

-- Create HNSW index for fast similarity search
-- HNSW (Hierarchical Navigable Small World) provides better performance than IVFFlat
-- Using cosine distance for similarity comparison
CREATE INDEX idx_topics_embedding ON topics
USING hnsw (embedding vector_cosine_ops);

-- Function to find similar topics based on embedding similarity
-- Returns topics with cosine similarity > threshold (default 0.85)
CREATE OR REPLACE FUNCTION find_similar_topics(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.85,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.summary,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM topics t
  WHERE
    t.embedding IS NOT NULL
    AND (1 - (t.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON COLUMN topics.embedding IS 'Vector embedding (1536-dim) from OpenAI text-embedding-3-small for semantic similarity search';
COMMENT ON FUNCTION find_similar_topics IS 'Find semantically similar topics using cosine similarity. Threshold 0.85 = ~85% similar.';
