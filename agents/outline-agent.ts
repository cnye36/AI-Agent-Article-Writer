// agents/outline-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { inspectUrl } from "@/lib/search/tavily";
import type { ArticleType, Source } from "@/types";

interface TopicCandidate {
  title: string;
  summary: string;
  angle: string;
  hook?: string; // Optional hook from research agent
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
  freshSources: Annotation<Source[]>, // Fresh sources from web search
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
  - blog: Conversational, engaging, personal insights. Sections flow naturally with transitions.
  - technical: In-depth, code examples, precise terminology. Include code snippets and technical details.
  - news: Factual, timely, objective reporting. Use inverted pyramid structure (most important info first).
  - opinion: Persuasive, well-argued, clear stance. Include counterarguments and rebuttals.
  - tutorial: Step-by-step, actionable, beginner-friendly. Each section is a numbered step with clear instructions.
  - personal: First-person experience/journey. Use a narrative arc (setup → experiment → results → takeaways). Include specific steps/workflow and concrete outcomes.
  - listicle: **CRITICAL**: MUST be a numbered list format. Each section heading MUST start with a number (e.g., "1. [Item Name]", "2. [Item Name]"). The title should match this format (e.g., "11 AI Tools..."). Each numbered item is a separate section. Make it scannable and engaging.
  - affiliate: Comparison and recommendation articles. Include pros/cons sections, comparison tables, and clear recommendations.
  
  Target Length: {targetLength}
  
  Optimal word counts by article type:
  - Blog/Affiliate/Personal (medium): ~1,500 words (5-6 sections for blog/personal, 8-12 items for listicle)
  - Technical/Tutorial (long): ~2,500+ words (7-10 sections, comprehensive guides)
  - News (short): ~600 words (3-4 sections, concise reporting)
  - Opinion (short): ~900 words (4-6 sections, focused argument)
  - Listicle (long): ~1,800 words (8-12 items, scannable format)
  
  Section counts by length:
  - short: 3-4 sections for blog/news, 5-7 items for listicle
  - medium: 5-6 sections for blog/news, 8-12 items for listicle
  - long: 7-10 sections for blog/news, 15+ items for listicle
  
  Tone: {tone}
  
  Related Articles for Internal Linking:
  {relatedArticles}
  
  For each section, suggest opportunities to link to related articles using natural anchor text.
  
  Create an outline that:
  1. Opens with a compelling hook {hookNote}
  2. Flows logically from section to section (or numbered items for listicles)
  3. Includes specific talking points (not vague)
  4. Suggests internal links where relevant
  5. Ends with a strong conclusion and CTA
  6. Includes SEO keywords
  7. **STRICTLY follows the article type format** - especially for listicles (numbered sections)
  
