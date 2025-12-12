import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWriterAgent } from "@/agents/writer-agent";
import { z } from "zod";
import type { Article } from "@/types";

// Request validation schema
const WriteRequestSchema = z.object({
  outlineId: z.string().uuid(),
  customInstructions: z.string().optional(),
  streamResponse: z.boolean().default(false),
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
    const validationResult = WriteRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { outlineId, customInstructions } = validationResult.data;

    // Fetch the outline with topic data
    const { data: outlineData, error: outlineError } = await supabase
      .from("outlines")
      .select(
        `
        *,
        topics (
          id,
          title,
          summary,
          sources,
          metadata,
          industry_id,
          industries (
            id,
            name,
            slug
          )
        )
      `
      )
      .eq("id", outlineId)
      .single();

    if (outlineError || !outlineData) {
      return NextResponse.json({ error: "Outline not found" }, { status: 404 });
    }

    // Type assertion for the outline with joined data
    const outline = outlineData as any;

    if (!outline.approved) {
      return NextResponse.json(
        { error: "Outline must be approved before writing" },
        { status: 400 }
      );
    }

    // Validate topic data
    if (!outline.topics) {
      return NextResponse.json(
        { error: "Topic data not found for outline" },
        { status: 404 }
      );
    }

    // Get industry_id - prefer from joined industries, fallback to topic.industry_id
    const industryId =
      outline.topics.industries?.id || outline.topics.industry_id;
    if (!industryId) {
      return NextResponse.json(
        { error: "Industry ID not found for topic" },
        { status: 404 }
      );
    }

    // Fetch related articles for internal linking
    const { data: relatedArticles } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt")
      .eq("industry_id", industryId)
      .eq("status", "published")
      .limit(15);

    // Build link map from outline suggestions (for future use in writer agent)
    buildLinkMap(outline.structure, relatedArticles || []);

    // Initialize and run the writer agent
    const writerAgent = createWriterAgent();

    // Prepare writer agent input (without linkMap as it's not part of the state)
    const writerInput = {
      outline: outline.structure,
      articleType: outline.article_type,
      tone: outline.tone,
      sources: outline.topics.sources || [],
      currentSection: 0,
      sections: [],
      customInstructions,
    };

    const result = await writerAgent.invoke(writerInput);

    // Generate slug from title
    const slug = generateSlug(outline.structure.title);

    // Calculate word count and reading time
    const wordCount = countWords(result.fullArticle);
    const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

    // Extract internal links from the article
    const internalLinks = extractInternalLinks(
      result.fullArticle,
      relatedArticles || []
    );

    // Convert markdown to HTML
    const contentHtml = await convertToHtml(result.fullArticle);

    // Generate excerpt
    const excerpt = generateExcerpt(result.fullArticle, 160);

    // Save article to database - ALWAYS save, even if other operations fail
    let savedArticle: any = null;
    let articleSaveError: any = null;

    try {
      const { data: articleData, error: insertError } = await supabase
        .from("articles")
        .insert({
          outline_id: outlineId,
          title: outline.structure.title,
          slug,
          content: result.fullArticle,
          content_html: contentHtml,
          excerpt,
          industry_id: industryId,
          article_type: outline.article_type,
          status: "draft",
          word_count: wordCount,
          reading_time: readingTime,
          seo_keywords: outline.structure.seoKeywords || [],
        } as any)
        .select()
        .single();

      if (insertError) {
        articleSaveError = insertError;
        console.error("Error saving article:", insertError);
        // Try to save with minimal data as fallback
        const { data: fallbackArticle } = await supabase
          .from("articles")
          .insert({
            outline_id: outlineId,
            title: outline.structure.title || "Untitled Article",
            slug: slug || `article-${Date.now()}`,
            content: result.fullArticle || "",
            industry_id: industryId,
            article_type: outline.article_type,
            status: "draft",
          } as any)
          .select()
          .single();

        savedArticle = fallbackArticle;
      } else {
        savedArticle = articleData;
      }
    } catch (saveErr) {
      articleSaveError = saveErr;
      console.error("Critical error saving article:", saveErr);
      // Article will be returned in response even if save failed
    }

    // Save internal links (only if article was saved)
    if (savedArticle && internalLinks.length > 0) {
      try {
        const linkInserts = internalLinks.map((link) => ({
          source_article_id: savedArticle.id,
          target_article_id: link.targetId,
          anchor_text: link.anchorText,
          context: link.context,
        }));

        await supabase.from("article_links").insert(linkInserts as any);
      } catch (linkErr) {
        console.error("Error saving links:", linkErr);
        // Continue even if links fail
      }
    }

    // Save initial version (only if article was saved)
    if (savedArticle) {
      try {
        await supabase.from("article_versions").insert({
          article_id: savedArticle.id,
          content: result.fullArticle,
          edited_by: "ai",
          change_summary: "Initial draft generated by AI writer agent",
        } as any);
      } catch (versionErr) {
        console.error("Error saving version:", versionErr);
        // Continue even if version save fails
      }
    }

    // Update topic status
    try {
      await supabase
        .from("topics")
        .update({ status: "used" } as unknown as never)
        .eq("id", outline.topics.id);
    } catch (topicErr) {
      console.error("Error updating topic status:", topicErr);
      // Continue even if topic update fails
    }

    // Always return article data, even if some saves failed
    if (!savedArticle) {
      // Return article data even if save failed
      return NextResponse.json({
        success: true,
        article: {
          id: `temp-${Date.now()}`,
          outline_id: outlineId,
          title: outline.structure.title,
          slug,
          content: result.fullArticle,
          content_html: contentHtml,
          excerpt,
          industry_id: industryId,
          article_type: outline.article_type,
          status: "draft",
          word_count: wordCount,
          reading_time: readingTime,
          seo_keywords: outline.structure.seoKeywords || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: null,
          published_to: [],
        },
        saved: false,
        error:
          articleSaveError?.message || "Failed to save article to database",
        metadata: {
          wordCount,
          readingTime,
          internalLinksCount: internalLinks.length,
          sectionsWritten: outline.structure.sections.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      article: {
        ...savedArticle,
        content_html: contentHtml,
      },
      saved: true,
      metadata: {
        wordCount,
        readingTime,
        internalLinksCount: internalLinks.length,
        sectionsWritten: outline.structure.sections.length,
      },
    });
  } catch (error) {
    console.error("Writer agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate article",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Streaming endpoint for real-time writing progress with true token-level streaming
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
    const { outlineId } = body;

    // Fetch outline with all necessary data
    const { data: outlineData, error: outlineError } = await supabase
      .from("outlines")
      .select(
        `
        *,
        topics (
          id,
          title,
          sources,
          industry_id,
          industries (id, name)
        )
      `
      )
      .eq("id", outlineId)
      .single();

    if (outlineError || !outlineData) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Outline not found",
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

    const outline = outlineData as any;
    const { streamWriteHook, streamWriteSection, streamWriteConclusion } =
      await import("@/lib/ai/streaming-writer");

    // Create article placeholder first so we have an ID to navigate to
    const slug = generateSlug(outline.structure.title);
    const { data: placeholderArticleData, error: placeholderError } =
      await supabase
        .from("articles")
        .insert({
          outline_id: outlineId,
          title: outline.structure.title,
          slug,
          content: "", // Empty initially, will be updated as we stream
          content_html: "",
          excerpt: "",
          industry_id: outline.topics?.industry_id,
          article_type: outline.article_type,
          status: "draft",
          word_count: 0,
          reading_time: 0,
          seo_keywords: outline.structure.seoKeywords || [],
        } as any)
        .select()
        .single();

    const placeholderArticle = placeholderArticleData as Article | null;

    if (placeholderError || !placeholderArticle) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Failed to create article placeholder",
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

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const sections: string[] = [];
        let fullArticle = `# ${outline.structure.title}\n\n`;

        try {
          // Send article ID first so client can navigate immediately
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "article_created",
                articleId: placeholderArticle.id,
              })}\n\n`
            )
          );
          // 1. Stream the hook/introduction
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "hook",
                message: "Writing introduction...",
                progress: 0,
              })}\n\n`
            )
          );

          let hookContent = "";
          let lastUpdateTime = Date.now();
          for await (const token of streamWriteHook(
            outline.structure.title,
            outline.structure.hook,
            outline.article_type,
            outline.tone
          )) {
            hookContent += token;
            fullArticle = `# ${outline.structure.title}\n\n${hookContent}\n\n`;

            // Update article in database every 500ms to show progress
            const now = Date.now();
            if (now - lastUpdateTime > 500) {
              await(supabase.from("articles") as any)
                .update({ content: fullArticle })
                .eq("id", placeholderArticle.id);
              lastUpdateTime = now;
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "token",
                  content: token,
                  stage: "hook",
                })}\n\n`
              )
            );
          }

          fullArticle = `# ${outline.structure.title}\n\n${hookContent}\n\n`;

          // 2. Stream each section
          const totalSections = outline.structure.sections.length;

          for (let i = 0; i < totalSections; i++) {
            const section = outline.structure.sections[i];
            const progress = Math.round(((i + 1) / (totalSections + 2)) * 100); // +2 for hook and conclusion

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  stage: "section",
                  section: i + 1,
                  total: totalSections,
                  sectionTitle: section.heading,
                  progress,
                  message: `Writing: ${section.heading}...`,
                })}\n\n`
              )
            );

            let sectionContent = "";
            const sectionGenerator = streamWriteSection(section, {
              articleTitle: outline.structure.title,
              articleType: outline.article_type,
              tone: outline.tone,
              previousSections: sections,
              sources: outline.topics?.sources || [],
              sectionIndex: i,
              totalSections,
            });

            for await (const token of sectionGenerator) {
              sectionContent += token;

              // Rebuild full article with current progress (including this section in progress)
              const currentSections = [...sections, sectionContent];
              const currentFullArticle = `# ${
                outline.structure.title
              }\n\n${hookContent}\n\n${currentSections.join("\n\n")}\n\n`;

              // Update article in database every 500ms to show progress
              const now = Date.now();
              if (now - lastUpdateTime > 500) {
                await(supabase.from("articles") as any)
                  .update({ content: currentFullArticle })
                  .eq("id", placeholderArticle.id);
                lastUpdateTime = now;
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "token",
                    content: token,
                    stage: "section",
                    sectionIndex: i,
                  })}\n\n`
                )
              );
            }

            sections.push(sectionContent);
            fullArticle = `# ${
              outline.structure.title
            }\n\n${hookContent}\n\n${sections.join("\n\n")}\n\n`;

            // Update after each section completes
            await(supabase.from("articles") as any)
              .update({ content: fullArticle })
              .eq("id", placeholderArticle.id);
            lastUpdateTime = Date.now();
          }

          // 3. Stream the conclusion
          const conclusionProgress = Math.round(
            ((totalSections + 1) / (totalSections + 2)) * 100
          );

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "conclusion",
                message: "Writing conclusion...",
                progress: conclusionProgress,
              })}\n\n`
            )
          );

          let conclusionContent = "";
          for await (const token of streamWriteConclusion(
            outline.structure.conclusion,
            outline.structure.title,
            outline.article_type,
            outline.tone,
            fullArticle
          )) {
            conclusionContent += token;
            const currentFullArticle = `${fullArticle}${conclusionContent}`;

            // Update article in database every 500ms to show progress
            const now = Date.now();
            if (now - lastUpdateTime > 500) {
              await(supabase.from("articles") as any)
                .update({ content: currentFullArticle })
                .eq("id", placeholderArticle.id);
              lastUpdateTime = now;
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "token",
                  content: token,
                  stage: "conclusion",
                })}\n\n`
              )
            );
          }

          fullArticle += conclusionContent;

          // 4. Update article with final content
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "saving",
                message: "Saving article...",
                progress: 95,
              })}\n\n`
            )
          );

          const wordCount = countWords(fullArticle);
          const readingTime = Math.ceil(wordCount / 200);
          const contentHtml = await convertToHtml(fullArticle);
          const excerpt = generateExcerpt(fullArticle, 160);

          // Update the placeholder article with final content
          const { data: savedArticle, error: saveError } = await(
            supabase.from("articles") as any
          )
            .update({
              content: fullArticle,
              content_html: contentHtml,
              excerpt,
              word_count: wordCount,
              reading_time: readingTime,
            })
            .eq("id", placeholderArticle.id)
            .select()
            .single();

          if (saveError) {
            console.error("Error updating article:", saveError);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "warning",
                  message: "Article generated but failed to update in database",
                })}\n\n`
              )
            );
          } else {
            // Update topic status
            await supabase
              .from("topics")
              .update({ status: "used" } as unknown as never)
              .eq("id", outline.topics.id);
          }

          // 5. Send completion
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                article: savedArticle || {
                  id: `temp-${Date.now()}`,
                  title: outline.structure.title,
                  content: fullArticle,
                  slug,
                  word_count: wordCount,
                  reading_time: readingTime,
                },
                metadata: {
                  wordCount,
                  readingTime,
                  sectionsWritten: totalSections,
                  saved: !saveError,
                },
                progress: 100,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
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
    console.error("Streaming writer error:", error);
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: "Failed to stream article generation",
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

