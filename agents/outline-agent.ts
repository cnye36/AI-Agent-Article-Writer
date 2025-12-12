// agents/outline-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import type { ArticleType, Outline, Source, Article } from "@/types";

interface TopicCandidate {
  title: string;
  summary: string;
  angle: string;
  sources: Source[];
  relevanceScore: number;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
}

interface ArticleOutline {
  title: string;
  hook: string;
  sections: {
    heading: string;
    keyPoints: string[];
    wordTarget: number;
    suggestedLinks: { articleId: string; anchorText: string }[];
  }[];
  conclusion: {
    summary: string;
    callToAction: string;
  };
  seoKeywords: string[];
}

const OutlineState = Annotation.Root({
    topic: Annotation<TopicCandidate>,
    articleType: Annotation<ArticleType>,
    targetLength: Annotation<"short" | "medium" | "long">,
    tone: Annotation<string>,
    relatedArticles: Annotation<RelatedArticle[]>, // for internal linking
    outline: Annotation<ArticleOutline>,
  });
  
  interface ArticleOutline {
    title: string;
    hook: string;
    sections: {
      heading: string;
      keyPoints: string[];
      wordTarget: number;
      suggestedLinks: { articleId: string; anchorText: string }[];
    }[];
    conclusion: {
      summary: string;
      callToAction: string;
    };
    seoKeywords: string[];
  }
  
  const outlineAgentPrompt = `You are an expert content strategist and outline architect.
  
  Your job is to create detailed, structured outlines that will guide the writing agent.
  
  Article Type: {articleType}
  - blog: Conversational, engaging, personal insights
  - technical: In-depth, code examples, precise terminology  
  - news: Factual, timely, objective reporting
  - opinion: Persuasive, well-argued, clear stance
  - tutorial: Step-by-step, actionable, beginner-friendly
  
  Target Length: {targetLength}
  - short: ~500 words (3-4 sections)
  - medium: ~1000 words (5-6 sections)
  - long: ~2000+ words (7-10 sections)
  
  Tone: {tone}
  
  Related Articles for Internal Linking:
  {relatedArticles}
  
  For each section, suggest opportunities to link to related articles using natural anchor text.
  
  Create an outline that:
  1. Opens with a compelling hook
  2. Flows logically from section to section
  3. Includes specific talking points (not vague)
  4. Suggests internal links where relevant
  5. Ends with a strong conclusion and CTA
  6. Includes SEO keywords`;
  
  export function createOutlineAgent() {
    const model = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-5.1",
      temperature: 0.4,
    });
  
    const graph = new StateGraph(OutlineState)
      .addNode("createOutline", async (state) => {
        const prompt = outlineAgentPrompt
          .replace("{articleType}", state.articleType)
          .replace("{targetLength}", state.targetLength)
          .replace("{tone}", state.tone)
          .replace("{relatedArticles}", state.relatedArticles.length > 0 
            ? state.relatedArticles.map(a => `- ${a.title} (${a.slug})`).join("\n")
            : "No related articles available");

        const response = await model.invoke([
          { role: "system", content: prompt },
          { 
            role: "user", 
            content: `Topic: ${state.topic.title}\n\nSummary: ${state.topic.summary}\n\nSources: ${JSON.stringify(state.topic.sources.slice(0, 10))}\n\nReturn a JSON object with this exact structure:
{
  "title": "Article title",
  "hook": "Compelling opening hook",
  "sections": [
    {
      "heading": "Section heading",
      "keyPoints": ["point 1", "point 2"],
      "wordTarget": 200,
      "suggestedLinks": [{"articleId": "uuid", "anchorText": "link text"}]
    }
  ],
  "conclusion": {
    "summary": "Conclusion summary",
    "callToAction": "CTA text"
  },
  "seoKeywords": ["keyword1", "keyword2"]
}`
          }
        ]);
        const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        return { outline: parseOutline(content) };
      })
      .addEdge("__start__", "createOutline");
  
    return graph.compile();
  }

// Helper functions (stubs - to be implemented)
async function findRelatedArticles(
  _topicTitle: string,
  _topicSummary: string
): Promise<RelatedArticle[]> {
  // Query database for related articles
  // This should be implemented to query Supabase
  return [];
}

function parseOutline(content: string): ArticleOutline {
  // Parse AI response into outline structure
  try {
    const parsed = JSON.parse(content);
    if (parsed.title && parsed.sections) return parsed;
    return {
      title: parsed.title || "Untitled",
      hook: parsed.hook || "",
      sections: parsed.sections || [],
      conclusion: parsed.conclusion || { summary: "", callToAction: "" },
      seoKeywords: parsed.seoKeywords || [],
    };
  } catch {
    return {
      title: "Untitled",
      hook: "",
      sections: [],
      conclusion: { summary: "", callToAction: "" },
      seoKeywords: [],
    };
  }
}