  **IMPORTANT**: Do not use any em dashes in your outline.`;

export function createOutlineAgent() {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-5.2",
    temperature: 0.4,
  });

  const graph = new StateGraph(OutlineState)
    .addNode("search", async (state) => {
      // Use sources found by the research agent
      console.log(
        `[Outline Agent] Investigating sources for topic: "${state.topic.title}"`
      );

      const sourcesToInspect = state.topic.sources.slice(0, 6); // Cap at 6 sources
      console.log(
        `[Outline Agent] inspecting ${sourcesToInspect.length} sources from research phase.`
      );

      // Parallel inspection of sources
      const inspectionResults = await Promise.all(
        sourcesToInspect.map(async (source) => {
          try {
            console.log(`[Outline Agent] Inspecting URL: ${source.url}`);
            const result = await inspectUrl(source.url);
            if (result) {
               console.log(`[Outline Agent] Successfully inspected: ${source.url}`);
               return result;
            }
            console.log(`[Outline Agent] Failed to inspect (empty result): ${source.url}`);
            return null;
          } catch (e) {
            console.error(`[Outline Agent] Error inspecting ${source.url}:`, e);
            return null;
          }
        })
      );

      const freshSources = inspectionResults.filter((s): s is Source => s !== null);

      if (freshSources.length === 0) {
        // Fallback: If no sources could be inspected, do a quick Tavily search?
        // Or just return the original sources if we can't get more detail.
        // For now, let's just warn.
         console.warn("[Outline Agent] No sources could be inspected deeply. Using summary info.");
      }

      return { freshSources };
    })
    .addNode("createOutline", async (state) => {
      // Combine fresh sources with topic sources (fresh sources take priority)
      const allSources = [
        ...state.freshSources,
        ...state.topic.sources.filter(
          (ts) => !state.freshSources.some((fs) => fs.url === ts.url)
        ),
      ];

      console.log(
        `[Outline Agent] Creating outline with ${allSources.length} total sources (${state.freshSources.length} fresh, ${state.topic.sources.length} from topic)`
      );

      const hookNote = state.topic.hook
        ? `(Use this hook if appropriate: "${state.topic.hook}")`
        : "";

      const prompt = outlineAgentPrompt
        .replace("{articleType}", state.articleType)
        .replace("{targetLength}", state.targetLength)
        .replace("{tone}", state.tone)
        .replace("{hookNote}", hookNote)
        .replace(
          "{relatedArticles}",
          state.relatedArticles.length > 0
            ? state.relatedArticles
                .map((a) => `- ${a.title} (${a.slug})`)
                .join("\n")
            : "No related articles available"
        );

      const response = await model.invoke([
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Topic: ${state.topic.title}\n\nSummary: ${
            state.topic.summary
          }\n\nAngle: ${state.topic.angle || "General coverage"}${
            state.topic.hook ? `\n\nSuggested Hook: ${state.topic.hook}` : ""
          }\n\nSources (prioritize the most recent): ${JSON.stringify(
            allSources.slice(0, 15),
            null,
            2
          )}\n\nIMPORTANT: 
- We are in late December 2025, approaching 2026 - use the most recent sources from late 2025
- Focus on recent developments and trends from late 2025, and forward-looking predictions for 2026
- Use forward-looking language like "going into 2026", "trends for 2026", "what to expect in 2026" when appropriate
- ${
            state.articleType === "listicle"
              ? "**CRITICAL FOR LISTICLES**: Section headings MUST be numbered (e.g., '1. First Item', '2. Second Item'). Each numbered item is a separate section."
              : ""
          }
- ${
            state.articleType === "listicle"
              ? "The title should match the listicle format (e.g., '11 Tools...', '7 Ways...'). Consider using 2026 forward-looking language (e.g., '11 Tools for 2026')."
              : ""
          }

Return a JSON object with this exact structure:
{
  "title": "${
    state.articleType === "listicle"
      ? "Numbered list title (e.g., '11 AI Tools Every Developer Needs')"
      : "Article title"
  }",
  "hook": "${state.topic.hook ? state.topic.hook : "Compelling opening hook"}",
  "sections": [
    {
      "heading": "${
        state.articleType === "listicle"
          ? "1. First Item Name"
          : "Section heading"
      }",
      "keyPoints": ["point 1", "point 2"],
      "wordTarget": 200,
      "suggestedLinks": [{"articleId": "uuid", "anchorText": "link text"}]
    }${
      state.articleType === "listicle"
        ? ',\n    {\n      "heading": "2. Second Item Name",\n      "keyPoints": ["point 1", "point 2"],\n      "wordTarget": 200,\n      "suggestedLinks": []\n    }'
        : ""
    }
  ],
  "conclusion": {
    "summary": "Conclusion summary",
    "callToAction": "CTA text"
  },
  "seoKeywords": ["keyword1", "keyword2"]
}`,
        },
      ]);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      const outline = parseOutline(content);
      console.log(
        `[Outline Agent] Outline created with ${
          outline.sections?.length || 0
        } sections`
      );
      return { outline };
    })
    .addEdge("__start__", "search")
    .addEdge("search", "createOutline");

  return graph.compile();
}



// Note: findRelatedArticles is kept for potential future use
// Currently, related articles are fetched in the API route and passed via state

export function parseOutline(content: string): ArticleOutline {
  // Parse AI response into outline structure
  try {
    // Strip markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|```/g, "").trim();
    
    const parsed = JSON.parse(cleanContent);
    if (parsed.title && parsed.sections) return parsed;
    
    console.warn("[Outline Agent] Parsed JSON missing required fields:", parsed);
    return {
      title: parsed.title || "Untitled",
      hook: parsed.hook || "",
      sections: parsed.sections || [],
      conclusion: parsed.conclusion || { summary: "", callToAction: "" },
      seoKeywords: parsed.seoKeywords || [],
    };
  } catch (e) {
    console.error("[Outline Agent] Failed to parse outline JSON:", e);
    console.error("[Outline Agent] Raw content was:", content);
    return {
      title: "Untitled",
      hook: "",
      sections: [],
      conclusion: { summary: "", callToAction: "" },
      seoKeywords: [],
    };
  }
}