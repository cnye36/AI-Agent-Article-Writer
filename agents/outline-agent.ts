// agents/outline-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { openai } from "@/lib/ai/openai";
import type { ArticleType, Source } from "@/types";

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
  6. Includes SEO keywords
  
  **IMPORTANT**: Do not use any em dashes in your outline.`;

export function createOutlineAgent() {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-5.1",
    temperature: 0.4,
  });

  const graph = new StateGraph(OutlineState)
    .addNode("search", async (state) => {
      // Perform fresh web search to get up-to-date information
      console.log(
        `[Outline Agent] Starting web search for topic: "${state.topic.title}"`
      );

      const searchQueries = generateSearchQueriesForOutline(state.topic);
      const searchModel =
        process.env.OPENAI_SEARCH_MODEL ||
        process.env.OPENAI_MODEL ||
        "gpt-5.1";

      const hasWebAccess =
        searchModel.includes("o1") ||
        searchModel.includes("o3") ||
        searchModel.includes("5.1") ||
        searchModel.includes("5.2");

      console.log(
        `[Outline Agent] Using model: ${searchModel}, Web access: ${hasWebAccess}`
      );
      console.log(
        `[Outline Agent] Search queries: ${JSON.stringify(searchQueries)}`
      );

      const searchPrompts = searchQueries.map((query, index) => {
        const isPrimaryQuery = index === 0;
        const basePrompt = isPrimaryQuery
          ? `You are researching the specific topic: "${state.topic.title}"
            
Topic Summary: ${state.topic.summary}
${state.topic.angle ? `Topic Angle/Perspective: ${state.topic.angle}` : ""}

Search for the latest news, updates, and recent developments specifically about this topic: "${query}".

CRITICAL: This is for creating an article outline about this EXACT topic. Find information that is:
1. Recent (prioritize information from the last few weeks/months, definitely within 2025)
2. Relevant to the specific topic: "${state.topic.title}"
3. ${
              state.topic.angle
                ? `Aligned with the angle: "${state.topic.angle}"`
                : "Comprehensive and current"
            }

Provide a comprehensive summary of:
1. The most recent developments and news about this specific topic
2. Current trends and insights relevant to this topic
3. Important sources with URLs (include publication dates if available)
4. Any breaking news or recent announcements related to this topic

Focus on RECENT, SPECIFIC information about "${
              state.topic.title
            }". Avoid generic information that's not directly related.
Format your response with clear sections and include source URLs with dates.`
          : `Search for additional recent information about: "${query}".

This is part of researching the topic: "${state.topic.title}"
${state.topic.angle ? `Focus on: ${state.topic.angle}` : ""}

Find recent developments, news, and insights (prioritize 2025 information).
Include source URLs with publication dates.`;

        return basePrompt;
      });

      const searchResults = await Promise.all(
        searchPrompts.map(async (prompt, index) => {
          try {
            const query = searchQueries[index];
            console.log(
              `[Outline Agent] Executing search query ${index + 1}/${
                searchPrompts.length
              }: "${query}"`
            );
            const startTime = Date.now();

            // Add timeout to prevent slow queries from blocking
            const SEARCH_TIMEOUT = 12000; // 12 seconds per query
            const searchPromise = openai.chat.completions.create({
              model: searchModel,
              messages: [
                {
                  role: "system",
                  content: `You are a research assistant helping to create an article outline about the specific topic: "${
                    state.topic.title
                  }".

${
  hasWebAccess
    ? "You have access to real-time web search - use it to find CURRENT information, news, and trends specifically about this topic. Always prioritize recent information (last few weeks/months, definitely within 2025). Always cite your sources with URLs and include publication dates when available."
    : "Provide information based on your knowledge about this specific topic and include relevant URLs when possible. Emphasize recent developments from 2025."
}

IMPORTANT: Focus on information that is directly relevant to "${
                    state.topic.title
                  }". ${
                    state.topic.angle
                      ? `Pay special attention to the angle: "${state.topic.angle}".`
                      : ""
                  }

