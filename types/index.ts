// Article Types
export type ArticleType =
  | "blog"
  | "technical"
  | "news"
  | "opinion"
  | "tutorial"
  | "listicle"
  | "affiliate";
export type ArticleStatus = "draft" | "review" | "published";
export type TopicStatus = "pending" | "approved" | "rejected" | "used";
export type TargetLength = "short" | "medium" | "long";

// Database Types (matches Supabase schema)
export interface Industry {
  id: string;
  name: string;
  slug: string;
  keywords: string[];
  created_at: string;
}

export interface Topic {
  id: string;
  title: string;
  summary: string | null;
  industry_id: string;
  sources: Source[];
  relevance_score: number;
  status: TopicStatus;
  discovered_at: string;
  metadata: TopicMetadata | null;
  // Joined
  industries?: Industry;
}

export interface TopicMetadata {
  angle?: string;
  discoveredAt?: string;
  searchKeywords?: string[];
  similarTopics?: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
}

export interface Source {
  url: string;
  title: string;
  snippet?: string;
  date?: string;
  domain?: string;
}

export interface Outline {
  id: string;
  topic_id: string;
  structure: OutlineStructure;
  article_type: ArticleType;
  target_length: TargetLength;
  tone: string;
  created_at: string;
  approved: boolean;
  // Joined
  topics?: Topic;
}

export interface OutlineStructure {
  title: string;
  hook: string;
  sections: OutlineSection[];
  conclusion: {
    summary: string;
    callToAction: string;
  };
  seoKeywords: string[];
  metadata?: {
    articleType: ArticleType;
    targetLength: TargetLength;
    tone: string;
    totalWordTarget: number;
    sectionCount: number;
  };
}

export interface OutlineSection {
  heading: string;
  keyPoints: string[];
  wordTarget: number;
  suggestedLinks?: SuggestedLink[];
}

export interface SuggestedLink {
  articleId: string;
  anchorText: string;
}

export interface Article {
  id: string;
  outline_id: string | null;
  title: string;
  slug: string;
  content: string;
  content_html: string | null;
  excerpt: string | null;
  industry_id: string;
  article_type: ArticleType;
  status: ArticleStatus;
  word_count: number | null;
  reading_time: number | null;
  seo_keywords: string[];
  published_at: string | null;
  published_to: string[];
  created_at: string;
  updated_at: string;
  // Joined
  industries?: Industry;
  outlines?: Outline;
}

export interface ArticleLink {
  id: string;
  source_article_id: string;
  target_article_id: string;
  anchor_text: string;
  context: string | null;
  created_at: string;
  // Joined
  source_article?: Pick<Article, "id" | "title" | "slug">;
  target_article?: Pick<Article, "id" | "title" | "slug">;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  content: string;
  edited_by: "user" | "ai";
  change_summary: string | null;
  created_at: string;
}

// API Request/Response Types
export interface ResearchRequest {
  industry: string;
  keywords?: string[];
  maxTopics?: number;
}

export interface ResearchResponse {
  success: boolean;
  topics: Topic[];
  metadata?: {
    industry: string;
    keywordsUsed: string[];
    existingArticlesChecked: number;
    topicsDiscovered: number;
  };
}

export interface BrainstormRequest {
  industry: string;
  keywords?: string[];
  articleType?: string;
  targetAudience?: string;
  contentGoals?: string[];
  count?: number;
}

export interface BrainstormResponse {
  success: boolean;
  topics: Topic[];
  metadata?: {
    industry: string;
    method: "brainstorm";
    topicsGenerated: number;
    avoidedTopicsCount: number;
    keywordsUsed?: string[];
  };
}

export interface OutlineRequest {
  topicId: string;
  articleType: ArticleType;
  targetLength: TargetLength;
  tone?: string;
  customInstructions?: string;
}

export interface OutlineResponse {
  success: boolean;
  outline: Outline;
  relatedArticles?: Pick<Article, "id" | "title" | "slug">[];
}

export interface WriteRequest {
  outlineId: string;
  customInstructions?: string;
  streamResponse?: boolean;
}

export interface WriteResponse {
  success: boolean;
  article: Article;
  metadata?: {
    wordCount: number;
    readingTime: number;
    internalLinksCount: number;
    sectionsWritten: number;
  };
}

export interface EditRequest {
  selectedText: string;
  action: EditAction;
  customPrompt?: string;
  context?: EditContext;
  targetTone?: string;
}

