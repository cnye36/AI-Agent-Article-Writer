import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createBrainstormAgent,
  convertBrainstormToTopics,
} from "@/agents/brainstorm-agent";
import { z } from "zod";

// Request validation schema
const BrainstormRequestSchema = z.object({
  industry: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  articleType: z.string().optional(),
  targetAudience: z.string().optional(),
  contentGoals: z.array(z.string()).optional(),
  count: z.number().min(1).max(10).default(5),
}).refine(
  (data) => data.industry || (data.keywords && data.keywords.length > 0),
  {
    message: "Either industry or keywords must be provided",
  }
);

/**
 * POST /api/agents/brainstorm
 * Generate creative article topic ideas using AI brainstorming
 */
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

    // Parse and validate request
    const body = await request.json();
    const validationResult = BrainstormRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { industry, keywords, articleType, targetAudience, contentGoals, count } =
      validationResult.data;

    let industryData: { id: string; keywords: string[] } | null = null;
    let industryId: string | null = null;
    let allKeywords: string[] = [];
    let avoidTopics: string[] = [];

    // If industry is provided, get it from database
    if (industry) {
      const { data: data, error: industryError } = await supabase
        .from("industries")
        .select("id, keywords")
        .eq("slug", industry.toLowerCase())
        .single();

      if (industryError || !data) {
        return NextResponse.json(
          { error: "Industry not found" },
          { status: 404 }
        );
      }

      industryData = data;
      industryId = data.id;

      // Get existing topics to avoid duplicates
      const { data: existingTopics } = await supabase
        .from("topics")
        .select("title")
        .eq("industry_id", industryId)
        .in("status", ["approved", "used"])
        .limit(50);

      avoidTopics = existingTopics?.map((t) => t.title) || [];

      // Combine industry keywords with user keywords
      allKeywords = [
        ...((industryData.keywords as string[]) || []),
        ...(keywords || []),
      ].filter(Boolean);
    } else {
      // Only keywords provided - use them directly
      allKeywords = keywords || [];
      
      // Get existing topics across all industries to avoid duplicates
      const { data: existingTopics } = await supabase
        .from("topics")
        .select("title")
        .in("status", ["approved", "used"])
        .limit(100);

      avoidTopics = existingTopics?.map((t) => t.title) || [];

      // Use default "tech" industry when only keywords are provided
      const { data: defaultIndustry } = await supabase
        .from("industries")
        .select("id, keywords")
        .eq("slug", "tech")
        .single();

      if (defaultIndustry) {
        industryData = defaultIndustry;
        industryId = defaultIndustry.id;
      } else {
        // Fallback: create a temporary industry ID (shouldn't happen in production)
        return NextResponse.json(
          { error: "Default industry 'tech' not found. Please select an industry." },
          { status: 500 }
        );
      }
    }

    // Create and run brainstorm agent
    const agent = await createBrainstormAgent();
    const result = await agent.invoke({
      industry: industry || "tech", // Use provided industry or default
      keywords: allKeywords,
      articleType,
      targetAudience,
      contentGoals,
      avoidTopics,
      count,
    });

    // Convert to standard topic format (industryId is guaranteed to be set at this point)
    const topics = convertBrainstormToTopics(result.topics, industryId!);

    // Save topics to database
    const { data: savedTopics, error: saveError } = await supabase
      .from("topics")
      .insert(
        topics.map((topic) => ({
          ...topic,
          metadata: topic.metadata || {},
        })) as any
      )
      .select();

    if (saveError) {
      console.error("Error saving brainstormed topics:", saveError);
      // Return topics anyway even if save fails
      return NextResponse.json({
        success: true,
        topics: topics.map((t, i) => ({
          ...t,
          id: `temp-${Date.now()}-${i}`,
          discovered_at: new Date().toISOString(),
        })),
        saved: false,
        error: saveError.message,
        metadata: {
          industry,
          method: "brainstorm",
          topicsGenerated: result.topics.length,
          avoidedTopicsCount: avoidTopics.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      topics: savedTopics,
      metadata: {
        industry,
        method: "brainstorm",
        topicsGenerated: result.topics.length,
        avoidedTopicsCount: avoidTopics.length,
        keywordsUsed: allKeywords,
      },
    });
  } catch (error) {
    console.error("Brainstorm agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate topic ideas",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/brainstorm
 * Get brainstorming configuration options
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return configuration options
    return NextResponse.json({
      success: true,
      options: {
        articleTypes: [
          "blog",
          "technical",
          "how-to",
          "listicle",
          "case-study",
          "opinion",
          "comparison",
          "analysis",
          "tutorial",
          "news",
        ],
        contentGoals: [
          "educate",
          "engage",
          "convert",
          "inspire",
          "entertain",
          "inform",
          "persuade",
        ],
        targetAudiences: [
          "general audience",
          "beginners",
          "intermediate",
          "advanced",
          "professionals",
          "executives",
          "technical readers",
          "decision makers",
        ],
        countRange: {
          min: 1,
          max: 10,
          default: 5,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching brainstorm options:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch options",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
