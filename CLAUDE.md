# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev              # Start development server (localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

### Package Management
This project uses **pnpm** (not npm). Always use `pnpm install` to add dependencies.

## Architecture Overview

### Multi-Agent System
The application uses a **three-agent pipeline** orchestrated by LangGraph:

1. **Research Agent** (`agents/research-agent.ts`)
   - Discovers trending topics via web search
   - Filters duplicates against existing articles
   - Returns topic candidates with sources and relevance scores

2. **Outline Agent** (`agents/outline-agent.ts`)
   - Creates structured article outlines from selected topics
   - Generates SEO keywords and internal linking suggestions
   - Outputs: title, hook, sections (with key points + word targets), conclusion

3. **Writer Agent** (`agents/writer-agent.ts`)
   - Writes articles section-by-section
   - Follows outline structure exactly
   - Incorporates sources and suggested internal links

**Orchestrator** (`agents/orchastrator.ts` - note the typo in filename):
- Uses LangGraph StateGraph with MemorySaver for state persistence
- Pipeline stages: research → topic selection (manual) → outline → write
- State includes: industry, articleType, targetLength, tone, topics, selectedTopic, outline, article

### State Management Pattern
**No global state store (Redux/Zustand)**. Uses custom React hooks for encapsulated state:

- `useArticleGeneration` - Full creation pipeline (config, topics, outline, article)
- `useEditor` - Editor state + AI interactions (selection, AI results, versions)
- `useAuth` - Supabase authentication

### AI Integration
- **Anthropic SDK**: Currently using OpenAI SDK (`lib/ai/openai.ts`) but configured for Anthropic in code
- **Streaming edits**: `/api/ai/edit` supports streaming responses for inline editing
- **AI actions**: rewrite, expand, simplify, fix_grammar, change_tone, custom

## Database (Supabase PostgreSQL)

### Key Schema Relationships
```
industries ──┬─► topics ──► outlines ──► articles
             │                           │
             └───────────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
                    article_links                  article_versions
```

### Critical Details
- **Full-text search**: `articles.search_vector` (GIN index) auto-generated from title + excerpt + content
- **Article status**: draft | review | published
- **Topic status**: pending | approved | rejected | used
- **Versions**: Every save creates `article_versions` entry (content snapshot + change_summary)
- **Internal links**: `article_links` tracks source → target with anchor_text + context

### Authentication
- All `/api/*` routes check Supabase auth via `createClient()` from `@/lib/supabase/server`
- `middleware.ts` refreshes auth session for all requests
- Uses cookie-based auth (SSR pattern with `@supabase/ssr`)

## File Structure & Conventions

### Path Aliases
Use `@/*` imports (configured in tsconfig.json):
```typescript
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/types";
```

### Component Naming
- Files: `kebab-case.tsx` (e.g., `canvas-editor.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-editor.ts`)
- API routes: `route.ts` in `/app/api/{endpoint}/`

### API Route Pattern
All routes use this structure:
```typescript
export async function POST(request: NextRequest) {
  // 1. Auth check (createClient + getUser)
  // 2. Request validation (Zod schema)
  // 3. Business logic
  // 4. Return NextResponse.json({ success, data })
}
```

Error responses:
```typescript
return NextResponse.json(
  { error: "Description", details: error.message },
  { status: 500 }
);
```

## Key API Endpoints

### Agent Endpoints
- `POST /api/agents/research` - Discover topics (body: `{ industry, keywords?, maxTopics? }`)
- `GET /api/agents/research` - Fetch existing topics (query: `industry`, `status`, `limit`)
- `POST /api/agents/outline` - Generate outline (body: `{ topicId, articleType, targetLength, tone? }`)
- `POST /api/agents/write` - Write full article (body: `{ outlineId, customInstructions? }`)

### AI Editing
- `POST /api/ai/edit` - Streaming edit (body: `{ selectedText, action, customPrompt?, targetTone?, context? }`)

### Articles
- `GET /api/articles?id={uuid}` - Single article with versions + links
- `GET /api/articles?query={text}` - Full-text search (uses search_vector)
- `PUT /api/articles` - Update article (auto-saves version if `saveVersion: true`)

### Versions & Links
- `GET /api/articles/versions?articleId={uuid}` - Version history
- `POST /api/articles/versions` - Restore version
- `PUT /api/articles/links` - Get AI link suggestions for entire article

## Important Implementation Details

### Environment Variables
Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=        # Or OPENAI_API_KEY depending on AI provider
TAVILY_API_KEY=           # Optional: for Research Agent web search
```

**Note**: `middleware.ts:14` references `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` but this should likely be `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Auto-Save Pattern
Editor uses debounced auto-save (default 30s interval via `useEditor` hook):
```typescript
const { enableAutoSave } = useEditor({ articleId, articleType, tone });
enableAutoSave(editor, onSave);
```

### Industry Configuration
Industries defined in `/app/api/agents/research/route.ts`:
```typescript
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  ai: ["artificial intelligence", "machine learning", ...],
  tech: ["technology", "software", ...],
  // ...add more here
};
```

Also hardcoded in `agents/orchastrator.ts` (`getIndustryKeywords` function).

### TipTap Editor Extensions
Located in canvas editor component. To add formatting:
1. Install extension: `pnpm add @tiptap/extension-{name}`
2. Add to editor config in component
3. Add toolbar button if needed

### Styling
- **Framework**: Tailwind CSS v4
- **Color palette**: Dark theme (zinc-950/900/800 backgrounds, blue-600/500 accents)
- **Utility**: Use `cn()` from `@/lib/utils` for conditional classes

## Common Pitfalls

1. **File typo**: Orchestrator is spelled `orchastrator.ts` (missing "e")
2. **Two AI clients**: Both `lib/ai/openai.ts` and potential Anthropic client exist - verify which is active
3. **Manual approval step**: Orchestrator has `awaitTopicSelection` node that requires user input (not automated)
4. **Supabase client context**: Use `@/lib/supabase/server` in API routes (server components), different client for client components
5. **Version creation**: Enabled by default (`saveVersion: true` in PUT /api/articles) - disable if not desired

## Testing
Currently no test commands configured. To add:
- Add test scripts to `package.json`
- Use Vitest or Jest for unit/integration tests
- Consider Playwright for E2E testing the article creation flow
