import { createClient } from "@/lib/supabase/server";
import { createEditorAgent } from "@/agents/editor-agent";
import { JobQueue } from "@/lib/job-queue";
import type {
  EditArticleJobInput,
  EditArticleJobOutput,
  Article,
  ArticleVersion,
} from "@/types";

/**
 * Background worker to process article editing jobs
 */
export async function processArticleEditingJob(jobId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Get the job
    const job = await JobQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Mark job as running
    await JobQueue.updateJobStatus(jobId, "running");

    const input = job.input as EditArticleJobInput;
    const { articleId, content } = input;

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 0,
      total: 100,
      message: "Fetching article...",
    });

    // Fetch article if content not provided
    let articleContent = content;
    let article: Article | null = null;

    if (!articleContent) {
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .eq("user_id", job.user_id)
        .single();

      if (articleError || !articleData) {
        throw new Error("Article not found");
      }

      article = articleData as Article;
      articleContent = article.content;
    } else {
      // Fetch article metadata (verify it belongs to the job's user)
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .eq("user_id", job.user_id)
        .single();

      if (articleError || !articleData) {
        throw new Error("Article not found");
      }

      article = articleData as Article;
    }

    if (!articleContent) {
      throw new Error("Article content is required");
    }

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 20,
      total: 100,
      message: "Initializing editor agent...",
    });

    // Initialize editor agent
    const editorAgent = createEditorAgent();

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 30,
      total: 100,
      message: "Reviewing content for AI patterns...",
    });

    // Run editor agent
    const result = await editorAgent.invoke({
      articleContent,
      articleType: article.article_type,
      tone: (article.metadata as { tone?: string } | undefined)?.tone,
      editedContent: "",
    });

    const editedContent = result.editedContent || articleContent;

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 70,
      total: 100,
      message: "Processing edited content...",
    });

    // Calculate word count and reading time
    const wordCount = countWords(editedContent);
    const readingTime = Math.ceil(wordCount / 200);

    // Convert markdown to HTML
    const contentHtml = await convertToHtml(editedContent);

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 85,
      total: 100,
      message: "Saving edited article...",
    });

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
      throw new Error(
        `Failed to update article: ${updateError?.message || "Unknown error"}`
      );
    }

    const savedArticle = updatedArticle as Article;

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 90,
      total: 100,
      message: "Saving version history...",
    });

    // Save version
    await supabase.from("article_versions").insert({
      article_id: articleId,
      content: editedContent,
      edited_by: "ai",
      change_summary: "Content refined by AI editor agent (removed AI patterns, fixed em dashes, improved flow)",
    } as ArticleVersion);

    // Update progress
    await JobQueue.updateJobProgress(jobId, {
      current: 100,
      total: 100,
      message: "Article editing completed successfully!",
    });

    // Mark job as completed
    const output: EditArticleJobOutput = {
      articleId: savedArticle.id,
      article: savedArticle,
      metadata: {
        wordCount,
        changesMade: [
          "Removed AI-sounding patterns",
          "Fixed em dashes",
          "Eliminated duplicates",
          "Improved flow and readability",
        ],
      },
    };

    await JobQueue.completeJob(jobId, output);
  } catch (error) {
    console.error(`Error processing article editing job ${jobId}:`, error);

    await JobQueue.failJob(jobId, {
      message: error instanceof Error ? error.message : "Unknown error",
      code: "ARTICLE_EDITING_FAILED",
      details: error,
    });

    throw error;
  }
}

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

