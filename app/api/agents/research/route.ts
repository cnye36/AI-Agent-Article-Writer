import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createResearchAgent } from "@/agents/research-agent";
import type { Industry } from "@/types";
import { z } from "zod";

// Request validation schema
const ResearchRequestSchema = z.object({
  industry: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  articleType: z.enum([
    "blog",
    "technical",
    "news",
    "opinion",
    "tutorial",
    "listicle",
    "affiliate",
    "personal",
  ]).optional(),
  maxTopics: z.number().min(1).max(20).default(5),
}).refine(
  (data) => data.industry || (data.keywords && data.keywords.length > 0),
  {
    message: "Either industry or keywords must be provided",
  }
);

// Industry keyword mappings for enhanced search
import { INDUSTRY_KEYWORDS, INDUSTRY_NAMES } from "@/lib/config";

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

    const { industry, keywords, articleType } = validationResult.data;

    // Get industry keywords, merge with custom keywords
    // If only industry is provided, use industry keywords
    // If only keywords are provided, use those
    // If both are provided, merge them (user keywords take precedence in ordering)
    const industryKeywords = industry ? (INDUSTRY_KEYWORDS[industry] || []) : [];
    const userKeywords = keywords || [];
    
    // Merge: user keywords first (more specific), then industry keywords
    // Use Set to deduplicate while preserving order
    const searchKeywords = [...new Set([...userKeywords, ...industryKeywords])];
    // Speed guardrail: don't send huge keyword lists into the search step
    const searchKeywordsForAgent = searchKeywords.slice(0, 6);
    
    // Ensure we have at least some keywords to search with
    if (searchKeywords.length === 0) {
      return NextResponse.json(
        { error: "No search keywords available. Please provide keywords or select an industry." },
        { status: 400 }
      );
    }

    // We rely on vector search for deduplication, so we don't need to fetch all existing topics here.
    const allExistingTopics: string[] = [];

    // Initialize and run the research agent
    const researchAgent = createResearchAgent();

    const result = await researchAgent.invoke({
      industry,
      keywords: searchKeywordsForAgent,
      articleType,
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

    // Return topics WITHOUT saving them - user will select which ones to save
    // Add temporary IDs so they can be referenced in the UI
    const topicsWithTempIds = uniqueTopics.map((topic, index) => ({
      id: `temp-${Date.now()}-${index}`, // Temporary ID until saved
      title: topic.title,
      summary: topic.summary,
      industry_id: industryId,
      sources: topic.sources || [],
      relevance_score: topic.relevanceScore || 0,
      status: "pending" as const,
      discovered_at: new Date().toISOString(),
      embedding: topic.embedding, // Keep embedding for saving later
      metadata: {
        angle: topic.angle,
        hook: topic.hook, // Save the hook for use in outline/article generation
        discoveredAt: new Date().toISOString(),
        searchKeywords: searchKeywords.slice(0, 5),
        similarTopics: topic.similarTopics, // Store similar topics for reference
        articleType: articleType, // Store the article type used for this topic
        temporary: true, // Mark as temporary until saved
        // Store full topic data for saving later
        _topicData: {
          title: topic.title,
          summary: topic.summary,
          industry_id: industryId,
          sources: topic.sources,
          relevance_score: topic.relevanceScore,
          embedding: topic.embedding,
          angle: topic.angle,
          hook: topic.hook,
        },
      },
    }));

    // Include metadata about duplicates filtered
    const duplicatesFiltered = topicsWithSimilarity.filter((t) => t.isDuplicate);

    return NextResponse.json({
      success: true,
      topics: topicsWithTempIds,
      saved: false, // Topics are not saved yet - user must select which ones to save
      metadata: {
        industry: industryForDb,
        industryId: industryId, // Include industry ID for saving later
        keywordsUsed: searchKeywordsForAgent.slice(0, 10),
        existingArticlesChecked: 0, // We now use vector search for deduplication
        topicsDiscovered: topicsWithTempIds.length,
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
      .eq("user_id", user.id)
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

// DELETE endpoint to delete a topic
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Topic ID is required" },
        { status: 400 }
      );
    }

    // Check if topic exists and belongs to user
    const { data: topic, error: fetchError } = await supabase
      .from("topics")
      .select("id, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Check if topic has associated outlines or articles
    const { data: outlines } = await supabase
      .from("outlines")
      .select("id")
      .eq("topic_id", id)
      .limit(1);

    if (outlines && outlines.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete topic with associated outlines. Delete outlines first.",
        },
        { status: 400 }
      );
    }

    // Delete topic (cascade will handle any related data if configured)
    const { error: deleteError } = await supabase
      .from("topics")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `Topic "${topic.title}" deleted`,
    });
  } catch (error) {
    console.error("Error deleting topic:", error);
    return NextResponse.json(
      { error: "Failed to delete topic" },
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
  const insertResult = await supabase
    .from("industries")
    .insert({
      name: INDUSTRY_NAMES[industrySlug] || industrySlug,
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