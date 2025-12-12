import { openai } from "./openai";

/**
 * Generate embeddings for semantic similarity search using OpenAI's text-embedding-3-small model
 * Dimension: 1536 (optimized for cost and performance)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Clean and normalize text for better embedding quality
    const cleanText = text.trim().replace(/\s+/g, " ");

    if (!cleanText) {
      throw new Error("Cannot generate embedding for empty text");
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate embeddings for multiple texts in a single batch request
 * More efficient than individual requests for bulk operations
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  try {
    if (texts.length === 0) {
      return [];
    }

    // Clean and normalize all texts
    const cleanTexts = texts.map((text) => text.trim().replace(/\s+/g, " "));

    // Filter out empty strings
    const validTexts = cleanTexts.filter((text) => text.length > 0);

    if (validTexts.length === 0) {
      throw new Error("No valid texts to generate embeddings for");
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: validTexts,
      encoding_format: "float",
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings batch:", error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
