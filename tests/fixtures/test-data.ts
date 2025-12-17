import type { Topic, Outline, Article, OutlineStructure } from '@/types';

export const mockTopic: Topic = {
  id: 'test-topic-id',
  title: 'AI Advancements in 2024',
  summary: 'Recent developments in artificial intelligence',
  status: 'approved',
  industry_id: 'ai-industry-id',
  sources: [
    {
      url: 'https://example.com/ai-news',
      title: 'AI News Article',
      snippet: 'Recent developments in AI',
      domain: 'example.com',
    },
  ],
  relevance_score: 0.9,
  discovered_at: '2024-01-01T00:00:00Z',
  metadata: {
    angle: 'Focus on practical applications',
  },
};

export const mockOutlineStructure: OutlineStructure = {
  title: 'AI Advancements in 2024',
  hook: 'Artificial intelligence is transforming industries at an unprecedented pace.',
  sections: [
    {
      heading: 'Introduction to AI',
      keyPoints: ['AI basics', 'Current state'],
      wordTarget: 200,
    },
    {
      heading: 'Recent Developments',
      keyPoints: ['New models', 'Performance improvements'],
      wordTarget: 300,
    },
  ],
  conclusion: {
    summary: 'AI continues to evolve rapidly, shaping our future.',
    callToAction: 'Stay updated with our latest AI insights.',
  },
  seoKeywords: ['AI', 'machine learning', 'artificial intelligence'],
};

export const mockOutline: Outline = {
  id: 'test-outline-id',
  topic_id: 'test-topic-id',
  structure: mockOutlineStructure,
  article_type: 'blog',
  target_length: 'medium',
  tone: 'professional',
  approved: false,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockArticle: Article = {
  id: "test-article-id",
  outline_id: "test-outline-id",
  industry_id: "ai-industry-id",
  title: "AI Advancements in 2024",
  slug: "ai-advancements-2024",
  cover_image: "https://example.com/ai-advancements-2024.jpg",
  excerpt: "Recent developments in artificial intelligence",
  content:
    "<h1>AI Advancements in 2024</h1><p>Artificial intelligence is transforming industries...</p>",
  content_html:
    "<h1>AI Advancements in 2024</h1><p>Artificial intelligence is transforming industries...</p>",
  status: "draft",
  article_type: "blog",
  seo_keywords: ["AI", "machine learning"],
  word_count: 500,
  reading_time: 3,
  published_at: null,
  published_to: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockGenerationConfig = {
  industry: 'AI',
  articleType: 'blog' as const,
  targetLength: 'medium' as const,
  tone: 'professional' as const,
  keywords: ['artificial intelligence', 'machine learning'],
};