Always include source URLs, titles, summaries, and dates when providing information.`,
                },
                { role: "user", content: prompt },
              ],
              reasoning_effort: "medium",
              
            });

            const timeoutPromise = new Promise<Awaited<typeof searchPromise>>(
              (_, reject) =>
                setTimeout(
                  () => reject(new Error("Search timeout")),
                  SEARCH_TIMEOUT
                )
            );

            const response = await Promise.race([
              searchPromise,
              timeoutPromise,
            ]);

            const elapsed = Date.now() - startTime;
            const content = response.choices[0]?.message?.content || "";
            console.log(
              `[Outline Agent] Search query ${
                index + 1
              } ("${query}") completed in ${elapsed}ms, response length: ${
                content.length
              } chars`
            );

            const sources = extractSourcesFromText(content, "general");
            console.log(
              `[Outline Agent] Extracted ${sources.length} sources from query ${
                index + 1
              } ("${query}")`
            );

            // Log first source URL if available for verification
            if (sources.length > 0 && sources[0].url) {
              console.log(
                `[Outline Agent] Sample source from query ${
                  index + 1
                }: ${sources[0].url.substring(0, 80)}...`
              );
            }

            return sources;
          } catch (error) {
            console.error(
              `[Outline Agent] Search error for query ${index + 1}:`,
              error
            );
            // Return empty array on error/timeout - we'll use topic sources as fallback
            return [];
          }
        })
      );

      const freshSources = flattenAndDedupe(searchResults.flat());
      console.log(`[Outline Agent] ========================================`);
      console.log(
        `[Outline Agent] Web Search Summary for Topic: "${state.topic.title}"`
      );
      console.log(
        `[Outline Agent] Total fresh sources found: ${freshSources.length}`
      );
      console.log(
        `[Outline Agent] Search model used: ${searchModel} (Web access: ${
          hasWebAccess ? "YES" : "NO"
        })`
      );

      // Log source URLs for verification
      if (freshSources.length > 0) {
        console.log(`[Outline Agent] Top sources found:`);
        freshSources.slice(0, 5).forEach((s, i) => {
          console.log(
            `[Outline Agent]   ${i + 1}. ${s.domain || "unknown"} - ${
              s.title?.substring(0, 60) || "No title"
            }`
          );
          console.log(`[Outline Agent]      URL: ${s.url}`);
        });
        console.log(`[Outline Agent] ========================================`);
      } else {
        console.warn(
          `[Outline Agent] ========================================`
        );
        console.warn(
          `[Outline Agent] WARNING: No fresh sources found from web search!`
        );
        console.warn(
          `[Outline Agent] This may indicate web search is not working properly.`
        );
        console.warn(
          `[Outline Agent] Falling back to topic sources from research phase.`
        );
        console.warn(
          `[Outline Agent] ========================================`
        );
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

      const prompt = outlineAgentPrompt
        .replace("{articleType}", state.articleType)
        .replace("{targetLength}", state.targetLength)
        .replace("{tone}", state.tone)
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
          }\n\nAngle: ${
            state.topic.angle || "General coverage"
          }\n\nSources (prioritize the most recent): ${JSON.stringify(
            allSources.slice(0, 15),
            null,
            2
          )}\n\nIMPORTANT: Use the most recent sources to ensure the outline reflects current information. Focus on recent developments and trends.\n\nReturn a JSON object with this exact structure:
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

// Helper functions
function generateSearchQueriesForOutline(topic: TopicCandidate): string[] {
  // Generate focused search queries specifically for this selected topic
  const queries: string[] = [];

  // Primary query: Use the exact topic title to find specific information
  queries.push(topic.title);

  // If there's a specific angle, that's crucial - search for the topic with that angle
  if (topic.angle && topic.angle.trim().length > 0) {
    // Combine title and angle for a focused search
    queries.push(`${topic.title} ${topic.angle}`);

    // Also try angle-specific phrasing
    if (topic.angle.length < 50) {
      // Only if angle is concise
      queries.push(`${topic.angle} ${topic.title}`);
    }
  }

  // Extract key terms from summary that are specific to this topic
  const stopWords = new Set([
    "the",
    "that",
    "this",
    "with",
    "from",
    "about",
    "their",
    "there",
    "these",
    "those",
    "which",
    "where",
    "when",
    "what",
    "who",
    "how",
    "will",
    "would",
    "could",
    "should",
  ]);
  const summaryWords = topic.summary
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i) // Remove duplicates
    .slice(0, 5); // Get top 5 unique meaningful words

  // Create a query combining topic title with key summary terms
  if (summaryWords.length >= 2) {
    const keyTerms = summaryWords.slice(0, 3).join(" ");
    queries.push(`${topic.title} ${keyTerms}`);
  }

  // Add time-sensitive queries to ensure we get recent information
  queries.push(`latest ${topic.title}`);
  queries.push(`recent ${topic.title} 2025`);

  // If angle exists, add time-sensitive angle query
  if (topic.angle && topic.angle.trim().length > 0) {
    queries.push(`latest ${topic.title} ${topic.angle}`);
  }

  // Deduplicate while preserving order, prioritize shorter more specific queries
  const uniqueQueries = [...new Set(queries)];

  // Sort by specificity (shorter = more specific), then limit
  const sortedQueries = uniqueQueries.sort((a, b) => {
    // Prioritize queries with both title and angle
    const aHasAngle = topic.angle && a.includes(topic.angle);
    const bHasAngle = topic.angle && b.includes(topic.angle);
    if (aHasAngle && !bHasAngle) return -1;
    if (!aHasAngle && bHasAngle) return 1;
    // Then by length (shorter = more focused)
    return a.length - b.length;
  });

  // Return top 2-3 most relevant queries (reduced for speed)
  return sortedQueries.slice(0, 3);
}

function flattenAndDedupe(results: Source[]): Source[] {
  // Flatten and deduplicate search results
  const sources: Source[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
    if (result && typeof result === "object" && "url" in result) {
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

  // If no URLs found, create synthetic sources from the content
  if (sources.length === 0 && text.length > 100) {
    const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 50);
    paragraphs.slice(0, 5).forEach((para, idx) => {
      sources.push({
        url: `https://example.com/${industry}-source-${idx + 1}`,
        title:
          para.split("\n")[0].substring(0, 100) || `${industry} information`,
        snippet: para.substring(0, 200),
        domain: "example.com",
      });
    });
  }

  return sources;
}

// Note: findRelatedArticles is kept for potential future use
// Currently, related articles are fetched in the API route and passed via state

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