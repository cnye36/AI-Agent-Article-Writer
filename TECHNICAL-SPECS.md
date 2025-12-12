# Content Studio - Technical Specification & Developer Guide

> **Version:** 1.0.0  
> **Last Updated:** December 2024  
> **Stack:** Next.js 14, TypeScript, Supabase, Anthropic Claude, LangGraph, TipTap

This document provides comprehensive technical documentation for developers and AI assistants working on the Content Studio codebase.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Agent System](#agent-system)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [Type System](#type-system)
9. [Code Patterns & Conventions](#code-patterns--conventions)
10. [Security Considerations](#security-considerations)
11. [Performance Optimization](#performance-optimization)
12. [Testing Strategy](#testing-strategy)
13. [Deployment](#deployment)
14. [Common Tasks](#common-tasks)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Next.js App)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Dashboard Page  │  Article Page  │  Create Flow  │  Topic Feed         │
│       ↓                 ↓               ↓              ↓                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Custom Hooks Layer                            │   │
│  │  useArticleGeneration  │  useEditor  │  useLinkSuggestions      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTP/REST
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          API LAYER (Next.js Routes)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  /api/agents/*     │  /api/ai/*      │  /api/articles/*                 │
│  - research        │  - edit         │  - CRUD                          │
│  - outline         │                 │  - versions                      │
│  - write           │                 │  - links                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SUPABASE    │    │    ANTHROPIC    │    │    LANGGRAPH    │
│   (Database)  │    │    (Claude AI)  │    │    (Agents)     │
└───────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

```
User Input → React Component → Custom Hook → API Route → Agent/Database → Response → State Update → UI Render
```

### Key Design Principles

1. **Separation of Concerns** - UI components don't contain business logic
2. **Type Safety** - Full TypeScript coverage with strict mode
3. **Optimistic Updates** - UI updates immediately, syncs in background
4. **Error Boundaries** - Graceful error handling at every layer
5. **Progressive Enhancement** - Core functionality works without JS

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |

### Backend Services
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | PostgreSQL database + Auth |
| Anthropic SDK | Latest | Claude AI integration |
| LangGraph | 0.2.x | Multi-agent orchestration |

### UI Libraries
| Technology | Version | Purpose |
|------------|---------|---------|
| TipTap | 2.6.x | Rich text editor |
| Tailwind CSS | 3.x | Styling |
| clsx + tailwind-merge | Latest | Class name utilities |

### Validation & Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| Zod | 3.x | Runtime type validation |
| date-fns | (optional) | Date formatting |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  industries │       │   topics    │       │  outlines   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ industry_id │       │ id (PK)     │
│ name        │       │ id (PK)     │◄──────│ topic_id    │
│ slug        │       │ title       │       │ structure   │
│ keywords[]  │       │ summary     │       │ article_type│
│ created_at  │       │ sources     │       │ approved    │
└─────────────┘       │ status      │       └──────┬──────┘
                      │ metadata    │              │
                      └─────────────┘              │
                                                   │
┌─────────────┐       ┌─────────────┐              │
│article_links│       │  articles   │◄─────────────┘
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ source_id   │──────►│ outline_id  │
│ target_id   │──────►│ industry_id │───────►[industries]
│ anchor_text │       │ title       │
│ context     │       │ slug        │       ┌─────────────┐
└─────────────┘       │ content     │       │article_vers │
                      │ status      │       ├─────────────┤
                      │ word_count  │       │ id (PK)     │
                      │ seo_keywords│       │ article_id  │──►[articles]
                      └─────────────┘       │ content     │
                                            │ edited_by   │
                                            └─────────────┘
```

### Table Definitions

#### `industries`
```sql
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,              -- Display name: "AI & Machine Learning"
  slug TEXT NOT NULL UNIQUE,              -- URL-safe: "ai"
  keywords TEXT[] DEFAULT '{}',           -- Search keywords for this industry
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `topics`
```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                    -- Topic title from research
  summary TEXT,                           -- 2-3 sentence summary
  industry_id UUID REFERENCES industries(id),
  sources JSONB DEFAULT '[]',             -- Array of {url, title, snippet, date}
  relevance_score FLOAT DEFAULT 0,        -- 0.0 to 1.0
  status TEXT DEFAULT 'pending',          -- pending|approved|rejected|used
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'             -- {angle, discoveredAt, searchKeywords}
);
```

#### `outlines`
```sql
CREATE TABLE outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id),
  structure JSONB NOT NULL,               -- OutlineStructure type
  article_type TEXT NOT NULL,             -- blog|technical|news|opinion|tutorial
  target_length TEXT NOT NULL,            -- short|medium|long
  tone TEXT DEFAULT 'professional',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved BOOLEAN DEFAULT FALSE
);
```

**`structure` JSONB Schema:**
```typescript
interface OutlineStructure {
  title: string;
  hook: string;
  sections: {
    heading: string;
    keyPoints: string[];
    wordTarget: number;
    suggestedLinks?: { articleId: string; anchorText: string }[];
  }[];
  conclusion: {
    summary: string;
    callToAction: string;
  };
  seoKeywords: string[];
  metadata?: {
    articleType: string;
    targetLength: string;
    tone: string;
    totalWordTarget: number;
    sectionCount: number;
  };
}
```

#### `articles`
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outline_id UUID REFERENCES outlines(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,              -- URL-safe, auto-generated
  content TEXT NOT NULL,                  -- Markdown content
  content_html TEXT,                      -- Pre-rendered HTML
  excerpt TEXT,                           -- 160 char summary for SEO
  industry_id UUID REFERENCES industries(id),
  article_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',            -- draft|review|published
  word_count INT,
  reading_time INT,                       -- Minutes (word_count / 200)
  seo_keywords TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  published_to TEXT[] DEFAULT '{}',       -- ['blog', 'medium', 'reddit']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full-text search vector (auto-generated)
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);

-- Search index
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);
```

#### `article_links`
```sql
CREATE TABLE article_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  target_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  anchor_text TEXT,                       -- The linked text
  context TEXT,                           -- Surrounding sentence
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_article_id, target_article_id, anchor_text)
);
```

#### `article_versions`
```sql
CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,                  -- Full content snapshot
  edited_by TEXT,                         -- 'user' | 'ai'
  change_summary TEXT,                    -- Description of changes
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Reference

### Agent Endpoints

#### POST `/api/agents/research`
Runs the Research Agent to discover trending topics.

**Request:**
```typescript
{
  industry: string;        // Industry slug: "ai", "tech", etc.
  keywords?: string[];     // Optional additional search keywords
  maxTopics?: number;      // 1-20, default: 5
}
```

**Response:**
```typescript
{
  success: boolean;
  topics: Topic[];
  metadata: {
    industry: string;
    keywordsUsed: string[];
    existingArticlesChecked: number;
    topicsDiscovered: number;
  }
}
```

#### GET `/api/agents/research`
Fetches existing topics.

**Query Parameters:**
- `industry` (optional): Filter by industry slug
- `status` (optional): Filter by status (default: "pending")
- `limit` (optional): Max results (default: 20)

---

#### POST `/api/agents/outline`
Generates an article outline from a topic.

**Request:**
```typescript
{
  topicId: string;         // UUID of the topic
  articleType: "blog" | "technical" | "news" | "opinion" | "tutorial";
  targetLength: "short" | "medium" | "long";
  tone?: string;           // default: "professional"
  customInstructions?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  outline: Outline;
  relatedArticles: { id: string; title: string; slug: string }[];
}
```

#### PATCH `/api/agents/outline`
Approves or updates an outline.

**Request:**
```typescript
{
  outlineId: string;
  approved?: boolean;
  structure?: OutlineStructure;  // For editing
}
```

---

#### POST `/api/agents/write`
Generates a full article from an approved outline.

**Request:**
```typescript
{
  outlineId: string;
  customInstructions?: string;
  streamResponse?: boolean;      // Not yet implemented
}
```

**Response:**
```typescript
{
  success: boolean;
  article: Article;
  metadata: {
    wordCount: number;
    readingTime: number;
    internalLinksCount: number;
    sectionsWritten: number;
  }
}
```

---

### AI Edit Endpoint

#### POST `/api/ai/edit`
Streaming AI edit for selected text.

**Request:**
```typescript
{
  selectedText: string;
  action: "rewrite" | "expand" | "simplify" | "custom" | "fix_grammar" | "change_tone";
  customPrompt?: string;      // Required if action is "custom"
  targetTone?: string;        // Required if action is "change_tone"
  context?: {
    beforeText?: string;      // ~100 chars before selection
    afterText?: string;       // ~100 chars after selection
    articleType?: string;
    tone?: string;
  }
}
```

**Response:** Streaming text (not JSON)

#### PUT `/api/ai/edit`
Non-streaming version (returns JSON).

#### PATCH `/api/ai/edit`
Batch edit (up to 10 edits).

---

### Articles Endpoints

#### GET `/api/articles`
List/search articles.

**Query Parameters:**
- `id`: Fetch single article by ID
- `query`: Full-text search
- `industryId`: Filter by industry
- `articleType`: Filter by type
- `status`: Filter by status
- `sortBy`: `created_at` | `updated_at` | `title` | `word_count`
- `sortOrder`: `asc` | `desc`
- `limit`: Max results (default: 20)
- `offset`: Pagination offset

**Response (list):**
```typescript
{
  articles: Article[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }
}
```

**Response (single with id):**
```typescript
{
  article: Article;
  versions: ArticleVersion[];
  links: {
    outgoing: ArticleLink[];
    incoming: ArticleLink[];
  }
}
```

#### POST `/api/articles`
Create new article.

**Request:**
```typescript
{
  title: string;
  content: string;
  excerpt?: string;           // Auto-generated if not provided
  industryId: string;
  articleType: string;
  status?: string;            // default: "draft"
  seoKeywords?: string[];
  outlineId?: string;
}
```

#### PUT `/api/articles`
Update article.

**Request:**
```typescript
{
  id: string;                 // Required
  title?: string;
  content?: string;
  excerpt?: string;
  status?: string;
  seoKeywords?: string[];
  publishedTo?: string[];
  saveVersion?: boolean;      // default: true
  editedBy?: "user" | "ai";   // default: "user"
  changeSummary?: string;
}
```

#### DELETE `/api/articles`
Delete article.

**Query Parameters:**
- `id`: Article ID to delete

---

### Version Endpoints

#### GET `/api/articles/versions`
Fetch version history.

**Query Parameters:**
- `articleId`: Required
- `versionId`: Optional, fetch specific version
- `limit`: Max results (default: 20)

#### POST `/api/articles/versions`
Restore a previous version.

**Request:**
```typescript
{
  articleId: string;
  versionId: string;
}
```

#### PUT `/api/articles/versions`
Compare two versions.

**Request:**
```typescript
{
  articleId: string;
  versionId1: string;
  versionId2?: string;        // If omitted, compare to current
}
```

---

### Links Endpoints

#### GET `/api/articles/links`
Fetch links for an article.

**Query Parameters:**
- `articleId`: Required
- `direction`: `outgoing` | `incoming` | `both` (default: "both")

#### POST `/api/articles/links`
Create link or get suggestions.

**Request (create):**
```typescript
{
  sourceArticleId: string;
  targetArticleId: string;
  anchorText: string;
  context?: string;
}
```

**Request (suggest):**
```typescript
{
  action: "suggest";
  articleId: string;
  selectedText: string;
}
```

#### PUT `/api/articles/links`
Get AI-powered link suggestions for entire article.

**Request:**
```typescript
{
  articleId: string;
  content?: string;           // If omitted, fetched from DB
  maxSuggestions?: number;    // default: 10
}
```

---

## Agent System

### Agent Architecture

The system uses three specialized agents orchestrated by LangGraph:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                                │
│                    (StateGraph with Checkpointer)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│   │   RESEARCH   │───►│   OUTLINE    │───►│    WRITER    │        │
│   │    AGENT     │    │    AGENT     │    │    AGENT     │        │
│   └──────────────┘    └──────────────┘    └──────────────┘        │
│         │                   │                   │                  │
│         ▼                   ▼                   ▼                  │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │                    SHARED STATE                           │    │
│   │  - topics[], selectedTopic, outline, article, stage      │    │
│   └──────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Research Agent

**Purpose:** Discover trending topics and news in a given industry.

**Nodes:**
1. `search` - Queries web for industry news using Tavily
2. `analyze` - Extracts topic candidates from search results
3. `filter` - Removes duplicates and similar topics to existing articles

**State:**
```typescript
interface ResearchState {
  industry: string;
  keywords: string[];
  existingTopics: string[];
  discoveredTopics: TopicCandidate[];
  sources: Source[];
}
```

**Prompt Focus:**
- Finding unique angles not covered elsewhere
- Assessing relevance and timeliness
- Gathering credible sources

### Outline Agent

**Purpose:** Create structured article outlines with SEO optimization.

**Nodes:**
1. `fetchRelated` - Queries database for related articles
2. `createOutline` - Generates outline structure with AI

**State:**
```typescript
interface OutlineState {
  topic: TopicCandidate;
  articleType: ArticleType;
  targetLength: TargetLength;
  tone: string;
  relatedArticles: RelatedArticle[];
  outline: ArticleOutline;
}
```

**Output Structure:**
- Title (compelling, SEO-optimized)
- Hook (opening sentence)
- Sections (3-10 depending on length)
  - Heading
  - Key points (specific, not vague)
  - Word target
  - Suggested internal links
- Conclusion
- SEO keywords

### Writer Agent

**Purpose:** Generate high-quality article content section by section.

**Nodes:**
1. `writeSection` - Writes one section at a time
2. `compile` - Assembles sections into full article
3. `polish` - Final pass for consistency and flow

**State:**
```typescript
interface WriterState {
  outline: ArticleOutline;
  articleType: ArticleType;
  tone: string;
  sources: Source[];
  currentSection: number;
  sections: string[];
  fullArticle: string;
}
```

**Writing Guidelines:**
- Match tone to article type
- Follow outline structure exactly
- Incorporate sources naturally
- Insert internal links where suggested
- Vary sentence structure
- Avoid fluff

---

## Component Architecture

### Component Hierarchy

```
App
├── Dashboard (app/dashboard/page.tsx)
│   ├── CreateArticleFlow
│   │   ├── ConfigStage
│   │   ├── TopicsStage
│   │   ├── OutlineStage
│   │   ├── WritingStage
│   │   └── CanvasEditor
│   ├── TopicFeed
│   │   └── TopicCard
│   └── ArticleLibrary
│       ├── ArticleCard
│       └── ArticleListItem
│
└── ArticlePage (app/article/[id]/page.tsx)
    └── CanvasEditor
        ├── EditorContent (TipTap)
        ├── BubbleMenu
        ├── AIAssistantPanel
        ├── VersionHistoryPanel
        └── LinkSuggestionsPanel
```

### Component Responsibilities

#### `CanvasEditor`
The core editing component with AI assistance.

**Props:**
```typescript
interface CanvasEditorProps {
  initialContent: string;
  articleId: string;
  articleType?: ArticleType;
  tone?: string;
  onSave: (content: string) => Promise<void>;
  onPublish?: () => Promise<void>;
}
```

**Internal State:**
- `isSaving` - Save operation in progress
- `lastSaved` - Timestamp of last save
- `showAiPanel` - AI panel visibility
- `showVersions` - Version panel visibility
- `showLinkPanel` - Links panel visibility
- `customPrompt` - User's custom AI instruction

**Key Features:**
- TipTap editor integration
- Bubble menu on text selection
- Auto-save with debouncing
- Version history integration
- AI editing streaming

#### `CreateArticleFlow`
Multi-step wizard for article creation.

**Stages:**
1. `config` - Industry, type, length, tone selection
2. `topics` - Topic selection from research results
3. `outline` - Outline review and editing
4. `writing` - Progress indicator during generation
5. `editing` - Full canvas editor

**State Management:** Uses `useArticleGeneration` hook

#### `TopicFeed`
Displays and manages discovered topics.

**Features:**
- Industry filter
- Status filter (pending/approved/rejected/used)
- Refresh button to run Research Agent
- Topic cards with relevance scores
- Source preview

#### `ArticleLibrary`
Article management interface.

**Features:**
- Full-text search
- Multi-filter support
- Grid/list view toggle
- Bulk operations
- Pagination

---

## State Management

### Hook-Based State

The application uses custom hooks for state management rather than a global store.

#### `useArticleGeneration`
Manages the full article creation pipeline.

**State:**
```typescript
{
  stage: GenerationStage;
  config: GenerationConfig;
  topics: Topic[];
  selectedTopic: Topic | null;
  outline: Outline | null;
  article: Article | null;
  isLoading: boolean;
  error: string | null;
}
```

**Actions:**
- `setConfig(updates)` - Update configuration
- `startResearch(config)` - Run Research Agent
- `selectTopic(topic)` - Select and generate outline
- `rejectTopic(topicId)` - Mark topic as rejected
- `approveOutline()` - Approve and start writing
- `editOutline(structure)` - Modify outline
- `reset()` - Reset to initial state
- `goToStage(stage)` - Navigate to previous stage

#### `useEditor`
Manages editor state and AI interactions.

**State:**
```typescript
{
  selectedText: string;
  selectionRange: { from: number; to: number } | null;
  isAiLoading: boolean;
  aiResult: string | null;
  aiError: string | null;
  versions: VersionInfo[];
}
```

**Actions:**
- `handleSelectionChange(editor)` - Track selection
- `applyAiEdit(action, customPrompt?)` - Request AI edit
- `applyResult()` - Apply AI suggestion to editor
- `discardResult()` - Discard AI suggestion
- `saveVersion(content, summary?)` - Manual save
- `restoreVersion(versionId)` - Restore previous version
- `enableAutoSave(editor, onSave)` - Start auto-save

#### `useLinkSuggestions`
Manages internal link suggestions.

**Actions:**
- `getSuggestionsForSelection(text)` - Get suggestions for selected text
- `getAllSuggestions()` - Get suggestions for entire article
- `createLink(targetId, anchor, context?)` - Create a link

---

## Type System

### Core Types

```typescript
// Enums
type ArticleType = "blog" | "technical" | "news" | "opinion" | "tutorial";
type ArticleStatus = "draft" | "review" | "published";
type TopicStatus = "pending" | "approved" | "rejected" | "used";
type TargetLength = "short" | "medium" | "long";
type EditAction = "rewrite" | "expand" | "simplify" | "custom" | "fix_grammar" | "change_tone";

// Database entities (see Database Schema section for full definitions)
interface Industry { ... }
interface Topic { ... }
interface Outline { ... }
interface Article { ... }
interface ArticleLink { ... }
interface ArticleVersion { ... }

// API types
interface ResearchRequest { ... }
interface OutlineRequest { ... }
interface WriteRequest { ... }
interface EditRequest { ... }

// Component props
interface CanvasEditorProps { ... }
interface TopicCardProps { ... }
interface ArticleCardProps { ... }

// State types
interface GenerationConfig {
  industry: string;
  articleType: ArticleType;
  targetLength: TargetLength;
  tone: string;
}

type GenerationStage = "config" | "topics" | "outline" | "writing" | "editing";
```

### Database Type Integration

The `Database` type in `/types/index.ts` provides full Supabase typing:

```typescript
interface Database {
  public: {
    Tables: {
      industries: {
        Row: Industry;
        Insert: Omit<Industry, "id" | "created_at">;
        Update: Partial<Omit<Industry, "id">>;
      };
      // ... other tables
    };
  };
}
```

---

## Code Patterns & Conventions

### File Naming
- Components: `kebab-case.tsx` (e.g., `canvas-editor.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-editor.ts`)
- Types: `index.ts` in `/types` directory
- API routes: `route.ts` in appropriate directory

### Component Structure
```typescript
"use client"; // Only if needed

import { ... } from "react";
import { ... } from "@/lib/...";
import { ... } from "@/hooks/...";
import type { ... } from "@/types";

interface ComponentProps {
  // Props definition
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks
  const [state, setState] = useState();
  const { data } = useCustomHook();
  
  // 2. Derived state
  const derivedValue = useMemo(() => ..., [deps]);
  
  // 3. Callbacks
  const handleAction = useCallback(() => {
    // ...
  }, [deps]);
  
  // 4. Effects
  useEffect(() => {
    // ...
  }, [deps]);
  
  // 5. Early returns
  if (loading) return <Loading />;
  if (error) return <Error />;
  
  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### API Route Structure
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 1. Validation schema
const RequestSchema = z.object({ ... });

// 2. Handler
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Validate request
    const body = await request.json();
    const result = RequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }
    
    // Business logic
    const data = result.data;
    // ...
    
    // Success response
    return NextResponse.json({ success: true, data: ... });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Operation failed", details: error.message },
      { status: 500 }
    );
  }
}
```

### Error Handling
```typescript
// In hooks - set error state
try {
  // ...
} catch (err) {
  setError(err instanceof Error ? err.message : "An error occurred");
}

// In API routes - return JSON error
catch (error) {
  return NextResponse.json(
    { error: "Description", details: error.message },
    { status: 500 }
  );
}

// In components - display error UI
{error && (
  <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
    <p className="text-red-400">{error}</p>
  </div>
)}
```

### Styling Conventions
```typescript
// Use cn() for conditional classes
import { cn } from "@/lib/utils";

<button
  className={cn(
    "px-4 py-2 rounded-lg transition-colors",
    isActive ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}
>

// Color palette (dark theme)
// Background: zinc-950 (darkest), zinc-900, zinc-800
// Text: white, zinc-300, zinc-400, zinc-500
// Accent: blue-600, blue-500, blue-400
// Success: green-600, green-500
// Error: red-600, red-500, red-400
// Warning: yellow-600, yellow-500
```

---

## Security Considerations

### Authentication
- All API routes check Supabase auth
- Server-side client uses cookies for auth state
- Client-side uses browser client with session

### Input Validation
- All API inputs validated with Zod schemas
- SQL injection prevented by Supabase parameterized queries
- XSS prevented by React's default escaping

### Content Security
- `dangerouslySetInnerHTML` should use DOMPurify
- User content stored as markdown, rendered server-side
- No eval() or dynamic code execution

### API Security
- Rate limiting should be added for AI endpoints
- API keys stored in environment variables
- No sensitive data in client-side code

---

## Performance Optimization

### Database
- Full-text search index on articles
- Industry and status indexes for filtering
- Pagination for large result sets

### Frontend
- Code splitting with Next.js dynamic imports
- Optimistic UI updates
- Debounced auto-save
- Memoized expensive computations

### AI Operations
- Streaming responses for long operations
- Section-by-section writing to show progress
- Caching of industry keywords

---

## Testing Strategy

### Unit Tests
- Utility functions in `/lib/utils.ts`
- Type validation schemas
- Component rendering

### Integration Tests
- API route handlers
- Database operations
- Auth flows

### E2E Tests
- Full article creation flow
- Editor functionality
- Search and filtering

### Test Commands
```bash
pnpm test           # Run all tests
pnpm test:unit      # Unit tests only
pnpm test:e2e       # E2E tests
pnpm test:coverage  # Coverage report
```

---

## Deployment

### Environment Variables
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=

# Optional
TAVILY_API_KEY=                  # For web search
NEXT_PUBLIC_APP_URL=             # For absolute URLs
```

### Vercel Deployment
```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### Database Migrations
Run SQL migrations in Supabase dashboard or using CLI:
```bash
supabase db push
```

---

## Common Tasks

### Adding a New Industry

1. Add to `INDUSTRY_KEYWORDS` in `/app/api/agents/research/route.ts`:
```typescript
const INDUSTRY_KEYWORDS = {
  // ...existing
  newIndustry: ["keyword1", "keyword2", ...],
};
```

2. Add to industry names map:
```typescript
const industryNames = {
  // ...existing
  newIndustry: "Display Name",
};
```

3. Add to frontend in `/components/create-article-flow.tsx`:
```typescript
const industries = [
  // ...existing
  { id: "newIndustry", label: "Display Name", icon: "🆕" },
];
```

### Adding a New Article Type

1. Update types in `/types/index.ts`:
```typescript
type ArticleType = "blog" | "technical" | ... | "newType";
```

2. Add configuration in `/app/api/agents/outline/route.ts`:
```typescript
const ARTICLE_TYPE_CONFIG = {
  // ...existing
  newType: {
    description: "Description",
    sectionCount: { short: 3, medium: 5, long: 7 },
    formalityLevel: "formal",
  },
};
```

3. Add to frontend configuration.

### Adding a New AI Edit Action

1. Add to types in `/types/index.ts`:
```typescript
type EditAction = ... | "new_action";
```

2. Add prompt in `/app/api/ai/edit/route.ts`:
```typescript
const ACTION_PROMPTS = {
  // ...existing
  new_action: `System prompt for new action...`,
};
```

3. Add UI in `/components/canvas-editor.tsx`.

### Modifying the Editor

The editor uses TipTap. To add new formatting:

1. Install extension:
```bash
pnpm add @tiptap/extension-name
```

2. Add to editor config:
```typescript
const editor = useTiptapEditor({
  extensions: [
    // ...existing
    NewExtension.configure({ options }),
  ],
});
```

3. Add toolbar button if needed.

---

## Appendix: Full Type Definitions

See `/types/index.ts` for complete type definitions.

---

*This document should be updated whenever significant architectural changes are made to the codebase.*