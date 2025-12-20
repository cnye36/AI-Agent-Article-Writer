import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST endpoint to save selected topics
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

    const body = await request.json();
    const { topicIds, topics } = body;

    // Validate request
    if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json(
        { error: "Topic IDs array is required" },
        { status: 400 }
      );
    }

    // If topics array is provided, use that; otherwise, we'd need to fetch them
    // For now, require topics to be passed from the client
    if (!topics || !Array.isArray(topics)) {
      return NextResponse.json(
        { error: "Topics data is required for saving" },
        { status: 400 }
      );
    }

    // Filter topics to only include selected ones
    const selectedTopics = topics.filter((topic) =>
      topicIds.includes(topic.id)
    );

    if (selectedTopics.length === 0) {
      return NextResponse.json(
        { error: "No topics selected for saving" },
        { status: 400 }
      );
    }

    // Get industry ID from first topic (all should have same industry)
    const industryId =
      selectedTopics[0]?.industry_id ||
      selectedTopics[0]?.metadata?._topicData?.industry_id;

    if (!industryId) {
      return NextResponse.json(
        { error: "Invalid topic data: missing industry ID" },
        { status: 400 }
      );
    }

    // Prepare topics for insertion
    const topicsToInsert = selectedTopics.map((topic) => {
      const topicData =
        topic.metadata?._topicData || topic;
      return {
        title: topicData.title || topic.title,
        summary: topicData.summary || topic.summary,
        industry_id: industryId,
        sources: topicData.sources || topic.sources || [],
        relevance_score: topicData.relevance_score || topic.relevance_score || 0,
        status: "pending" as const,
        embedding: topicData.embedding || topic.embedding,
        metadata: {
          angle: topicData.angle || topic.metadata?.angle,
          hook: topicData.hook || topic.metadata?.hook,
          discoveredAt: new Date().toISOString(),
          searchKeywords: topic.metadata?.searchKeywords || [],
          similarTopics: topic.metadata?.similarTopics || [],
          articleType: topic.metadata?.articleType,
        },
      };
    });

    // Save to database
    const { data: savedTopics, error: insertError } = await supabase
      .from("topics")
      .insert(topicsToInsert as any)
      .select();

    if (insertError) {
      console.error("Error saving topics:", insertError);
      return NextResponse.json(
        {
          error: "Failed to save topics",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      topics: savedTopics || [],
      saved: true,
      message: `Successfully saved ${savedTopics?.length || 0} topic(s)`,
    });
  } catch (error) {
    console.error("Error saving topics:", error);
    return NextResponse.json(
      {
        error: "Failed to save topics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

