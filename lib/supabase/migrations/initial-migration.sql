-- Industries/Categories for organization
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research topics discovered by Research Agent
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  industry_id UUID REFERENCES industries(id),
  sources JSONB DEFAULT '[]', -- [{url, title, snippet, date}]
  relevance_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, used
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Article outlines created by Outline Agent
CREATE TABLE outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id),
  structure JSONB NOT NULL, -- {sections: [{title, points, word_target}]}
  article_type TEXT NOT NULL, -- blog, technical, news, opinion, tutorial
  target_length TEXT NOT NULL, -- short (500), medium (1000), long (2000+)
  tone TEXT DEFAULT 'professional',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved BOOLEAN DEFAULT FALSE
);

-- Final articles with full content
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outline_id UUID REFERENCES outlines(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  industry_id UUID REFERENCES industries(id),
  article_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, review, published
  word_count INT,
  reading_time INT, -- minutes
  seo_keywords TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  published_to TEXT[] DEFAULT '{}', -- ['medium', 'blog', 'reddit']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);

-- Internal links index for cross-referencing
CREATE TABLE article_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  target_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  anchor_text TEXT,
  context TEXT, -- surrounding sentence
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_article_id, target_article_id, anchor_text)
);

-- Article versions for edit history
CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_by TEXT, -- 'user' or 'ai'
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);
CREATE INDEX idx_articles_industry ON articles(industry_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_topics_industry ON topics(industry_id);
CREATE INDEX idx_topics_status ON topics(status);