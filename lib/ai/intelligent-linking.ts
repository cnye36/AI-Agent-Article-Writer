import { createClient } from "@/lib/supabase/server";
import { generateEmbeddingForContent } from "./article-embeddings";
import { openai } from "./openai";
import { v4 as uuidv4 } from "uuid";
import { validateAnchorText, insertLinksIntoContent } from "./intelligent-linking-utils";

// Types
export interface LinkOpportunity {
  id: string;
  anchorText: string;
  targetArticleId: string;
  targetArticleTitle: string;
  canonicalUrl: string;
  relevanceScore: number;
  reason: string;
  status: "pending" | "accepted" | "rejected";
}

export interface LinkSuggestionResult {
  suggestions: LinkOpportunity[];
  metadata: {
    candidatesFound: number;
    suggestionsGenerated: number;
    validationErrors: string[];
  };
}

export interface CandidateArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  canonicalUrl: string;
  similarity: number;
}

export interface IntelligentLinksOptions {
  minLinks?: number;
  maxLinks?: number;
  threshold?: number;
}

/**
 * Main orchestrator function for generating intelligent link suggestions
 */
export async function generateIntelligentLinks(
  articleContent: string,
  articleTitle: string,
  articleExcerpt: string,
  targetSiteId: string,
  industryId: string,
  options?: IntelligentLinksOptions
): Promise<LinkSuggestionResult> {
  const {
    minLinks = 3,
    maxLinks = 5,
    threshold = 0.7,
  } = options || {};

  const validationErrors: string[] = [];

  try {
    // Step 1: Find candidate articles on target site
    const candidates = await findCandidateArticles(
      articleContent,
      articleTitle,
      articleExcerpt,
      targetSiteId,
      industryId,
      10, // Fetch more candidates than needed
      threshold
    );

    if (candidates.length === 0) {
      return {
        suggestions: [],
        metadata: {
          candidatesFound: 0,
          suggestionsGenerated: 0,
          validationErrors: [
            "No similar articles found on this site. Try publishing more articles first.",
          ],
        },
      };
    }

    // Step 2: Use GPT to identify anchor text opportunities
    const gptSuggestions = await identifyAnchorTextOpportunities(
      articleContent,
      candidates,
      maxLinks
    );

    // Step 3: Validate anchor text exists in content
    const validSuggestions = gptSuggestions.filter((suggestion) => {
      const isValid = validateAnchorText(articleContent, suggestion.anchorText);
      if (!isValid) {
        validationErrors.push(
          `Anchor text "${suggestion.anchorText}" not found in content`
        );
      }
      return isValid;
    });

    // Step 4: Convert to LinkOpportunity format
    const suggestions: LinkOpportunity[] = validSuggestions.map((s) => ({
      id: uuidv4(),
      anchorText: s.anchorText,
      targetArticleId: s.targetArticleId,
      targetArticleTitle: s.targetArticleTitle,
      canonicalUrl: s.canonicalUrl,
      relevanceScore: s.relevanceScore,
      reason: s.reason,
      status: "pending" as const,
    }));

    return {
      suggestions: suggestions.slice(0, maxLinks),
      metadata: {
        candidatesFound: candidates.length,
        suggestionsGenerated: gptSuggestions.length,
        validationErrors,
      },
    };
  } catch (error) {
    console.error("Error generating intelligent links:", error);
    throw error;
  }
}

/**
 * Find candidate articles published on target site using vector similarity
 */
