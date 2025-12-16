import type { Source } from "@/types";

type TavilySearchResult = {
  url: string;
  title?: string;
  content?: string;
  published_date?: string;
  score?: number;
};

type TavilySearchResponse = {
  results?: TavilySearchResult[];
};

function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/**
 * Lightweight Tavily search wrapper.
 * - Uses `TAVILY_API_KEY`
 * - Designed for speed: `search_depth=basic`, small maxResults, short timeout
 */
export async function tavilySearchSources(params: {
  query: string;
  maxResults?: number;
  timeoutMs?: number;
}): Promise<Source[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const { query, maxResults = 6, timeoutMs = 7000 } = params;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
        include_images: false,
        include_raw_content: false,
      }),
    });

    if (!resp.ok) return [];
    const data = (await resp.json()) as TavilySearchResponse;
    const results = data.results || [];

    return results
      .filter((r) => typeof r.url === "string" && r.url.length > 0)
      .map((r) => ({
        url: r.url,
        title: r.title || domainFromUrl(r.url) || "Source",
        snippet: r.content?.slice(0, 300),
        date: r.published_date,
        domain: domainFromUrl(r.url),
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}


/**
 * Inspect a specific URL to get its content (simulated via search or direct fetch if supported).
 * Uses the URL as the query to get the most relevant snippet/content for that specific page.
 */
export async function inspectUrl(url: string, timeoutMs = 10000): Promise<Source | null> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return null;
  
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
    try {
      // We use the search endpoint with the URL as the query to "find" and extract it.
      // Tavily is good at understanding this.
      const resp = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          api_key: apiKey,
          query: url, // Query is the URL itself
          search_depth: "advanced", // Use advanced to try and get better content
          max_results: 1, // We only want this one
          include_raw_content: false,
        }),
      });
  
      if (!resp.ok) return null;
      const data = (await resp.json()) as TavilySearchResponse;
      const result = data.results?.[0];
  
      if (!result) return null;
  
      return {
        url: result.url,
        title: result.title || domainFromUrl(result.url) || "Source",
        snippet: result.content?.slice(0, 1000), // Get a longer snippet for inspection
        date: result.published_date,
        domain: domainFromUrl(result.url),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
