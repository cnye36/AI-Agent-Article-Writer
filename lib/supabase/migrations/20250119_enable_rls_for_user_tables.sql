-- Enable Row Level Security (RLS) for user-specific tables
-- This ensures users can only access their own data at the database level

-- ============================================
-- ARTICLES TABLE
-- ============================================
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own articles
CREATE POLICY articles_select_own ON articles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own articles
CREATE POLICY articles_insert_own ON articles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own articles
CREATE POLICY articles_update_own ON articles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own articles
CREATE POLICY articles_delete_own ON articles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (for background workers)
CREATE POLICY articles_service_all ON articles
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- TOPICS TABLE
-- ============================================
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own topics
CREATE POLICY topics_select_own ON topics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own topics
CREATE POLICY topics_insert_own ON topics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own topics
CREATE POLICY topics_update_own ON topics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own topics
CREATE POLICY topics_delete_own ON topics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (for background workers)
CREATE POLICY topics_service_all ON topics
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- OUTLINES TABLE
-- ============================================
ALTER TABLE outlines ENABLE ROW LEVEL SECURITY;

-- Users can only see their own outlines
CREATE POLICY outlines_select_own ON outlines
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own outlines
CREATE POLICY outlines_insert_own ON outlines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own outlines
CREATE POLICY outlines_update_own ON outlines
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own outlines
CREATE POLICY outlines_delete_own ON outlines
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (for background workers)
CREATE POLICY outlines_service_all ON outlines
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ARTICLE_VERSIONS TABLE
-- ============================================
-- Article versions inherit security through article ownership
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;

-- Users can see versions of their own articles
CREATE POLICY article_versions_select_own ON article_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_versions.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can insert versions for their own articles
CREATE POLICY article_versions_insert_own ON article_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_versions.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can update versions of their own articles
CREATE POLICY article_versions_update_own ON article_versions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_versions.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can delete versions of their own articles
CREATE POLICY article_versions_delete_own ON article_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_versions.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY article_versions_service_all ON article_versions
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ARTICLE_LINKS TABLE
-- ============================================
-- Article links inherit security through source article ownership
ALTER TABLE article_links ENABLE ROW LEVEL SECURITY;

-- Users can see links from their own articles
CREATE POLICY article_links_select_own ON article_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_links.source_article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can insert links from their own articles
CREATE POLICY article_links_insert_own ON article_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_links.source_article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can update links from their own articles
CREATE POLICY article_links_update_own ON article_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_links.source_article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can delete links from their own articles
CREATE POLICY article_links_delete_own ON article_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_links.source_article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY article_links_service_all ON article_links
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ARTICLE_IMAGES TABLE
-- ============================================
-- Article images inherit security through article ownership
ALTER TABLE article_images ENABLE ROW LEVEL SECURITY;

-- Users can see images of their own articles
CREATE POLICY article_images_select_own ON article_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_images.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can insert images for their own articles
CREATE POLICY article_images_insert_own ON article_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_images.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can update images of their own articles
CREATE POLICY article_images_update_own ON article_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_images.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Users can delete images of their own articles
CREATE POLICY article_images_delete_own ON article_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_images.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY article_images_service_all ON article_images
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- PUBLISHING_SITES TABLE
-- ============================================
-- Publishing sites already have user_id column
ALTER TABLE publishing_sites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own publishing sites
CREATE POLICY publishing_sites_select_own ON publishing_sites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own publishing sites
CREATE POLICY publishing_sites_insert_own ON publishing_sites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own publishing sites
CREATE POLICY publishing_sites_update_own ON publishing_sites
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own publishing sites
CREATE POLICY publishing_sites_delete_own ON publishing_sites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY publishing_sites_service_all ON publishing_sites
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ARTICLE_PUBLICATIONS TABLE
-- ============================================
-- Article publications inherit security through article and site ownership
ALTER TABLE article_publications ENABLE ROW LEVEL SECURITY;

-- Users can see publications for their own articles or sites
CREATE POLICY article_publications_select_own ON article_publications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_publications.article_id
      AND articles.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM publishing_sites
      WHERE publishing_sites.id = article_publications.site_id
      AND publishing_sites.user_id = auth.uid()
    )
  );

-- Users can insert publications for their own articles and sites
CREATE POLICY article_publications_insert_own ON article_publications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_publications.article_id
      AND articles.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM publishing_sites
      WHERE publishing_sites.id = article_publications.site_id
      AND publishing_sites.user_id = auth.uid()
    )
  );

-- Users can update publications for their own articles and sites
CREATE POLICY article_publications_update_own ON article_publications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_publications.article_id
      AND articles.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM publishing_sites
      WHERE publishing_sites.id = article_publications.site_id
      AND publishing_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_publications.article_id
      AND articles.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM publishing_sites
      WHERE publishing_sites.id = article_publications.site_id
      AND publishing_sites.user_id = auth.uid()
    )
  );

-- Users can delete publications for their own articles and sites
CREATE POLICY article_publications_delete_own ON article_publications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_publications.article_id
      AND articles.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM publishing_sites
      WHERE publishing_sites.id = article_publications.site_id
      AND publishing_sites.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY article_publications_service_all ON article_publications
  FOR ALL
  USING (auth.role() = 'service_role');

