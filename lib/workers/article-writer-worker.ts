import { createClient } from "@/lib/supabase/server";
import { createWriterAgent } from "@/agents/writer-agent";
import { JobQueue } from "@/lib/job-queue";
import type {
  WriteArticleJobInput,
  WriteArticleJobOutput,
  Article,
  Outline,
  ArticleLink,
  ArticleVersion,
  Topic,
} from "@/types";

/**
 * Background worker to process article writing jobs
 */
export async function processArticleWritingJob(jobId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Get the job
    const job = await JobQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Mark job as running
    await JobQueue.updateJobStatus(jobId, "running");

    const input = job.input as WriteArticleJobInput;
    const { outlineId, customInstructions } = input;

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 0,
      total: 100,
      message: "Fetching outline...",
    });

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
      throw new Error("Outline not found");
    }

    const outline = outlineData as Outline;

    if (!outline.approved) {
      throw new Error("Outline must be approved before writing");
    }

    if (!outline.topics) {
      throw new Error("Topic data not found for outline");
    }

    const industryId =
      outline.topics.industries?.id || outline.topics.industry_id;
    if (!industryId) {
      throw new Error("Industry ID not found for topic");
    }

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 10,
      total: 100,
      message: "Fetching related articles...",
    });

    // Fetch related articles for internal linking
    const { data: relatedArticles } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt")
      .eq("industry_id", industryId)
      .eq("status", "published")
      .limit(15);

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 20,
      total: 100,
      message: "Initializing AI writer...",
    });

    // Initialize writer agent
    const writerAgent = createWriterAgent();

    const effectiveCustomInstructions =
      customInstructions ||
      (
        outline?.structure?.metadata as
          | { customInstructions?: string }
          | undefined
      )?.customInstructions ||
      undefined;

    // Normalize outline sections to ensure suggestedLinks is always an array
    const normalizedOutline = {
      ...outline.structure,
      sections: outline.structure.sections.map((section) => ({
        ...section,
        suggestedLinks: section.suggestedLinks || [],
      })),
    };

    const writerInput = {
      outline: normalizedOutline,
      articleType: outline.article_type,
      tone: outline.tone,
      sources: outline.topics.sources || [],
      currentSection: 0,
      sections: [],
      customInstructions: effectiveCustomInstructions,
    };

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 30,
      total: 100,
      message: "Generating article content...",
      metadata: {
        sectionsCompleted: 0,
        currentSection: "Introduction",
      },
    });

    // Run writer agent
    const result = await writerAgent.invoke(writerInput);

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 70,
      total: 100,
      message: "Processing article content...",
      metadata: {
        sectionsCompleted: outline.structure.sections.length,
      },
    });

    // Generate slug from title
    const slug = generateSlug(outline.structure.title);

    // Calculate word count and reading time
    const wordCount = countWords(result.fullArticle);
    const readingTime = Math.ceil(wordCount / 200);

    // Extract internal links
    const internalLinks = extractInternalLinks(
      result.fullArticle,
      relatedArticles || []
    );

    // Convert markdown to HTML
    const contentHtml = await convertToHtml(result.fullArticle);

    // Generate excerpt
    const excerpt = generateExcerpt(result.fullArticle, 160);

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 85,
      total: 100,
      message: "Saving article to database...",
      metadata: {
        wordCount,
      },
    });

    // Save article to database
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
      } as Article)
      .select()
      .single();

    if (insertError || !articleData) {
      throw new Error(
        `Failed to save article: ${insertError?.message || "Unknown error"}`
      );
    }

    const savedArticle = articleData as Article;

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 90,
      total: 100,
      message: "Saving internal links...",
    });

    // Save internal links
    if (internalLinks.length > 0) {
      const linkInserts = internalLinks.map((link) => ({
        source_article_id: savedArticle.id,
        target_article_id: link.targetId,
        anchor_text: link.anchorText,
        context: link.context,
      }));

      await supabase.from("article_links").insert(linkInserts as ArticleLink[]);
    }

    // Save initial version
    await supabase.from("article_versions").insert({
      article_id: savedArticle.id,
      content: result.fullArticle,
      edited_by: "ai",
      change_summary: "Initial draft generated by AI writer agent",
    } as ArticleVersion);

    // Update topic status
    await supabase
      .from("topics")
      .update({ status: "used" } as Topic)
      .eq("id", outline.topics.id);

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 100,
      total: 100,
      message: "Article completed successfully!",
    });

    // Mark job as completed
    const output: WriteArticleJobOutput = {
      articleId: savedArticle.id,
      article: savedArticle,
      metadata: {
        wordCount,
        readingTime,
        sectionsWritten: outline.structure.sections.length,
      },
    };

    await JobQueue.completeJob(jobId, output);
  } catch (error) {
    console.error(`Error processing article writing job ${jobId}:`, error);

    await JobQueue.failJob(jobId, {
      message: error instanceof Error ? error.message : "Unknown error",
      code: "ARTICLE_WRITING_FAILED",
      details: error,
    });

    throw error;
  }
}

// Helper functions (extracted from writer route)
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function extractInternalLinks(
  content: string,
  relatedArticles: Array<{ id: string; title: string; slug: string }>
): Array<{ targetId: string; anchorText: string; context: string }> {
  const links: Array<{
    targetId: string;
    anchorText: string;
    context: string;
  }> = [];

  // Simple link extraction - look for article titles in content
  for (const article of relatedArticles) {
    const regex = new RegExp(`\\b${article.title}\\b`, "gi");
    const matches = content.match(regex);

    if (matches && matches.length > 0) {
      // Find the context (sentence containing the match)
      const sentences = content.split(/[.!?]+/);
      const matchingSentence = sentences.find((s) =>
        s.toLowerCase().includes(article.title.toLowerCase())
      );

      links.push({
        targetId: article.id,
        anchorText: matches[0],
        context: matchingSentence?.trim() || "",
      });
    }
  }

  return links;
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

function generateExcerpt(content: string, maxLength: number = 160): string {
  // Remove markdown syntax
  const plainText = content
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Get first paragraph or first N characters
  const firstParagraph = plainText.split("\n\n")[0];

  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }

  return firstParagraph.substring(0, maxLength).trim() + "...";
}


