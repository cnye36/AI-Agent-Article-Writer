# Let AI Write It!

A powerful AI-powered content creation platform that helps you research, outline, write, and publish high-quality articles across multiple platforms. Built with a multi-agent AI architecture for maximum quality and efficiency.

![Let AI Write It!](https://letaiwriteit.com/images/logo.png)

## ✨ Features

### 🤖 Multi-Agent AI System
- **Research Agent** - Automatically discovers trending topics and news in your chosen industry
- **Outline Agent** - Creates structured, SEO-optimized article outlines with internal linking suggestions
- **Writer Agent** - Generates high-quality, publication-ready content section by section

### 📝 Canvas-Style Editor
- Rich text editing with TipTap
- **AI-powered inline editing** - Select any text and:
  - Rewrite for clarity
  - Expand with more detail
  - Simplify complex passages
  - Fix grammar and spelling
  - Change tone (casual, professional, technical, etc.)
  - Custom instructions
- Real-time AI suggestions
- Auto-save with version history
- Internal link suggestions

### 📚 Article Management
- Full-text search across all articles
- Filter by industry, type, and status
- Bulk operations (publish, delete, status change)
- Version history with restore capability
- Export to Markdown, HTML, or plain text

### 🔗 Smart Internal Linking
- AI-powered link suggestions based on content analysis
- Automatic link tracking between articles
- SEO-optimized anchor text recommendations

### 🏭 Multi-Industry Support
- AI & Machine Learning
- Technology
- Health & Wellness
- Finance & Fintech
- Climate & Sustainability
- Crypto & Web3

### 📊 Article Types
- **Blog Posts** - Conversational, engaging content
- **Technical Articles** - In-depth with code examples
- **News Analysis** - Factual, timely reporting
- **Opinion Pieces** - Persuasive, well-argued content
- **Tutorials** - Step-by-step guides

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account
- Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/content-studio.git
   cd content-studio
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Anthropic
   ANTHROPIC_API_KEY=your_anthropic_api_key
   
   # Stripe
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_PRICE_ID=price_your_plan
   # Optional: where to send users after closing the billing portal
   STRIPE_BILLING_PORTAL_RETURN_URL=http://localhost:3000/dashboard
   
   # Optional: For web search in research agent
   TAVILY_API_KEY=your_tavily_api_key
   ```

4. **Set up the database**
   
   Run the SQL schema in your Supabase SQL editor (see [Database Setup](#database-setup) below).

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage Guide

### Creating Your First Article

1. **Navigate to the Dashboard**
   
   Click "Create" in the navigation to start the article creation flow.

2. **Configure Your Article**
   - Select an industry (AI, Tech, Health, etc.)
   - Choose article type (Blog, Technical, Tutorial, etc.)
   - Set target length (Short ~500, Medium ~1000, Long ~2000+ words)
   - Pick a writing tone

3. **Select a Topic**
   
   The Research Agent will discover trending topics in your industry. Review the suggestions and click "Use This Topic" on your preferred choice.

4. **Review the Outline**
   
   The Outline Agent creates a structured outline with:
   - Compelling title and hook
   - Organized sections with key points
   - SEO keywords
   - Internal link suggestions
   
   Edit if needed, then click "Approve & Write".

5. **Edit in the Canvas**
   
   Once the Writer Agent completes the draft:
   - Use the toolbar for basic formatting
   - Select text to access AI editing features
   - Open the AI panel for advanced options
   - Review link suggestions in the Links panel

6. **Publish**
   
   When satisfied, click "Publish" to make your article live.

### Using the AI Editor

#### Quick Actions (Bubble Menu)
Select any text to see the floating menu:
- **✨ Rewrite** - Improve clarity and flow
- **📝 Expand** - Add more detail and examples
- **🎯 Simplify** - Make it easier to understand
- **✓ Fix** - Correct grammar and spelling
- **💬 More** - Open the full AI panel

#### AI Panel Features
- **Tone Changes** - Quickly switch between casual, professional, technical, or enthusiastic
- **Custom Instructions** - Write specific instructions for exactly what you want
- **Preview & Apply** - Review AI suggestions before applying them

### Managing Your Library

#### Searching Articles
- Use the search bar for full-text search
- Filter by industry, article type, or status
- Sort by date, title, or word count

#### Bulk Operations
1. Select multiple articles using checkboxes
2. Use the bulk action bar to:
   - Publish selected articles
   - Move to draft
   - Delete

#### Version History
Every save creates a version. To restore:
1. Open an article
2. Click "History" in the bottom bar
3. Click on any version to restore it

### Topic Discovery

The Topic Feed shows all discovered topics:
- **Pending** - New topics awaiting review
- **Approved** - Topics you've started writing about
- **Rejected** - Topics you've passed on
- **Used** - Topics with completed articles

Click "Find New Topics" to run the Research Agent and discover fresh content ideas.

---

## 🗄️ Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Industries/Categories
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research topics
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  industry_id UUID REFERENCES industries(id),
  sources JSONB DEFAULT '[]',
  relevance_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Article outlines
CREATE TABLE outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id),
  structure JSONB NOT NULL,
  article_type TEXT NOT NULL,
  target_length TEXT NOT NULL,
  tone TEXT DEFAULT 'professional',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved BOOLEAN DEFAULT FALSE
);

-- Articles
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
  status TEXT DEFAULT 'draft',
  word_count INT,
  reading_time INT,
  seo_keywords TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  published_to TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);

-- Internal links
CREATE TABLE article_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  target_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  anchor_text TEXT,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_article_id, target_article_id, anchor_text)
);

-- Version history
CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_by TEXT,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);
CREATE INDEX idx_articles_industry ON articles(industry_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_topics_industry ON topics(industry_id);
CREATE INDEX idx_topics_status ON topics(status);
```

---

## ⚙️ Configuration

### Customizing Industries

Edit the `INDUSTRY_KEYWORDS` constant in `/app/api/agents/research/route.ts` to add or modify industries:

```typescript
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  gaming: [
    "video games",
    "esports",
    "game development",
    // ... add your keywords
  ],
  // ... add more industries
};
```

### Adjusting AI Models

Edit `/lib/ai/anthropic.ts` to change models:

```typescript
export const DEFAULT_MODELS = {
  research: MODELS.SONNET,  // For topic research
  outline: MODELS.SONNET,   // For outline generation
  writing: MODELS.SONNET,   // For article writing
  editing: MODELS.SONNET,   // For inline editing
  suggestions: MODELS.HAIKU, // For quick suggestions (faster/cheaper)
};
```

### Auto-Save Interval

Change the auto-save frequency in the editor hook:

```typescript
const { ... } = useEditor({ 
  articleId, 
  articleType, 
  tone,
  autoSaveInterval: 30000  // 30 seconds (default)
});
```

---

## 🔧 Troubleshooting

### "Unauthorized" errors
- Ensure you're logged into Supabase
- Check that your environment variables are correct
- Verify your Supabase RLS policies allow the operations

### AI not responding
- Verify your `ANTHROPIC_API_KEY` is set correctly
- Check the browser console for error messages
- Ensure you have API credits remaining

### Topics not loading
- Run "Find New Topics" to populate the database
- Check that at least one industry exists in the database
- Verify the Research Agent has web search capabilities (Tavily API key)

### Editor not saving
- Check browser console for errors
- Verify your Supabase connection
- Ensure the article exists in the database

---

## 📁 Project Structure

```
content-studio/
├── app/
│   ├── api/
│   │   ├── agents/          # AI agent endpoints
│   │   ├── ai/              # AI editing endpoint
│   │   └── articles/        # Article CRUD + versions + links
│   ├── article/[id]/        # Article detail/edit page
│   └── dashboard/           # Main dashboard
├── agents/                  # LangGraph agent implementations
├── components/              # React components
├── hooks/                   # Custom React hooks
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── ai/                 # Anthropic client
│   └── utils.ts            # Utility functions
└── types/                  # TypeScript definitions
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [LangGraph](https://github.com/langchain-ai/langgraph) for agent orchestration
- [TipTap](https://tiptap.dev) for the rich text editor
- [Supabase](https://supabase.com) for the backend
- [Vercel](https://vercel.com) for hosting

---

## 📞 Support

- 📧 Email: support@contentstudio.dev
- 💬 Discord: [Join our community](https://discord.gg/contentstudio)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/content-studio/issues)

---

Built with ❤️ by Curtis Nye
