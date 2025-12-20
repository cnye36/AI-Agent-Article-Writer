import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEditorAgent } from "@/agents/editor-agent";
import { streamEditArticle } from "@/lib/ai/streaming-editor";
import { z } from "zod";
import type { Article } from "@/types";

// Helper functions
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

async function convertToHtml(markdown: string): Promise<string> {
  // Simple markdown to HTML conversion
  // In production, use a proper markdown library like 'marked' or 'remark'
  return markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, "<p>$1</p>");
}

// Request validation schema
const EditRequestSchema = z.object({
  articleId: z.string().uuid(),
  content: z.string().optional(), // If omitted, fetched from DB
});

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
    const validationResult = EditRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { articleId, content } = validationResult.data;

    // Fetch article if content not provided
    let articleContent = content;
    let article: Article | null = null;

    if (!articleContent) {
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (articleError || !articleData) {
        return NextResponse.json(
          { error: "Article not found" },
          { status: 404 }
        );
      }

      article = articleData as Article;
      articleContent = article.content;
    } else {
      // Fetch article metadata
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (articleError || !articleData) {
        return NextResponse.json(
          { error: "Article not found" },
          { status: 404 }
        );
      }

      article = articleData as Article;
    }

    if (!articleContent) {
      return NextResponse.json(
        { error: "Article content is required" },
        { status: 400 }
      );
    }

    // Initialize and run the editor agent
    const editorAgent = createEditorAgent();

    const editorResult = await editorAgent.invoke({
      articleContent,
      articleType: article.article_type,
      tone: article.metadata?.tone as string | undefined,
      editedContent: "",
    });

    const editedContent = editorResult.editedContent || articleContent;

    // Calculate word count and reading time
    const wordCount = countWords(editedContent);
    const readingTime = Math.ceil(wordCount / 200);

    // Convert markdown to HTML
    const contentHtml = await convertToHtml(editedContent);

    // Update article in database
    const { data: updatedArticle, error: updateError } = await supabase
      .from("articles")
      .update({
        content: editedContent,
        content_html: contentHtml,
        word_count: wordCount,
        reading_time: readingTime,
      })
      .eq("id", articleId)
      .select()
      .single();

    if (updateError || !updatedArticle) {
      return NextResponse.json(
        {
          error: "Failed to update article",
          details: updateError?.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    // Save version
    await supabase.from("article_versions").insert({
      article_id: articleId,
      content: editedContent,
      edited_by: "ai",
      change_summary: "Content refined by AI editor agent (removed AI patterns, fixed em dashes, improved flow)",
    });

    return NextResponse.json({
      success: true,
      article: updatedArticle as Article,
      metadata: {
        wordCount,
        readingTime,
        originalWordCount: countWords(articleContent),
      },
    });
  } catch (error) {
    console.error("Error in editor agent:", error);
    return NextResponse.json(
      {
        error: "Failed to edit article",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Streaming endpoint for real-time editing with token-level streaming
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
    const { articleId, content } = body;

    // Fetch article if content not provided
    let articleContent = content;
    let article: Article | null = null;

    if (!articleContent) {
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (articleError || !articleData) {
        const errorStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: "Article not found",
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

      article = articleData as Article;
      articleContent = article.content;
    } else {
      // Fetch article metadata
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (articleError || !articleData) {
        const errorStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: "Article not found",
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

      article = articleData as Article;
    }

    if (!articleContent) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Article content is required",
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

    // Save version BEFORE editing (for rollback capability)
    const { data: versionData, error: versionError } = await supabase
      .from("article_versions")
      .insert({
        article_id: articleId,
        content: articleContent,
        edited_by: "user",
        change_summary: "Pre-editor snapshot (before AI editor agent)",
      })
      .select()
      .single();

    if (versionError) {
      console.error("Failed to save pre-editor version:", versionError);
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let editedContent = "";
        let lastUpdateTime = Date.now();

        try {
          // Send start event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "start",
                message: "Starting editor agent...",
              })}\n\n`
            )
          );

          // Stream the edited content
          for await (const token of streamEditArticle(
            articleContent,
            article.article_type,
            (article.metadata as { tone?: string } | undefined)?.tone
          )) {
            editedContent += token;

            // Update article in database every 500ms to show progress
            const now = Date.now();
            if (now - lastUpdateTime > 500) {
              await (supabase.from("articles") as any)
                .update({ content: editedContent })
                .eq("id", articleId);
              lastUpdateTime = now;
            }

            // Stream token to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "token",
                  content: token,
                })}\n\n`
              )
            );
          }

          // Calculate final metrics
          const wordCount = countWords(editedContent);
          const readingTime = Math.ceil(wordCount / 200);
          const contentHtml = await convertToHtml(editedContent);

          // Update article with final content
          await (supabase.from("articles") as any)
            .update({
              content: editedContent,
              content_html: contentHtml,
              word_count: wordCount,
              reading_time: readingTime,
            })
            .eq("id", articleId);

          // Save version with editor changes
          await supabase.from("article_versions").insert({
            article_id: articleId,
            content: editedContent,
            edited_by: "ai",
            change_summary: "Content refined by AI editor agent (removed AI patterns, fixed em dashes, improved flow)",
          });

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                wordCount,
                readingTime,
                originalWordCount: countWords(articleContent),
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("Error in streaming editor:", error);
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
    console.error("Streaming editor error:", error);
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: "Failed to stream article editing",
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

