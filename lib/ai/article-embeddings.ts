import { generateEmbedding } from "./embeddings";
import { createClient } from "@/lib/supabase/server";

/**
 * Generate and store embedding for a published article
 * Creates a combined text representation of title, excerpt, and content for semantic search
 */
export async function generateArticleEmbedding(articleId: string): Promise<void> {
  try {
    const supabase = await createClient();

    // Fetch article
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, excerpt, content, status")
      .eq("id", articleId)
      .single();

    if (fetchError || !article) {
      throw new Error(`Article not found: ${articleId}`);
    }

    // Only generate embeddings for published articles
    if (article.status !== "published") {
      console.log(
        `Skipping embedding generation for article ${articleId} - status is ${article.status}`
      );
      return;
    }

    // Create combined text for embedding
    // Weight: title (most important) + excerpt + first 2000 chars of content
    const textForEmbedding = [
      article.title,
      article.excerpt || "",
      article.content.substring(0, 2000), // Limit content to avoid token limits
    ]
      .filter((text) => text && text.trim().length > 0)
      .join("\n\n");

    if (!textForEmbedding.trim()) {
      throw new Error("No text available for embedding generation");
    }

    // Generate embedding
    const embedding = await generateEmbedding(textForEmbedding);

    // Store embedding in database
    const { error: updateError } = await supabase
      .from("articles")
      .update({ embedding })
      .eq("id", articleId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Generated and stored embedding for article ${articleId}`);
  } catch (error) {
    console.error(`Error generating article embedding for ${articleId}:`, error);
    throw error;
  }
}

/**
 * Find similar published articles using embedding similarity
 * Returns articles sorted by similarity (most similar first)
 */
export async function findSimilarPublishedArticles(
  articleId: string,
  limit: number = 5,
  similarityThreshold: number = 0.75
): Promise<
  Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    similarity: number;
  }>
> {
  try {
    const supabase = await createClient();

    // Get the article's embedding
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("embedding")
      .eq("id", articleId)
      .single();

    if (fetchError || !article || !article.embedding) {
      return []; // No embedding available
    }

    // Use the database function to find similar articles
    const { data, error } = await supabase.rpc("find_similar_published_articles", {
      query_embedding: article.embedding,
      similarity_threshold: similarityThreshold,
      match_count: limit,
      exclude_article_id: articleId,
    });

    if (error) {
      console.error("Error finding similar articles:", error);
      return [];
    }

    return (data || []).map((item: { id: string; title: string; slug: string; excerpt: string | null; similarity: number }) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      similarity: item.similarity,
    }));
  } catch (error) {
    console.error("Error finding similar articles:", error);
    return [];
  }
}

/**
 * Generate embedding for an article's content (for similarity search)
 * This can be called with article content directly without storing
 */
export async function generateEmbeddingForContent(
  title: string,
  excerpt: string | null,
  content: string
): Promise<number[]> {
  const textForEmbedding = [
    title,
    excerpt || "",
    content.substring(0, 2000), // Limit content
  ]
    .filter((text) => text && text.trim().length > 0)
    .join("\n\n");

  return generateEmbedding(textForEmbedding);
}

