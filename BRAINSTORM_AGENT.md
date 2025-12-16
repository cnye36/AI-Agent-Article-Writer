# Brainstorm Agent - AI-Powered Topic Generation

The Brainstorm Agent generates creative, SEO-optimized article topic ideas using AI reasoning instead of web search.

## Why Use Brainstorm Instead of Research?

| Research Agent | Brainstorm Agent |
|----------------|------------------|
| 🔍 Finds existing content from web | 💡 Generates original ideas |
| ⚠️ Can return duplicates | ✅ Avoids existing topics |
| 📰 Limited to trending topics | 🎨 Creative unique angles |
| 🌐 Requires web access | 🤖 Pure AI generation |

## How It Works

1. **Analyzes your industry** and keywords
2. **Checks existing topics** to avoid duplicates
3. **Generates creative angles** with unique perspectives
4. **Scores each topic** for SEO value and uniqueness
5. **Provides hooks** to start writing immediately

## Features

Each brainstormed topic includes:
- **SEO-Optimized Title** (60-70 characters)
- **Unique Angle** (what makes it different)
- **Summary** (2-3 sentence value proposition)
- **SEO Value Score** (1-10)
- **Uniqueness Score** (1-10)
- **Target Keywords** (3-5 keywords)
- **Search Volume Estimate** (low/medium/high)
- **Content Type** (how-to, listicle, analysis, etc.)
- **3 Opening Hooks** (ready-to-use intros)

## API Usage

### Generate Topics

```bash
POST /api/agents/brainstorm

{
  "industry": "tech",
  "keywords": ["artificial intelligence", "automation"],
  "articleType": "how-to",
  "targetAudience": "professionals",
  "contentGoals": ["educate", "engage"],
  "count": 5
}
```

**Response:**
```json
{
  "success": true,
  "topics": [
    {
      "id": "uuid-here",
      "title": "How AI Automation Is Reshaping Remote Work in 2025",
      "summary": "Explores practical applications...",
      "industry_id": "tech-industry-id",
      "sources": [
        {
          "url": "brainstorm://hook-0",
          "title": "Did you know that 73% of companies...",
          "snippet": "Unlike typical guides, this focuses on..."
        }
      ],
      "relevance_score": 0.88,
      "status": "pending",
      "metadata": {
        "angle": "Unlike typical guides, this focuses on underutilized AI tools",
        "seoValue": 9,
        "uniquenessScore": 8,
        "targetKeywords": ["AI automation", "remote work", "productivity"],
        "estimatedSearchVolume": "high",
        "contentType": "how-to",
        "hooks": [
          "Did you know that 73% of companies are missing...",
          "Most remote teams struggle with...",
          "What if you could automate..."
        ],
        "generatedBy": "brainstorm-agent"
      }
    }
  ]
}
```

### Get Configuration Options

```bash
GET /api/agents/brainstorm

Response:
{
  "options": {
    "articleTypes": ["blog", "technical", "how-to", "listicle", ...],
    "contentGoals": ["educate", "engage", "convert", ...],
    "targetAudiences": ["general", "beginners", "professionals", ...],
    "countRange": { "min": 1, "max": 10, "default": 5 }
  }
}
```

## Frontend Usage

### Using the Hook

```typescript
import { useArticleGeneration } from '@/hooks/use-article-generation';

function MyComponent() {
  const { startResearch, topics } = useArticleGeneration();

  // Generate topics with brainstorm mode
  const handleBrainstorm = async () => {
    await startResearch(
      {
        industry: "ai",
        keywords: ["machine learning", "automation"],
        articleType: "blog",
        targetLength: "medium",
        tone: "professional",
      },
      true // useBrainstorm = true
    );
  };

  return (
    <button onClick={handleBrainstorm}>
      Generate Ideas
    </button>
  );
}
```

### Built-in UI Toggle

The `CreateArticleFlow` component now includes a toggle between Research and Brainstorm modes:

- **🔍 Research**: Find trending topics from web search
- **💡 Brainstorm**: AI-generated unique & creative ideas

Simply select "Brainstorm" mode before generating topics!

## Customization

### Adjust Creativity

Edit `agents/brainstorm-agent.ts`:

```typescript
const model = new ChatOpenAI({
  modelName: "gpt-5.2",
  temperature: 0.8, // Increase for more creativity (max: 1.0)
  maxTokens: 3000,
});
```

### Customize Prompt

Modify `buildBrainstormPrompt()` function to:
- Add industry-specific guidelines
- Change scoring criteria
- Request different formats
- Add more constraints

### Filter Results

Topics are automatically filtered to avoid:
- Previously approved topics
- Currently used topics
- Topics in your `avoidTopics` list

## Tips for Best Results

1. **Be specific with keywords**: "AI chatbots for customer service" > "AI"
2. **Set content goals**: Helps AI understand your objectives
3. **Define target audience**: Gets more relevant topic angles
4. **Try different article types**: Different formats spark different ideas
5. **Iterate**: Generate multiple batches and cherry-pick the best

## Comparison with Research Agent

### When to use **Research**:
- ✅ You want trending, newsworthy topics
- ✅ You need real sources and citations
- ✅ Industry news coverage
- ✅ Data-driven content

### When to use **Brainstorm**:
- ✅ You keep getting duplicate topics
- ✅ You want unique angles on common topics
- ✅ Need evergreen content ideas
- ✅ Creative thought leadership
- ✅ Educational/how-to content

## Example Workflow

1. **Select industry** (AI, Tech, Health, etc.)
2. **Choose "Brainstorm" mode**
3. **Add optional keywords** for focus
4. **Click "Generate Ideas"**
5. **Review 5 unique topics** with scores
6. **Select your favorite**
7. **Generate outline** → **Write article**

---

**Pro Tip**: Use Brainstorm for your main content, then use Research to find supporting data and citations to add to the article!
