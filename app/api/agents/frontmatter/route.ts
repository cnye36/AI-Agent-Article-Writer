import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/ai/openai";
import { z } from "zod";
import type { FrontmatterData } from "@/lib/frontmatter";

// Request validation schema
const FrontmatterRequestSchema = z.object({
  articleId: z.string().uuid(),
});

const frontmatterAgentPrompt = `You are an expert SEO and content strategist specializing in creating high-quality frontmatter for blog articles.

Your task is to analyze an article and generate optimized frontmatter that includes:

1. **Description** (150-160 characters):
   - Create a compelling, SEO-optimized meta description
   - DO NOT simply repeat the title or copy the first sentence
   - Summarize the key value proposition and main takeaway
   - Make it enticing for search engines and readers
   - Include relevant keywords naturally
   - End with a hook or call to action when appropriate

2. **Categories** (2-4 specific categories):
   - Analyze the article content to identify specific topic categories
   - Go beyond generic categories like "Blog" or "Technical"
   - Use specific, relevant categories based on the actual content
   - Examples: "Machine Learning", "Web Development", "Business Strategy", "Productivity Tools", "Cloud Computing", "Data Science", "Startup Advice", etc.
   - Consider the industry, main topics discussed, and target audience
   - Categories should be hierarchical when appropriate (e.g., "Technology > AI", "Business > Marketing")

3. **Tags** (5-10 relevant tags):
   - Extract specific keywords and topics from the content
   - Include technologies, tools, concepts, or trends mentioned
   - Use both broad and specific tags
   - Consider what readers might search for
   - Include the article type as a tag if relevant
   - Tags should complement categories (more granular)

Article Context:
- Title: {title}
- Article Type: {articleType}
- Industry: {industry}
- SEO Keywords: {seoKeywords}
- Content: {content}

Return a JSON object with this exact structure:
{
  "description": "Compelling SEO description (150-160 chars)",
  "categories": ["Category1", "Category2", "Category3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

IMPORTANT:
- Description must be 150-160 characters
- Categories should be specific to the content, not generic
- Tags should be relevant and searchable
- All values should be optimized for SEO and discoverability`;

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
    const validationResult = FrontmatterRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { articleId } = validationResult.data;

    // Fetch the article (verify it belongs to the user)
    const { data: articleData, error: articleError } = await supabase
      .from("articles")
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
      .eq("id", articleId)
      .eq("user_id", user.id)
      .single();

    if (articleError || !articleData) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const article = articleData as any;

    // Prepare content for analysis (limit to first 5000 chars to avoid token limits)
    const contentPreview = article.content
      ? article.content.substring(0, 5000)
      : "";
    
    // Extract plain text from markdown for better analysis
    const plainTextContent = contentPreview
      .replace(/[#*_\[\]()]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    // Build the prompt
    const prompt = frontmatterAgentPrompt
      .replace("{title}", article.title || "Untitled")
      .replace("{articleType}", article.article_type || "blog")
      .replace(
        "{industry}",
        article.industries?.name || "General"
      )
      .replace(
        "{seoKeywords}",
        article.seo_keywords?.join(", ") || "None"
      )
      .replace("{content}", plainTextContent || "No content available");

    // Call OpenAI to generate frontmatter
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      temperature: 0.3, // Lower temperature for more consistent output
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Please analyze this article and generate optimized frontmatter. Return only valid JSON.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let frontmatterResult: {
      description: string;
      categories: string[];
      tags: string[];
    };

    try {
      frontmatterResult = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing frontmatter JSON:", parseError);
      // Fallback: try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        frontmatterResult = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse frontmatter response");
      }
    }

    // Validate and clean the response
    const description = frontmatterResult.description?.trim() || "";
    const categories = Array.isArray(frontmatterResult.categories)
      ? frontmatterResult.categories.filter((c) => c && c.trim())
      : [];
    const tags = Array.isArray(frontmatterResult.tags)
      ? frontmatterResult.tags.filter((t) => t && t.trim())
      : [];

    // Ensure description is within limits
    const finalDescription =
      description.length > 160
        ? description.substring(0, 157) + "..."
        : description.length < 120
        ? description // Allow shorter descriptions if they're good
        : description;

    // Ensure we have at least some categories and tags
    const finalCategories =
      categories.length > 0 ? categories : [article.industries?.name || "General"];
    const finalTags =
      tags.length > 0
        ? tags
        : article.seo_keywords?.slice(0, 5).map((k: string) =>
            k
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
          ) || [];

    // Build the frontmatter data
    const frontmatterData: Partial<FrontmatterData> = {
      description: finalDescription,
      categories: finalCategories,
      tags: finalTags,
    };

    return NextResponse.json({
      success: true,
      frontmatter: frontmatterData,
    });
  } catch (error) {
    console.error("Frontmatter agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate frontmatter",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

