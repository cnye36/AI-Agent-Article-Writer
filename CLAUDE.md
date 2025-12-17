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
- **Image generation**: Google Generative AI (Imagen 4.0 Fast) via `lib/ai/image-generation.ts`

### Image Generation System
The application includes AI-powered image generation integrated into the article editor:

**Features:**
- Context-aware image generation from selected text
- Custom prompt-based image creation
- Cover image generation for articles
- Drag-and-drop image placement in editor
- Click-to-preview modal for full-size inspection
- Image library management per article
- Delete images from canvas via bubble menu

**Technical Stack:**
- **AI Model**: Google Imagen 4.0 Fast (via Google Generative AI API)
- **Prompt Enhancement**: GPT-4o generates detailed prompts from article context
- **Storage**: Base64 data URLs in Supabase `article_images` table
- **UI**: TipTap Image extension with custom handlers for click/drag/delete

## Database (Supabase PostgreSQL)

### Key Schema Relationships
```
industries ──┬─► topics ──► outlines ──► articles
             │                           │
             └───────────────────────────┘
                                         │
                         ┌───────────────┴───────────────────────┐
                         │                │                      │
                    article_links   article_versions      article_images
```

### Critical Details
- **Full-text search**: `articles.search_vector` (GIN index) auto-generated from title + excerpt + content
- **Article status**: draft | review | published
- **Topic status**: pending | approved | rejected | used
- **Versions**: Every save creates `article_versions` entry (content snapshot + change_summary)
- **Internal links**: `article_links` tracks source → target with anchor_text + context
- **Images**: `article_images` stores AI-generated images with base64 data URLs, prompts, and cover flag
  - Cascade delete when article is deleted
  - `is_cover` flag marks the article's cover image
  - `prompt` stores the AI generation prompt for reference
  - Index on `article_id` for fast lookups

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

### AI Image Generation
- `POST /api/ai/generate-image` - Generate image via Google Imagen (body: `{ prompt?, sectionContent?, context?, articleId, isCover? }`)
  - If `sectionContent` provided without `prompt`, GPT-4o generates a detailed prompt
  - Returns base64 image data and saves to database if `articleId` provided
  - Supports aspect ratios: 1:1, 16:9, 4:3 (default: 16:9)

### Articles
- `GET /api/articles?id={uuid}` - Single article with versions + links + images
- `GET /api/articles?query={text}` - Full-text search (uses search_vector)
- `PUT /api/articles` - Update article (auto-saves version if `saveVersion: true`)

### Article Images
- `PATCH /api/articles/images` - Set/unset cover image (body: `{ articleId, imageId, isCover }`)
  - Automatically unsets previous cover image when setting new one
  - Updates `articles.cover_image` field

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
ANTHROPIC_API_KEY=                  # Or OPENAI_API_KEY depending on AI provider
OPENAI_API_KEY=                     # For GPT-4o (prompt generation)
GOOGLE_GENERATIVE_AI_API_KEY=       # For Google Imagen 4.0 Fast (image generation)
TAVILY_API_KEY=                     # Optional: for Research Agent web search
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
Located in `components/canvas-editor.tsx`. Current extensions:
- **StarterKit**: Basic formatting (bold, italic, headings, lists, etc.)
- **Underline**: Underline text formatting
- **Image**: Enhanced with custom click handlers, deletion, and preview
- **Link**: Clickable links with custom styling
- **Placeholder**: "Start writing..." placeholder text
- **LoadingMark**: Custom mark for AI loading state (pulsing animation)

**Image Extension Features:**
- Click images to preview in full-screen modal
- Select images to show bubble menu with View/Delete options
- Drag & drop from image library to canvas
- Automatic spacing (paragraph breaks before/after)
- Smart insertion at block boundaries (prevents sentence splitting)
- Hover effect (blue ring) for visual feedback

To add new extensions:
1. Install extension: `pnpm add @tiptap/extension-{name}`
2. Add to editor config in component
3. Add toolbar button if needed

### Styling
- **Framework**: Tailwind CSS v4
- **Color palette**: Dark theme (zinc-950/900/800 backgrounds, blue-600/500 accents)
- **Utility**: Use `cn()` from `@/lib/utils` for conditional classes

