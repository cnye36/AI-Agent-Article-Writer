// agents/research-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { openai } from "@/lib/ai/openai";
import { generateEmbedding } from "@/lib/ai/embeddings";
import type { Source } from "@/types";
import { tavilySearchSources } from "@/lib/search/tavily";

interface TopicCandidate {
  title: string;
  summary: string;
  angle: string; // unique perspective
  hook: string; // Compelling opening hook for the article
  sources: Source[];
  relevanceScore: number;
  embedding?: number[]; // Vector embedding for semantic similarity
  similarTopics?: Array<{ id: string; title: string; similarity: number }>; // Similar existing topics
}

const ResearchState = Annotation.Root({
  industry: Annotation<string | undefined>,
  keywords: Annotation<string[]>,
  articleType: Annotation<string | undefined>, // blog, listicle, technical, etc.
  existingTopics: Annotation<string[]>, // titles of existing articles
  discoveredTopics: Annotation<TopicCandidate[]>,
  sources: Annotation<Source[]>,
});

const getArticleTypeGuidelines = (articleType?: string): string => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const baseGuidelines = `**CURRENT DATE: ${currentDate}** - Focus on:
- Recent developments and news.
- Emerging trends and forward-looking predictions.
- Topics that cover what is current and what is coming next.
- Current topics that are relevant now.`;

  if (!articleType) {
    return `${baseGuidelines}\n\nGenerate compelling, SEO-optimized titles that are engaging and search-friendly.`;
  }

  const typeGuidelines: Record<string, string> = {
    blog: "Title format: Engaging, conversational, often question-based or benefit-focused. Use forward-looking language when appropriate. Examples: 'Why [Topic] Is Changing Everything' or 'The Hidden Truth About [Topic] That Nobody Talks About' or '[Topic] Trends to Watch'",
    listicle:
      "Title format: MUST start with a number followed by the topic. Use forward-looking language. Examples: '11 AI Tools Every Developer Needs', '7 [Topic] Trends to Watch', '15 [Topic] Predictions', '10 Ways [Topic] Will Transform Business'. The title should clearly indicate it's a numbered list.",
    technical:
      "Title format: Specific, technical, often includes technology names or methodologies. Can include forward-looking language. Examples: 'Building [System] with [Technology]: A Complete Guide', '[Technology] Deep Dive: What's New', '[Technology] Deep Dive: Understanding [Concept]'",
    news: "Title format: Timely, factual, often includes dates or 'latest' language. Focus on recent news. Examples: '[Company] Announces [News] in Major Industry Shift', 'Breaking: [Topic] Reaches New Milestone', 'Latest [Topic] Developments: What to Expect'",
    opinion:
      "Title format: Provocative, takes a stance, often uses 'why' or 'how'. Can include predictions. Examples: 'Why [Topic] Is Overhyped (And What Actually Matters)', 'The Real Problem With [Topic] Nobody Wants to Admit', 'What [Topic] Will Look Like in the Future'",
    tutorial:
      "Title format: Action-oriented, includes 'how to' or step-by-step language. Examples: 'How to [Achieve Goal]: A Step-by-Step Guide', 'Complete Guide: [Task] from Start to Finish', 'Mastering [Topic]'",
    affiliate:
      "Title format: Comparison or recommendation focused. Can include recommendations. Examples: '[Product A] vs [Product B]: Which Is Better?', 'The Best [Category] Tools: Our Top 5 Picks', 'Top [Category] Solutions'",
  };

  return `${baseGuidelines}\n\n**Article Type: ${articleType}**\n${
    typeGuidelines[articleType] || typeGuidelines.blog
  }\n\nGenerate titles that strictly follow this format and are optimized for SEO.`;
};

