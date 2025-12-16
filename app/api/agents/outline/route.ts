import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOutlineAgent } from "@/agents/outline-agent";
import { z } from "zod";

// Request validation schema
const OutlineRequestSchema = z.object({
  topicId: z.string().uuid(),
  articleType: z.enum([
    "blog",
    "technical",
    "news",
    "opinion",
    "tutorial",
    "listicle",
    "affiliate",
  ]),
  targetLength: z.enum(["short", "medium", "long"]),
  tone: z.string().default("professional"),
  customInstructions: z.string().optional(),
});

// Article type configurations
const ARTICLE_TYPE_CONFIG = {
  blog: {
    description: "Conversational, engaging, personal insights",
    sectionCount: { short: 3, medium: 5, long: 7 },
    includePersonalAnecdotes: true,
    formalityLevel: "casual",
  },
  technical: {
    description: "In-depth, code examples, precise terminology",
    sectionCount: { short: 4, medium: 6, long: 10 },
    includeCodeExamples: true,
    formalityLevel: "formal",
  },
  news: {
    description: "Factual, timely, objective reporting",
    sectionCount: { short: 3, medium: 5, long: 7 },
    includeQuotes: true,
    formalityLevel: "formal",
  },
  opinion: {
    description: "Persuasive, well-argued, clear stance",
    sectionCount: { short: 4, medium: 6, long: 8 },
    includeCounterarguments: true,
    formalityLevel: "moderate",
  },
  tutorial: {
    description: "Step-by-step, actionable, beginner-friendly",
    sectionCount: { short: 5, medium: 8, long: 12 },
    includeSteps: true,
    formalityLevel: "casual",
  },
  listicle: {
    description: "Numbered list format, scannable, engaging",
    sectionCount: { short: 5, medium: 8, long: 12 }, // Each item is a section
    includeNumberedItems: true,
    formalityLevel: "moderate",
  },
  affiliate: {
    description: "Comparison, recommendation, product-focused",
    sectionCount: { short: 4, medium: 6, long: 8 },
    includeComparisons: true,
    includeRecommendations: true,
    formalityLevel: "moderate",
  },
};

