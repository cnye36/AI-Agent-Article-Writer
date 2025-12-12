import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createResearchAgent } from "@/agents/research-agent";
import type { Industry } from "@/types";
import { z } from "zod";

// Request validation schema
const ResearchRequestSchema = z.object({
  industry: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  maxTopics: z.number().min(1).max(20).default(5),
}).refine(
  (data) => data.industry || (data.keywords && data.keywords.length > 0),
  {
    message: "Either industry or keywords must be provided",
  }
);

// Industry keyword mappings for enhanced search
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  ai: [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "LLM",
    "GPT",
    "neural network",
    "AI agents",
    "generative AI",
    "transformer models",
    "computer vision",
  ],
  tech: [
    "technology",
    "software",
    "startup",
    "SaaS",
    "cloud computing",
    "cybersecurity",
    "devops",
    "programming",
    "open source",
    "tech industry",
  ],
  health: [
    "healthcare",
    "medical",
    "wellness",
    "biotech",
    "digital health",
    "telemedicine",
    "mental health",
    "pharmaceutical",
    "clinical trials",
    "health tech",
  ],
  finance: [
    "fintech",
    "banking",
    "investment",
    "cryptocurrency",
    "stock market",
    "venture capital",
    "financial services",
    "payments",
    "insurance tech",
    "trading",
  ],
  climate: [
    "climate change",
    "sustainability",
    "renewable energy",
    "clean tech",
    "carbon footprint",
    "ESG",
    "green technology",
    "electric vehicles",
    "solar energy",
    "climate tech",
  ],
  crypto: [
    "cryptocurrency",
    "blockchain",
    "web3",
    "DeFi",
    "NFT",
    "Bitcoin",
    "Ethereum",
    "smart contracts",
    "decentralized",
    "crypto regulation",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ResearchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { industry, keywords } = validationResult.data;

    // Get industry keywords, merge with custom keywords
    // If only industry is provided, use industry keywords
    // If only keywords are provided, use those
    // If both are provided, merge them (user keywords take precedence in ordering)
    const industryKeywords = industry ? (INDUSTRY_KEYWORDS[industry] || []) : [];
    const userKeywords = keywords || [];
    
    // Merge: user keywords first (more specific), then industry keywords
    // Use Set to deduplicate while preserving order
    const searchKeywords = [...new Set([...userKeywords, ...industryKeywords])];
    
    // Ensure we have at least some keywords to search with
    if (searchKeywords.length === 0) {
      return NextResponse.json(
        { error: "No search keywords available. Please provide keywords or select an industry." },
        { status: 400 }
      );
    }

    // Fetch existing article titles to avoid duplicates
    let existingTopics: string[] = [];
    if (industry) {
      const fetchedIndustryId = await getIndustryId(supabase, industry);
      
      if (fetchedIndustryId) {
        const { data: existingArticles, error: articlesError } = await supabase
          .from("articles")
          .select("title, excerpt")
          .eq("industry_id", fetchedIndustryId)
          .in("status", ["draft", "review", "published"]);

        if (articlesError) {
          console.error("Error fetching existing articles:", articlesError);
        }

        existingTopics = existingArticles?.map((a: { title: string }) => a.title) || [];
      }
    }

    // Fetch existing pending topics to avoid duplicates
    const { data: pendingTopics } = await supabase
      .from("topics")
      .select("title")
      .eq("status", "pending");

    const allExistingTopics = [
      ...existingTopics,
      ...((pendingTopics as Array<{ title: string }> | null)?.map((t) => t.title) || []),
    ];

    // Initialize and run the research agent
    const researchAgent = createResearchAgent();

    const result = await researchAgent.invoke({
      industry,
      keywords: searchKeywords,
      existingTopics: allExistingTopics,
    });

    // Get or create industry record (use default "tech" if no industry provided)
    const industryForDb = industry || "tech";
    const industryId = await getOrCreateIndustry(supabase, industryForDb);

    // Check for semantic duplicates using embeddings
    const topicsWithSimilarity = await Promise.all(
      result.discoveredTopics.map(async (topic) => {
        let similarTopics: Array<{ id: string; title: string; similarity: number }> = [];

        // Only check for duplicates if we have an embedding
        if (topic.embedding) {
          try {
            const { data: similar } = await(supabase.rpc as any)(
              "find_similar_topics",
              {
                query_embedding: topic.embedding,
                similarity_threshold: 0.85, // 85% similar = likely duplicate
                match_count: 5,
              }
            );

            similarTopics = (similar || []) as Array<{
              id: string;
              title: string;
              similarity: number;
            }>;
          } catch (error) {
            console.error(
              `Error checking for similar topics for "${topic.title}":`,
              error
            );
          }
        }

        return {
          ...topic,
          similarTopics,
          isDuplicate: similarTopics.length > 0 && similarTopics[0].similarity > 0.9, // 90%+ = definite duplicate
        };
      })
    );

    // Filter out definite duplicates (>90% similar)
    const uniqueTopics = topicsWithSimilarity.filter((topic) => !topic.isDuplicate);

    // Save discovered topics to database
    const topicsToInsert = uniqueTopics.map((topic) => ({
      title: topic.title,
      summary: topic.summary,
      industry_id: industryId,
      sources: topic.sources,
      relevance_score: topic.relevanceScore,
      status: "pending" as const,
      embedding: topic.embedding, // Save the embedding vector
      metadata: {
        angle: topic.angle,
        discoveredAt: new Date().toISOString(),
        searchKeywords: searchKeywords.slice(0, 5),
        similarTopics: topic.similarTopics, // Store similar topics for reference
      },
    }));

    const { data: savedTopics, error: insertError } = await supabase
      .from("topics")
      .insert(topicsToInsert as any)
      .select();

    if (insertError) {
      console.error("Error saving topics:", insertError);
      // Still return the topics even if save fails, but add temporary IDs
      // so they can still be used (though they won't persist)
      const topicsWithTempIds = result.discoveredTopics.map((topic, index) => ({
        id: `temp-${Date.now()}-${index}`, // Temporary ID
        title: topic.title,
        summary: topic.summary,
        industry_id: industryId,
        sources: topic.sources || [],
        relevance_score: topic.relevanceScore || 0,
        status: "pending" as const,
        discovered_at: new Date().toISOString(),
        metadata: {
          angle: topic.angle,
          discoveredAt: new Date().toISOString(),
          searchKeywords: searchKeywords.slice(0, 5),
          temporary: true, // Mark as temporary
        },
      }));
      
      return NextResponse.json({
        success: true,
        topics: topicsWithTempIds,
        saved: false,
        error: "Failed to save topics to database",
        warning: "Topics have temporary IDs and may not persist",
      });
    }

    // Include metadata about duplicates filtered
    const duplicatesFiltered = topicsWithSimilarity.filter((t) => t.isDuplicate);

    return NextResponse.json({
      success: true,
      topics: savedTopics || [],
      metadata: {
        industry: industryForDb,
        keywordsUsed: searchKeywords.slice(0, 10),
        existingArticlesChecked: allExistingTopics.length,
        topicsDiscovered: (savedTopics || []).length,
        duplicatesFiltered: duplicatesFiltered.length,
        duplicates: duplicatesFiltered.map((d) => ({
          title: d.title,
          similarTo: d.similarTopics?.[0]?.title,
          similarity: d.similarTopics?.[0]?.similarity,
        })),
      },
    });
  } catch (error) {
    console.error("Research agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to run research agent",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch pending topics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get("industry");
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("topics")
      .select(
        `
        *,
        industries (
          name,
          slug
        )
      `
      )
      .eq("status", status)
      .order("relevance_score", { ascending: false })
      .limit(limit);

    if (industry) {
      const industryId = await getIndustryId(supabase, industry);
      if (industryId) {
        query = query.eq("industry_id", industryId);
      }
    }

    const { data: topics, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}

// Helper function to get industry ID
async function getIndustryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  industrySlug: string
): Promise<string | null> {
  const result = await supabase
    .from("industries")
    .select("id")
    .eq("slug", industrySlug)
    .single();

  return (result.data as unknown as Industry | null)?.id || null;
}

// Helper function to get or create industry
async function getOrCreateIndustry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  industrySlug: string
): Promise<string> {
  // Try to get existing
  const existingResult = await supabase
    .from("industries")
    .select("id")
    .eq("slug", industrySlug)
    .single() as any;

  if (existingResult.data) {
    return (existingResult.data as Industry).id;
  }

  // Create new industry
  const industryNames: Record<string, string> = {
    ai: "AI & Machine Learning",
    tech: "Technology",
    health: "Health & Wellness",
    finance: "Finance & Fintech",
    climate: "Climate & Sustainability",
    crypto: "Crypto & Web3",
  };

  const insertResult = await supabase
    .from("industries")
    .insert({
      name: industryNames[industrySlug] || industrySlug,
      slug: industrySlug,
      keywords: INDUSTRY_KEYWORDS[industrySlug] || [],
    } as any)
    .select("id")
    .single() as any;

  if (insertResult.error) {
    throw new Error(`Failed to create industry: ${insertResult.error.message}`);
  }

  if (!insertResult.data) {
    throw new Error("Failed to create industry: no data returned");
  }

  return (insertResult.data as Industry).id;
}