const researchAgentPrompt = `You are a research agent specialized in discovering trending and newsworthy topics.

Your responsibilities:
1. Search for the LATEST news, trends, and developments.
2. Identify unique angles that haven't been covered
3. Avoid topics that overlap with existing articles (provided below)
4. Score topics by relevance, timeliness, and audience interest
5. Gather credible sources for each topic
6. Generate SEO-optimized titles that match the specified article type format
7. Create compelling hooks that grab attention and set up the article
8. Use forward-looking language such as "trends", "predictions" or "future outlook" when appropriate

{industrySection}
Search Keywords: {keywords}
{articleTypeGuidelines}

Existing Articles to Avoid Overlap:
{existingTopics}

For each topic, provide a JSON array with this structure:
[
  {
    "title": "SEO-optimized title matching article type format (60-70 characters).",
    "summary": "2-3 sentence summary of the topic and why it matters now. Include forward-looking language when relevant.",
    "angle": "Unique perspective or angle that makes this topic stand out. Can include predictions or forward-looking insights.",
    "hook": "Compelling opening hook (1-2 sentences) that grabs attention and sets up the article.",
    "relevanceScore": 0.85,
    "sources": [
      {
        "url": "https://example.com/article",
        "title": "Article Title",
        "snippet": "Relevant excerpt",
        "domain": "example.com"
      }
    ]
  }
]`;