// Target word counts
const LENGTH_CONFIG = {
  short: { min: 400, target: 500, max: 700 },
  medium: { min: 800, target: 1000, max: 1300 },
  long: { min: 1800, target: 2000, max: 3000 },
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
    const validationResult = OutlineRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { topicId, articleType, targetLength, tone } = validationResult.data;

    // Fetch the topic
    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .select(
        `
        *,
        industries (
          id,
          name,
          slug
        )
      `
      )
      .eq("id", topicId)
      .single();

    if (topicError || !topicData) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const topic = topicData as any;

    // Fetch related articles for internal linking suggestions
    const { data: relatedArticles } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, seo_keywords")
      .eq("industry_id", topic.industry_id)
      .eq("status", "published")
      .limit(10);

    // Calculate section word targets
    const typeConfig = ARTICLE_TYPE_CONFIG[articleType];
    const lengthConfig = LENGTH_CONFIG[targetLength];
    const sectionCount = typeConfig.sectionCount[targetLength];

    // Initialize and run the outline agent
    const outlineAgent = createOutlineAgent();

    const result = await outlineAgent.invoke({
      topic: {
        title: topic.title,
        summary: topic.summary || "",
        sources: topic.sources || [],
        angle: topic.metadata?.angle || "",
        hook: topic.metadata?.hook || "", // Use hook from research if available
        relevanceScore: 0.8, // Default relevance score
      },
      articleType,
      targetLength,
      tone,
      relatedArticles: (relatedArticles || []).map(
        (a: { id: string; title: string; slug: string }) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
        })
      ),
      freshSources: [], // Will be populated by the search node
    });

    // Enhance outline with word targets
    const enhancedOutline = {
      ...result.outline,
      metadata: {
        articleType,
        targetLength,
        tone,
        totalWordTarget: lengthConfig.target,
        sectionCount,
      },
      sections: (result.outline.sections || []).map(
        (section: { heading: string; keyPoints: string[] }, index: number) => ({
          ...section,
          wordTarget: calculateSectionWordTarget(
            index,
            result.outline.sections.length,
            lengthConfig.target
          ),
        })
      ),
    };

    // Save outline to database
    const { data: savedOutline, error: insertError } = await supabase
      .from("outlines")
      .insert({
        topic_id: topicId,
        structure: enhancedOutline,
        article_type: articleType,
        target_length: targetLength,
        tone,
        approved: false,
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error("Error saving outline:", insertError);
      return NextResponse.json({
        success: true,
        outline: enhancedOutline,
        saved: false,
        error: "Failed to save outline to database",
      });
    }

    // Update topic status
    try {
      const topicsTable = supabase.from("topics") as any;
      await topicsTable.update({ status: "approved" }).eq("id", topicId);
    } catch (updateErr) {
      console.error("Error updating topic status:", updateErr);
      // Continue even if update fails
    }

    return NextResponse.json({
      success: true,
      outline: savedOutline,
      relatedArticles: (relatedArticles || []).map(
        (a: { id: string; title: string; slug: string }) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
        })
      ),
    });
  } catch (error) {
    console.error("Outline agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate outline",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch outlines
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

    const { searchParams } = new URL(request.url);
    const outlineId = searchParams.get("id");
    const topicId = searchParams.get("topicId");

    if (outlineId) {
      // Fetch specific outline
      const { data: outline, error } = await supabase
        .from("outlines")
        .select(
          `
          *,
          topics (
            title,
            summary,
            sources,
            industries (
              name,
              slug
            )
          )
        `
        )
        .eq("id", outlineId)
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({ outline });
    }

    if (topicId) {
      // Fetch outlines for a topic
      const { data: outlines, error } = await supabase
        .from("outlines")
        .select("*")
        .eq("topic_id", topicId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return NextResponse.json({ outlines });
    }

    // Fetch recent outlines
    const { data: outlines, error } = await supabase
      .from("outlines")
      .select(
        `
        *,
        topics (
          title,
          summary
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return NextResponse.json({ outlines });
  } catch (error) {
    console.error("Error fetching outlines:", error);
    return NextResponse.json(
      { error: "Failed to fetch outlines" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to approve/update outline
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { outlineId, approved, structure } = body;

    if (!outlineId) {
      return NextResponse.json(
        { error: "Outline ID is required" },
        { status: 400 }
      );
    }

    const updateData: { approved?: boolean; structure?: unknown } = {};
    if (typeof approved === "boolean") {
      updateData.approved = approved;
    }
    if (structure) {
      updateData.structure = structure;
    }

    const outlinesTable = supabase.from("outlines") as any;
    const { data: updatedOutline, error } = await outlinesTable
      .update(updateData)
      .eq("id", outlineId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      outline: updatedOutline,
    });
  } catch (error) {
    console.error("Error updating outline:", error);
    return NextResponse.json(
      { error: "Failed to update outline" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete an outline
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
        { error: "Outline ID is required" },
        { status: 400 }
      );
    }

    // Check if outline exists
    const { data: outline, error: fetchError } = await supabase
      .from("outlines")
      .select("id, structure")
      .eq("id", id)
      .single();

    if (fetchError || !outline) {
      return NextResponse.json({ error: "Outline not found" }, { status: 404 });
    }

    // Check if outline has associated articles
    const { data: articles } = await supabase
      .from("articles")
      .select("id")
      .eq("outline_id", id)
      .limit(1);

    if (articles && articles.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete outline with associated articles. Delete articles first.",
        },
        { status: 400 }
      );
    }

    // Delete outline (cascade will handle any related data if configured)
    const { error: deleteError } = await supabase
      .from("outlines")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    const outlineTitle = outline.structure?.title || "Untitled Outline";

    return NextResponse.json({
      success: true,
      message: `Outline "${outlineTitle}" deleted`,
    });
  } catch (error) {
    console.error("Error deleting outline:", error);
    return NextResponse.json(
      { error: "Failed to delete outline" },
      { status: 500 }
    );
  }
}

// Streaming endpoint for progressive outline generation
export async function PUT(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Unauthorized",
              })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(errorStream, {
        status: 401,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    const body = await request.json();
    const validationResult = OutlineRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Invalid request",
                details: validationResult.error.flatten(),
              })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(errorStream, {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    const { topicId, articleType, targetLength, tone } = validationResult.data;

    // Fetch the topic
    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .select(
        `
        *,
        industries (
          id,
          name,
          slug
        )
      `
      )
      .eq("id", topicId)
      .single();

    if (topicError || !topicData) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Topic not found",
              })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(errorStream, {
        status: 404,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    const topic = topicData as any;

    // Fetch related articles
    const { data: relatedArticles } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, seo_keywords")
      .eq("industry_id", topic.industry_id)
      .eq("status", "published")
      .limit(10);

    // Calculate section word targets
    const typeConfig = ARTICLE_TYPE_CONFIG[articleType];
    const lengthConfig = LENGTH_CONFIG[targetLength];
    const sectionCount = typeConfig.sectionCount[targetLength];

    // Create placeholder outline immediately
    const placeholderOutline = {
      title: "Generating...",
      hook: "",
      sections: [],
      conclusion: { summary: "", callToAction: "" },
      seoKeywords: [],
      metadata: {
        articleType,
        targetLength,
        tone,
        totalWordTarget: lengthConfig.target,
        sectionCount,
      },
    };

    const { data: savedOutline, error: insertError } = await supabase
      .from("outlines")
      .insert({
        topic_id: topicId,
        structure: placeholderOutline,
        article_type: articleType,
        target_length: targetLength,
        tone,
        approved: false,
      } as any)
      .select()
      .single();

    if (insertError || !savedOutline) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Failed to create outline placeholder",
              })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(errorStream, {
        status: 500,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    // Store outline ID for use in stream
    const outlineId = (savedOutline as any).id;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send outline ID immediately
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "outline_created",
                outlineId,
              })}\n\n`
            )
          );

          // Stream search progress
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "searching",
                message: "Searching for latest information...",
                progress: 5,
              })}\n\n`
            )
          );

          // Initialize outline agent
          const outlineAgent = createOutlineAgent();

          // Generate outline using the agent (search happens inside)
          const result = await outlineAgent.invoke({
            topic: {
              title: topic.title,
              summary: topic.summary || "",
              sources: topic.sources || [], // Use existing sources immediately
              angle: topic.metadata?.angle || "",
              hook: topic.metadata?.hook || "", // Use hook from research if available
              relevanceScore: 0.8,
            },
            articleType,
            targetLength,
            tone,
            relatedArticles: (relatedArticles || []).map(
              (a: { id: string; title: string; slug: string }) => ({
                id: a.id,
                title: a.title,
                slug: a.slug,
              })
            ),
            freshSources: [], // Will be populated by the search node
          });

          // After search completes, update progress
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "generating",
                message: "Generating outline structure...",
                progress: 40,
              })}\n\n`
            )
          );

          const parsedOutline = result.outline;

          // Update progress
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "processing",
                message: "Processing outline structure...",
                progress: 50,
              })}\n\n`
            )
          );

          // Enhance outline with word targets
          const enhancedOutline = {
            ...parsedOutline,
            metadata: {
              articleType,
              targetLength,
              tone,
              totalWordTarget: lengthConfig.target,
              sectionCount,
            },
            sections: (parsedOutline.sections || []).map(
              (section: any, index: number) => ({
                ...section,
                wordTarget: calculateSectionWordTarget(
                  index,
                  parsedOutline.sections.length,
                  lengthConfig.target
                ),
                suggestedLinks: section.suggestedLinks || [],
              })
            ),
          };

          // Update outline in database incrementally
          let lastUpdateTime = Date.now();
          const updateOutline = async (partialOutline: any) => {
            const now = Date.now();
            if (now - lastUpdateTime > 500) {
              await (supabase.from("outlines") as any)
                .update({ structure: partialOutline })
                .eq("id", outlineId);
              lastUpdateTime = now;
            }
          };

          // Update with title and hook first
          const titleHookOutline = {
            ...enhancedOutline,
            sections: [],
            conclusion: { summary: "", callToAction: "" },
          };
          await updateOutline(titleHookOutline);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "title",
                message: "Outline title and hook generated",
                progress: 60,
                outline: titleHookOutline,
              })}\n\n`
            )
          );

          // Update with sections progressively
          for (let i = 0; i < enhancedOutline.sections.length; i++) {
            const sectionsSoFar = enhancedOutline.sections.slice(0, i + 1);
            const partialOutline = {
              ...enhancedOutline,
              sections: sectionsSoFar,
            };
            await updateOutline(partialOutline);

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  stage: "sections",
                  message: `Generated section ${i + 1} of ${
                    enhancedOutline.sections.length
                  }`,
                  progress:
                    60 +
                    Math.round(
                      ((i + 1) / enhancedOutline.sections.length) * 30
                    ),
                  outline: partialOutline,
                })}\n\n`
              )
            );
          }

          // Final update with conclusion
          await (supabase.from("outlines") as any)
            .update({ structure: enhancedOutline })
            .eq("id", outlineId);

          // Update topic status
          try {
            const topicsTable = supabase.from("topics") as any;
            await topicsTable.update({ status: "approved" }).eq("id", topicId);
          } catch (updateErr) {
            console.error("Error updating topic status:", updateErr);
          }

          // Send completion
          const completedOutline = {
            id: outlineId,
            ...(savedOutline as any),
            structure: enhancedOutline,
          };
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                outline: completedOutline,
                progress: 100,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("Streaming outline error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Streaming outline error:", error);
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: "Failed to stream outline generation",
            })}\n\n`
          )
        );
        controller.close();
      },
    });
    return new Response(errorStream, {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}

// Helper function to calculate word targets per section
function calculateSectionWordTarget(
  sectionIndex: number,
  totalSections: number,
  totalWords: number
): number {
  // Introduction and conclusion are typically shorter
  const isIntro = sectionIndex === 0;
  const isConclusion = sectionIndex === totalSections - 1;

  if (isIntro) {
    return Math.floor(totalWords * 0.1); // 10% for intro
  }
  if (isConclusion) {
    return Math.floor(totalWords * 0.1); // 10% for conclusion
  }

  // Remaining 80% distributed among body sections
  const bodySections = totalSections - 2;
  const bodyWords = totalWords * 0.8;
  return Math.floor(bodyWords / bodySections);
}

