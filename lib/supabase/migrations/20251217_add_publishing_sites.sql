-- Publishing Sites: User-configured sites where articles can be published
-- Each site has a base_path (e.g., https://example.com/blog)
CREATE TABLE publishing_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- User-friendly name (e.g., "Main Blog", "Company Site")
  base_path TEXT NOT NULL, -- Full base path (e.g., "https://example.com/blog")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, base_path) -- Prevent duplicate base paths per user
);

-- Article Publications: Track where each article was published
-- Links articles to publishing sites with the specific slug/URL used
CREATE TABLE article_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES publishing_sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, -- Article slug on that site
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, site_id) -- One publication per article per site
);

-- Function to get canonical URL (computed via join in queries)
-- We'll compute this in the application layer for simplicity

-- Indexes for performance
CREATE INDEX idx_publishing_sites_user_id ON publishing_sites(user_id);
CREATE INDEX idx_article_publications_article_id ON article_publications(article_id);
CREATE INDEX idx_article_publications_site_id ON article_publications(site_id);

-- Add comment for documentation
COMMENT ON TABLE publishing_sites IS 'User-configured publishing sites with base paths (e.g., https://example.com/blog)';
COMMENT ON TABLE article_publications IS 'Tracks where articles were published, linking articles to sites with specific slugs';
COMMENT ON COLUMN publishing_sites.base_path IS 'Full base path including protocol and path (e.g., https://example.com/blog)';
COMMENT ON COLUMN article_publications.slug IS 'Article slug on the publishing site. Canonical URL = site.base_path + / + slug';