export function createResearchAgent() {
  // Use OpenAI for analysis with GPT-5.1 (or fallback to gpt-4o)
  const analysisModel = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-5.2",
    temperature: 0.3,
  });

  const graph = new StateGraph(ResearchState)
    .addNode("search", async (state) => {
      // Use OpenAI to search and gather information
      const queries = generateSearchQueries(state.industry, state.keywords);

      // Use GPT-5.1 with search capabilities (or fallback to o1/o3 which have web access)
      const searchModel = process.env.OPENAI_SEARCH_MODEL || "gpt-5.2";

      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const industryContext = state.industry
        ? ` in the ${state.industry} industry`
        : "";
      const searchPrompts = queries.map(
        (query) =>
          `Find RECENT news + credible sources about: "${query}"${industryContext}.

Today's date is ${currentDate}. Prioritize:
- recent developments
- emerging trends + forecasts

Return a short bulleted list of sources with:
- URL
- Title
- 1-sentence summary/snippet
- Publication date if available`
      );

      // Fast path: Tavily (if configured), otherwise fallback to model-based extraction.
      // Always cap work to keep topic discovery snappy.
      const MAX_QUERIES = 2;
      const prompts = searchPrompts.slice(0, MAX_QUERIES);

      const searchResults: Source[][] = [];

      // 1) Tavily (fast) — do one query per prompt.
      const tavilyResults = await Promise.all(
        queries
          .slice(0, MAX_QUERIES)
          .map((q) =>
            tavilySearchSources({ query: q, maxResults: 6, timeoutMs: 7000 })
          )
      );
      if (tavilyResults.some((r) => r.length > 0)) {
        searchResults.push(...tavilyResults);
      } else {
        // 2) Fallback: model-based “search” (best-effort), with strict timeout
        const hasWebAccess =
          searchModel.includes("o1") ||
          searchModel.includes("o3") ||
          searchModel.includes("5.1") ||
          searchModel.includes("5.2");

        const SEARCH_TIMEOUT_MS = 25000;

        const runOne = async (prompt: string): Promise<Source[]> => {
          const controller = new AbortController();
          const timeout = setTimeout(
            () => controller.abort(),
            SEARCH_TIMEOUT_MS
          );
          try {
            const response = await openai.chat.completions.create({
              model: searchModel,
              messages: [
                {
                  role: "system",
                  content: `You are a research assistant. ${
                    hasWebAccess
                      ? "You have access to real-time web search. Use it. Always cite URLs."
                      : "Work from your knowledge; still include URLs when possible."
                  } Return concise sources only.`,
                },
                { role: "user", content: prompt },
              ],
              // Keep this fast; the analyze node will do the heavy lifting.
              reasoning_effort: "low" as any,
            }, {
              signal: controller.signal,
            });
            const content = response.choices[0]?.message?.content || "";
            return extractSourcesFromText(content, state.industry || "general");
          } catch (error) {
            console.error("Search error:", error);
            return [];
          } finally {
            clearTimeout(timeout);
          }
        };

        const fallback = await Promise.all(prompts.map(runOne));
        searchResults.push(...fallback);
      }

      const sources = flattenAndDedupe(searchResults.flat());
      return { sources };
    })
    .addNode("analyze", async (state) => {
      // Analyze sources and extract topic candidates using OpenAI
      const industrySection = state.industry
        ? `Industry: ${state.industry}`
        : "Industry: Not specified (searching based on keywords only)";

      const articleTypeGuidelines = getArticleTypeGuidelines(state.articleType);

      const prompt = researchAgentPrompt
        .replace("{industrySection}", industrySection)
        .replace("{keywords}", state.keywords.join(", "))
        .replace("{articleTypeGuidelines}", articleTypeGuidelines)
        .replace("{existingTopics}", state.existingTopics.join("\n"));

      const response = await analysisModel.invoke([
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Based on these sources, identify 5-6 newsworthy topics. Return ONLY valid JSON array:\n\n${JSON.stringify(
            state.sources.slice(0, 20),
            null,
            2
          )}`,
        },
      ]);

      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      const topics = parseTopics(content);

      // Attach sources to topics
      const topicsWithSources = topics.map((topic) => ({
        ...topic,
        sources: matchSourcesToTopic(topic, state.sources),
      }));

      // Generate embeddings for semantic similarity detection
      const topicsWithEmbeddings = await Promise.all(
        topicsWithSources.map(async (topic) => {
          try {
            // Combine title and summary for richer embedding
            const textToEmbed = `${topic.title}. ${topic.summary}`;
            const embedding = await generateEmbedding(textToEmbed);
            return { ...topic, embedding };
          } catch (error) {
            console.error(
              `Error generating embedding for topic "${topic.title}":`,
              error
            );
            // Return topic without embedding - it can still be saved
            return topic;
          }
        })
      );

      return { discoveredTopics: topicsWithEmbeddings };
    })
    .addNode("filter", async (state) => {
      // Filter out topics too similar to existing content
      const filtered = await filterSimilarTopics(
        state.discoveredTopics,
        state.existingTopics
      );
      return { discoveredTopics: filtered };
    })
    .addEdge("search", "analyze")
    .addEdge("analyze", "filter")
    .addEdge("__start__", "search");

  return graph.compile();
}

// Helper functions (stubs - to be implemented)
function generateSearchQueries(
  industry: string | undefined,
  keywords: string[]
): string[] {
  // Speed-first query strategy:
  // - cap to 1–2 queries
  // - keep queries short and “search-engine-like”
  const cleanKeywords = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 4);

  const base = industry ? `${industry}` : "";
  const kw = cleanKeywords.slice(0, 2).join(" ");

  const q1 = [base, kw, "trends", "news", "updates"]
    .filter(Boolean)
    .join(" ")
    .trim();

  const q2 = [base, kw, "predictions", "latest"]
    .filter(Boolean)
    .join(" ")
    .trim();

  const queries = [q1, q2].filter((q) => q.length > 0);
  if (queries.length > 0) return queries.slice(0, 2);

  if (industry) return [`${industry} trends news`];
  return ["trends news"];
}

function flattenAndDedupe(results: Source[]): Source[] {
  // Flatten and deduplicate search results
  const sources: Source[] = [];
  const seenUrls = new Set<string>();
  
  for (const result of results) {
    if (result && typeof result === 'object' && 'url' in result) {
      const url = result.url;
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        sources.push(result);
      }
    }
  }
  return sources;
}

// Extract sources from OpenAI's text response
function extractSourcesFromText(text: string, industry: string): Source[] {
  const sources: Source[] = [];
  const urlRegex = /https?:\/\/[^\s\)\]\>]+/g;
  const urls = text.match(urlRegex) || [];

  // Try to extract structured information from the text
  const lines = text.split("\n");
  let currentSource: Partial<Source> | null = null;
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const urlMatch = line.match(urlRegex);

    if (urlMatch) {
      // Save previous source if exists
      if (currentSource && currentSource.url) {
        sources.push(currentSource as Source);
      }

      // Create new source from URL
      const url = urlMatch[0].replace(/[.,;!?]+$/, ""); // Remove trailing punctuation
      currentSource = { url };
      const domainMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
      if (domainMatch) {
        currentSource.domain = domainMatch[1];
      }

      // Try to get title from same or next line
      const nextLine = lines[i + 1]?.trim();
      if (
        nextLine &&
        !nextLine.match(urlRegex) &&
        nextLine.length > 10 &&
        nextLine.length < 200
      ) {
        currentSource.title = nextLine.replace(/^[-*•]\s*/, "");
      }
    } else if (currentSource) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.match(urlRegex)) {
        if (
          !currentSource.title &&
          trimmed.length > 10 &&
          trimmed.length < 200 &&
          !trimmed.startsWith("http")
        ) {
          currentSource.title = trimmed.replace(/^[-*•]\s*/, "");
        } else if (!currentSource.snippet && trimmed.length > 30) {
          currentSource.snippet = trimmed.substring(0, 300);
        }
      }

      // Track section headers for context
      if (
        trimmed &&
        trimmed.length < 100 &&
        (trimmed.endsWith(":") || /^#{1,3}\s/.test(trimmed))
      ) {
        currentSection = trimmed.replace(/^#{1,3}\s*/, "").replace(":", "");
      }
    }
  }

  if (currentSource && currentSource.url) {
    sources.push(currentSource as Source);
  }

  // Also add any standalone URLs that weren't captured
  for (const url of urls) {
    const cleanUrl = url.replace(/[.,;!?]+$/, "");
    if (!sources.some((s) => s.url === cleanUrl)) {
      const domainMatch = cleanUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/);
      sources.push({
        url: cleanUrl,
        title: currentSection || `${industry} article`,
        domain: domainMatch ? domainMatch[1] : undefined,
      });
    }
  }

  // Do not create synthetic sources - return only real URLs found
  // This ensures external citations are always from actual research sources
  return sources;
}

// Match sources to topics based on relevance
function matchSourcesToTopic(topic: TopicCandidate, allSources: Source[]): Source[] {
  // Simple matching: find sources that contain keywords from the topic title
  const topicKeywords = topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const matched: Source[] = [];
  const usedUrls = new Set<string>();
  
  for (const source of allSources) {
    if (usedUrls.has(source.url)) continue;
    
    const sourceText = `${source.title} ${source.snippet || ''}`.toLowerCase();
    const matches = topicKeywords.filter(keyword => sourceText.includes(keyword));
    
    if (matches.length >= 2 || (matches.length === 1 && topicKeywords.length <= 2)) {
      matched.push(source);
      usedUrls.add(source.url);
      if (matched.length >= 5) break; // Limit to 5 sources per topic
    }
  }
  
  // If no matches, return first few sources as fallback
  if (matched.length === 0) {
    return allSources.slice(0, 3);
  }
  
  return matched;
}

function parseTopics(content: string): TopicCandidate[] {
  // Parse AI response into topic candidates
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.topics && Array.isArray(parsed.topics)) return parsed.topics;
    return [];
  } catch {
    // Fallback: try to extract from text
    return [];
  }
}

async function filterSimilarTopics(
  topics: TopicCandidate[],
  existingTopics: string[]
): Promise<TopicCandidate[]> {
  // Filter out topics too similar to existing ones
  return topics.filter(topic => {
    const titleLower = topic.title.toLowerCase();
    return !existingTopics.some(existing => 
      existing.toLowerCase().includes(titleLower) || 
      titleLower.includes(existing.toLowerCase())
    );
  });
}