export async function findCandidateArticles(
  articleContent: string,
  articleTitle: string,
  articleExcerpt: string,
  targetSiteId: string,
  industryId: string,
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<CandidateArticle[]> {
  try {
    const supabase = await createClient();

    // Generate embedding for article
    const embedding = await generateEmbeddingForContent(
      articleTitle,
      articleExcerpt,
      articleContent
    );

    // Find similar published articles using vector search
    const { data: similarArticles, error: similarError } = await supabase.rpc(
      "find_similar_published_articles",
      {
        query_embedding: embedding,
        similarity_threshold: similarityThreshold,
        match_count: 50, // Cast wide net initially
        exclude_article_id: null,
      }
    );

    if (similarError) {
      console.error("Error finding similar articles:", similarError);
      return [];
    }

    if (!similarArticles || similarArticles.length === 0) {
      return [];
    }

    // Get article IDs
    const articleIds = similarArticles.map((a: { id: string }) => a.id);

    // Filter to only articles published on target site
    const { data: publications, error: pubsError } = await supabase
      .from("article_publications")
      .select(
        `
        article_id,
        slug,
        site:publishing_sites!inner (
          id,
          base_path
        )
      `
      )
      .in("article_id", articleIds)
      .eq("site_id", targetSiteId);

    if (pubsError) {
      console.error("Error fetching publications:", pubsError);
      return [];
    }

    if (!publications || publications.length === 0) {
      return [];
    }

    // Build candidates with canonical URLs
    const candidates: CandidateArticle[] = similarArticles
      .filter((article: { id: string }) => {
        return publications.some((p: { article_id: string }) => p.article_id === article.id);
      })
      .map((article: { id: string; title: string; slug: string; excerpt: string | null; similarity: number }) => {
        const pub = publications.find(
          (p: { article_id: string }) => p.article_id === article.id
        );
        const site = pub?.site as { base_path: string } | undefined;
        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          canonicalUrl: `${site?.base_path || ""}/${pub?.slug || article.slug}`,
          similarity: article.similarity,
        };
      })
      .slice(0, limit);

    return candidates;
  } catch (error) {
    console.error("Error finding candidate articles:", error);
    return [];
  }
}

/**
 * Use GPT to identify natural anchor text opportunities
 */
async function identifyAnchorTextOpportunities(
  content: string,
  candidates: CandidateArticle[],
  targetCount: number
): Promise<Array<{
  anchorText: string;
  targetArticleId: string;
  targetArticleTitle: string;
  canonicalUrl: string;
  relevanceScore: number;
  reason: string;
}>> {
  try {
    const prompt = `You are an SEO specialist identifying natural internal linking opportunities.

Article Content:
${content.substring(0, 5000)} ${content.length > 5000 ? "..." : ""}

Similar Articles Available for Linking:
${candidates
  .map(
    (c, idx) =>
      `${idx + 1}. ID: ${c.id}
   Title: "${c.title}"
   Excerpt: ${c.excerpt || "No excerpt"}
   URL: ${c.canonicalUrl}
   Similarity: ${Math.round(c.similarity * 100)}%`
  )
  .join("\n\n")}

Identify ${targetCount} natural anchor text opportunities in the article where you could link to these similar articles.

Rules:
1. Anchor text MUST exist verbatim in the article (case-insensitive)
2. Choose natural, contextually relevant phrases (avoid generic terms like "click here")
3. Prioritize longer phrases (3-6 words) over single words
4. Don't suggest links in headings or titles
5. Spread links throughout article (not clustered in one section)
6. Each link should add value for the reader
7. Match the anchor text's context to the target article's topic

Return ONLY a valid JSON array (no markdown, no explanation):
[{
  "anchorText": "exact phrase from article",
  "targetArticleId": "uuid from list above",
  "targetArticleTitle": "title of target article",
  "canonicalUrl": "url from list above",
  "relevanceScore": 0.0-1.0,
  "reason": "brief explanation of why this link is relevant"
}]`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert SEO specialist. Return only valid JSON arrays with no markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseText = response.choices[0]?.message?.content;
    if (!responseText) {
      console.error("No response from GPT");
      return [];
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse GPT response:", responseText);
      return [];
    }

    // Handle both { suggestions: [...] } and [...] formats
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);

    return suggestions.map((s: {
      anchorText: string;
      targetArticleId: string;
      targetArticleTitle: string;
      canonicalUrl: string;
      relevanceScore: number;
      reason: string;
    }) => ({
      anchorText: s.anchorText,
      targetArticleId: s.targetArticleId,
      targetArticleTitle: s.targetArticleTitle,
      canonicalUrl: s.canonicalUrl,
      relevanceScore: s.relevanceScore || 0.8,
      reason: s.reason || "Contextually relevant",
    }));
  } catch (error) {
    console.error("Error identifying anchor text opportunities:", error);
    return [];
  }
}