export type EditAction =
  | "rewrite"
  | "expand"
  | "simplify"
  | "custom"
  | "fix_grammar"
  | "change_tone";

export interface EditContext {
  beforeText?: string;
  afterText?: string;
  articleType?: ArticleType;
  tone?: string;
}

// Component Props Types
export interface TopicCardProps {
  topic: Topic;
  onSelect: (topic: Topic) => void;
  onReject: (topicId: string) => void;
  isSelected?: boolean;
}

export interface ArticleCardProps {
  article: Article;
  onClick: (article: Article) => void;
  showStatus?: boolean;
  showMetrics?: boolean;
}

export interface OutlinePreviewProps {
  outline: OutlineStructure;
  onApprove: () => void;
  onEdit: (outline: OutlineStructure) => void;
  isLoading?: boolean;
}

export interface CanvasEditorProps {
  initialContent: string;
  articleId: string;
  articleType?: ArticleType;
  tone?: string;
  onSave: (content: string) => Promise<void>;
  onPublish?: () => Promise<void>;
}

// State Types
export interface ArticleGenerationState {
  stage: GenerationStage;
  config: GenerationConfig;
  topics: Topic[];
  selectedTopic: Topic | null;
  outline: Outline | null;
  article: Article | null;
  isLoading: boolean;
  error: string | null;
}

export type GenerationStage = "config" | "topics" | "outline" | "content";

export interface GenerationConfig {
  industry: string;
  keywords?: string[];
  articleType: ArticleType;
  targetLength: TargetLength;
  tone: string;
}

// UI Component Types
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Pagination Types
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Search Types
export interface SearchFilters {
  query?: string;
  industryId?: string;
  articleType?: ArticleType;
  status?: ArticleStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Link Suggestion Types
export interface LinkSuggestion {
  anchorText: string;
  targetArticleId: string;
  targetArticle: Pick<Article, "id" | "title" | "slug">;
  relevanceScore: number;
  reason: string;
}

// Version Comparison Types
export interface VersionDiff {
  added: number;
  removed: number;
  unchanged: number;
  changes: DiffChange[];
}

export interface DiffChange {
  type: "added" | "removed" | "unchanged";
  line: number;
  content: string;
}

// Job Types
export type JobType = "write_article" | "generate_outline" | "research_topics";
export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job<TInput = unknown, TOutput = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  input: TInput;
  output: TOutput | null;
  error: JobError | null;
  progress: JobProgress | null;
  user_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface JobProgress {
  current: number;
  total: number;
  message: string;
  metadata?: {
    sectionsCompleted?: number;
    currentSection?: string;
    wordCount?: number;
  };
}

// Specific job input/output types
export interface WriteArticleJobInput {
  outlineId: string;
  customInstructions?: string;
}

export interface WriteArticleJobOutput {
  articleId: string;
  article: Article;
  metadata: {
    wordCount: number;
    readingTime: number;
    sectionsWritten: number;
  };
}

export interface GenerateOutlineJobInput {
  topicId: string;
  articleType: ArticleType;
  targetLength: TargetLength;
  tone?: string;
  customInstructions?: string;
}

export interface GenerateOutlineJobOutput {
  outlineId: string;
  outline: Outline;
}

// Export database types for Supabase
export interface Database {
  public: {
    Tables: {
      industries: {
        Row: Industry;
        Insert: Omit<Industry, "id" | "created_at">;
        Update: Partial<Omit<Industry, "id">>;
      };
      topics: {
        Row: Topic;
        Insert: Omit<Topic, "id" | "discovered_at">;
        Update: Partial<Omit<Topic, "id">>;
      };
      outlines: {
        Row: Outline;
        Insert: Omit<Outline, "id" | "created_at">;
        Update: Partial<Omit<Outline, "id">>;
      };
      articles: {
        Row: Article;
        Insert: Omit<Article, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Article, "id">>;
      };
      article_links: {
        Row: ArticleLink;
        Insert: Omit<ArticleLink, "id" | "created_at">;
        Update: Partial<Omit<ArticleLink, "id">>;
      };
      article_versions: {
        Row: ArticleVersion;
        Insert: Omit<ArticleVersion, "id" | "created_at">;
        Update: Partial<Omit<ArticleVersion, "id">>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<
          Job,
          "id" | "created_at" | "updated_at" | "started_at" | "completed_at"
        > & {
          started_at?: string;
          completed_at?: string;
        };
        Update: Partial<Omit<Job, "id" | "created_at">>;
      };
    };
  };
}