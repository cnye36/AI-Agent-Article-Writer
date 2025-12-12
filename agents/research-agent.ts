// agents/research-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { openai } from "@/lib/ai/openai";
import { generateEmbedding } from "@/lib/ai/embeddings";
import type { Source } from "@/types";

interface TopicCandidate {
  title: string;
  summary: string;
  angle: string; // unique perspective
  sources: Source[];
  relevanceScore: number;
  embedding?: number[]; // Vector embedding for semantic similarity
  similarTopics?: Array<{ id: string; title: string; similarity: number }>; // Similar existing topics
}

const ResearchState = Annotation.Root({
  industry: Annotation<string | undefined>,
  keywords: Annotation<string[]>,
  existingTopics: Annotation<string[]>, // titles of existing articles
  discoveredTopics: Annotation<TopicCandidate[]>,
  sources: Annotation<Source[]>,
});

const researchAgentPrompt = `You are a research agent specialized in discovering trending and newsworthy topics.

Your responsibilities:
1. Search for the latest news, trends, and developments based on the provided search criteria
2. Identify unique angles that haven't been covered
3. Avoid topics that overlap with existing articles (provided below)
4. Score topics by relevance, timeliness, and audience interest
5. Gather credible sources for each topic

{industrySection}
Search Keywords: {keywords}

Existing Articles to Avoid Overlap:
{existingTopics}

For each topic, provide a JSON array with this structure:
[
  {
    "title": "Compelling topic title",
    "summary": "2-3 sentence summary",
    "angle": "Unique perspective or angle",
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

      const industryContext = state.industry
        ? ` in the ${state.industry} industry`
        : "";
      const searchPrompts = queries.map(
        (query) =>
          `Research recent news and trends about: "${query}"${industryContext}.
        
        Provide a comprehensive summary of:
        1. Recent developments and news
        2. Key trends and insights
        3. Important sources (include URLs if you know them, or describe the sources)
        
        Format your response with clear sections and include any URLs or source information you can provide.`
      );

      const searchResults = await Promise.all(
        searchPrompts.map(async (prompt) => {
          try {
            // Use OpenAI API with search tool enabled
            // GPT-5.1 and o1/o3 models support web search
            const hasWebAccess =
              searchModel.includes("o1") ||
              searchModel.includes("o3") ||
              searchModel.includes("5.1");
            searchModel.includes("5.2");

            // For GPT-5.1, 5.2 and o1/o3 models, web search is built-in
            // For other models, we'll rely on their knowledge and prompt engineering
            const response = await openai.chat.completions.create({
              model: searchModel,
              messages: [
                {
                  role: "system",
                  content: `You are a research assistant. ${
                    hasWebAccess
                      ? "You have access to real-time web search - use it to find current information, news, and trends. Always cite your sources with URLs."
                      : "Provide information based on your knowledge and include relevant URLs when possible."
                  } Always include source URLs, titles, and summaries when providing information.`,
                },
                { role: "user", content: prompt },
              ],
              reasoning_effort: "medium",
            });

            const content = response.choices[0]?.message?.content || "";
            return extractSourcesFromText(content, state.industry || "general");
          } catch (error) {
            console.error("Search error:", error);
            return [];
          }
        })
      );

      const sources = flattenAndDedupe(searchResults.flat());
      return { sources };
    })
    .addNode("analyze", async (state) => {
      // Analyze sources and extract topic candidates using OpenAI
      const industrySection = state.industry
        ? `Industry: ${state.industry}`
        : "Industry: Not specified (searching based on keywords only)";

      const prompt = researchAgentPrompt
        .replace("{industrySection}", industrySection)
        .replace("{keywords}", state.keywords.join(", "))
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
function generateSearchQueries(industry: string | undefined, keywords: string[]): string[] {
  // If we have keywords, use them (with optional industry prefix)
  if (keywords.length > 0) {
    if (industry) {
      // Combine industry with keywords for better context
      return keywords.map(k => `${industry} ${k}`);
    } else {
      // Just use keywords directly
      return keywords;
    }
  }
  
  // If no keywords but we have industry, use industry-based queries
  if (industry) {
    return [`${industry} news`, `${industry} trends`, `${industry} latest developments`];
  }
  
  // Fallback: generic search queries
  return ["trending topics", "latest news", "current events"];
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
  const lines = text.split('\n');
  let currentSource: Partial<Source> | null = null;
  let currentSection = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const urlMatch = line.match(urlRegex);
    
    if (urlMatch) {
      // Save previous source if exists
      if (currentSource && currentSource.url) {
        sources.push(currentSource as Source);
      }
      
      // Create new source from URL
      const url = urlMatch[0].replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
      currentSource = { url };
      const domainMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
      if (domainMatch) {
        currentSource.domain = domainMatch[1];
      }
      
      // Try to get title from same or next line
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.match(urlRegex) && nextLine.length > 10 && nextLine.length < 200) {
        currentSource.title = nextLine.replace(/^[-*•]\s*/, '');
      }
    } else if (currentSource) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.match(urlRegex)) {
        if (!currentSource.title && trimmed.length > 10 && trimmed.length < 200 && !trimmed.startsWith('http')) {
          currentSource.title = trimmed.replace(/^[-*•]\s*/, '');
        } else if (!currentSource.snippet && trimmed.length > 30) {
          currentSource.snippet = trimmed.substring(0, 300);
        }
      }
      
      // Track section headers for context
      if (trimmed && trimmed.length < 100 && (trimmed.endsWith(':') || /^#{1,3}\s/.test(trimmed))) {
        currentSection = trimmed.replace(/^#{1,3}\s*/, '').replace(':', '');
      }
    }
  }
  
  if (currentSource && currentSource.url) {
    sources.push(currentSource as Source);
  }
  
  // Also add any standalone URLs that weren't captured
  for (const url of urls) {
    const cleanUrl = url.replace(/[.,;!?]+$/, '');
    if (!sources.some(s => s.url === cleanUrl)) {
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
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
    paragraphs.slice(0, 5).forEach((para, idx) => {
      sources.push({
        url: `https://example.com/${industry}-source-${idx + 1}`,
        title: para.split('\n')[0].substring(0, 100) || `${industry} information`,
        snippet: para.substring(0, 200),
        domain: 'example.com',
      });
    });
  }
  
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