// Helper function to build link map from outline suggestions
function buildLinkMap(
  structure: { sections?: Array<{ suggestedLinks?: Array<{ articleId: string; anchorText: string }> }> },
  relatedArticles: Array<{ id: string; slug: string; title: string }>
): Map<string, { url: string; title: string }> {
  const linkMap = new Map();

  for (const section of structure.sections || []) {
    for (const link of section.suggestedLinks || []) {
      const article = relatedArticles.find((a) => a.id === link.articleId);
      if (article) {
        linkMap.set(link.anchorText.toLowerCase(), {
          url: `/articles/${article.slug}`,
          title: article.title,
        });
      }
    }
  }

  return linkMap;
}

// Helper function to generate URL slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

// Helper function to count words
function countWords(text: string): number {
  return text
    .replace(/[#*_\[\]()]/g, "") // Remove markdown
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// Helper function to extract internal links
function extractInternalLinks(
  content: string,
  relatedArticles: Array<{ id: string; slug: string }>
): { targetId: string; anchorText: string; context: string }[] {
  const links: { targetId: string; anchorText: string; context: string }[] = [];

  // Match markdown links [text](/articles/slug)
  const linkRegex = /\[([^\]]+)\]\(\/articles\/([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const anchorText = match[1];
    const slug = match[2];

    const article = relatedArticles.find((a) => a.slug === slug);
    if (article) {
      // Get surrounding context (50 chars before and after)
      const start = Math.max(0, match.index - 50);
      const end = Math.min(content.length, match.index + match[0].length + 50);
      const context = content.substring(start, end).replace(/\n/g, " ");

      links.push({
        targetId: article.id,
        anchorText,
        context,
      });
    }
  }

  return links;
}

// Helper function to convert markdown to HTML
async function convertToHtml(markdown: string): Promise<string> {
  // Simple markdown to HTML conversion
  // In production, use a library like marked or remark
  const html = markdown
    // Headers
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br>");

  return `<p>${html}</p>`;
}

// Helper function to generate excerpt
function generateExcerpt(content: string, maxLength: number): string {
  // Remove markdown formatting
  const plainText = content
    .replace(/[#*_\[\]()]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Cut at word boundary
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return truncated.substring(0, lastSpace) + "...";
}