### Canvas Editor & Image Workflow
The canvas editor (`components/canvas-editor.tsx`) is a TipTap-based rich text editor with AI assistance:

**AI Assistant Panel** (sidebar with tabs):
1. **Text Edit Tab**: AI text editing (rewrite, expand, simplify, custom)
2. **Image Gen Tab**: AI image generation with three modes:
   - Context-aware: Generate from selected text
   - Custom prompt: Create from description
   - Cover image: Generate from full article context

**Image Generation Flow:**
1. User selects text or provides prompt
2. (Optional) GPT-4o enhances prompt with visual details
3. Google Imagen 4.0 Fast generates image
4. Image saved to database with metadata
5. Image inserted into editor with proper spacing
6. Image added to library in sidebar

**Image Library Features:**
- Thumbnail grid view (2 columns)
- Click to preview full-size
- Drag to insert into editor
- Right-click to set as cover
- Visual indicator for cover image

**Canvas Interaction:**
- Click image → Full-screen preview modal
- Select image → Bubble menu (View/Delete)
- Drag from library → Insert at block boundary
- Delete via bubble menu → Remove from canvas

**State Management:**
- `isGeneratingImage`: Loading state for generation
- `previewImage`: Currently viewed image in modal
- `activeTab`: Current tab in AI panel
- Images passed from parent via props (single source of truth)

## Common Pitfalls

1. **File typo**: Orchestrator is spelled `orchastrator.ts` (missing "e")
2. **Two AI clients**: Both `lib/ai/openai.ts` and potential Anthropic client exist - verify which is active
3. **Manual approval step**: Orchestrator has `awaitTopicSelection` node that requires user input (not automated)
4. **Supabase client context**: Use `@/lib/supabase/server` in API routes (server components), different client for client components
5. **Version creation**: Enabled by default (`saveVersion: true` in PUT /api/articles) - disable if not desired
6. **Image storage**: Images stored as base64 data URLs in database (not file storage)
   - For production, consider migrating to cloud storage (S3, Cloudinary) to reduce database size
   - Base64 URLs are large (~33% larger than binary) and can slow queries
   - Current implementation optimized for MVP/prototyping
7. **Image insertion timing**: Never call `setActiveTab()` inside a `useEffect` - causes cascading renders
   - Call explicitly in button click handlers instead
   - Tab state persists across re-renders unless component unmounts
8. **TipTap image positioning**: Always insert at block boundaries (use `$pos.after()`) to prevent splitting text nodes
   - Use `view.state.doc.resolve(pos)` to find proper insertion points
   - Insert with paragraph breaks before/after for proper spacing

## Testing
Currently no test commands configured. To add:
- Add test scripts to `package.json`
- Use Vitest or Jest for unit/integration tests
- Consider Playwright for E2E testing the article creation flow

### Manual Testing Checklist for Image Features

**Image Generation:**
- [ ] Generate image from selected text
- [ ] Generate image from custom prompt
- [ ] Generate cover image for article
- [ ] Verify images save to database
- [ ] Check loading states display correctly

**Image Placement:**
- [ ] Drag image from library to canvas
- [ ] Image inserts at block boundary (doesn't split sentences)
- [ ] Image has proper spacing (paragraphs before/after)
- [ ] Multiple images can be inserted

**Image Interaction:**
- [ ] Click image in canvas → Preview modal opens
- [ ] Select image → Bubble menu appears with View/Delete
- [ ] Delete image from canvas removes it
- [ ] Preview modal shows full-size image
- [ ] Escape key closes modal
- [ ] Click outside modal closes it

**Image Library:**
- [ ] Images appear in sidebar grid
- [ ] Cover image shows blue border + "Cover" badge
- [ ] Right-click sets image as cover
- [ ] Cover flag updates in database
- [ ] Drag from library works correctly

**Edge Cases:**
- [ ] Drop image mid-sentence → Inserts at paragraph end
- [ ] Generate multiple images rapidly → Queue handled correctly
- [ ] Delete image while modal open → Modal closes gracefully
- [ ] Tab switching during generation → State persists
