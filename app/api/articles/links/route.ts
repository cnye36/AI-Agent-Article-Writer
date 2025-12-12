import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/ai/openai";
import { z } from "zod";

// Request validation schemas
const CreateLinkSchema = z.object({
  sourceArticleId: z.string().uuid(),
  targetArticleId: z.string().uuid(),
  anchorText: z.string().min(1).max(200),
  context: z.string().max(500).optional(),
});

const SuggestLinksSchema = z.object({
  articleId: z.string().uuid(),
  content: z.string().optional(), // If not provided, fetch from DB
  maxSuggestions: z.number().min(1).max(20).default(10),
});

// GET - Fetch links for an article
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
    const articleId = searchParams.get("articleId");
    const direction = searchParams.get("direction") || "both"; // outgoing, incoming, both

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    let outgoingLinks: any[] = [];
    let incomingLinks: any[] = [];

    if (direction === "outgoing" || direction === "both") {
      const { data, error } = await supabase
        .from("article_links")
        .select(
          `
          id,
          anchor_text,
          context,
          created_at,
          target_article:target_article_id (
            id,
            title,
            slug,
            excerpt,
            status
          )
        `
        )
        .eq("source_article_id", articleId);

      if (!error) {
        outgoingLinks = data || [];
      }
    }

    if (direction === "incoming" || direction === "both") {
      const { data, error } = await supabase
        .from("article_links")
        .select(
          `
          id,
          anchor_text,
          context,
          created_at,
          source_article:source_article_id (
            id,
            title,
            slug,
            excerpt,
            status
          )
        `
        )
        .eq("target_article_id", articleId);

      if (!error) {
        incomingLinks = data || [];
      }
    }

    return NextResponse.json({
      articleId,
      outgoingLinks,
      incomingLinks,
      stats: {
        outgoingCount: outgoingLinks.length,
        incomingCount: incomingLinks.length,
        totalLinks: outgoingLinks.length + incomingLinks.length,
      },
    });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

// POST - Create a new link or get AI suggestions
export async function POST(request: NextRequest) {
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

    // Check if this is a suggestion request
    if (body.action === "suggest") {
      return handleSuggestLinks(supabase, body);
    }

    // Otherwise, create a new link
    const validationResult = CreateLinkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { sourceArticleId, targetArticleId, anchorText, context } =
      validationResult.data;

    // Prevent self-linking
    if (sourceArticleId === targetArticleId) {
      return NextResponse.json(
        { error: "Cannot link article to itself" },
        { status: 400 }
      );
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from("article_links")
      .select("id")
      .eq("source_article_id", sourceArticleId)
      .eq("target_article_id", targetArticleId)
      .eq("anchor_text", anchorText)
      .single();

    if (existingLink) {
      return NextResponse.json(
        { error: "Link already exists" },
        { status: 409 }
      );
    }

    // Create the link
    const { data: newLink, error: insertError } = await supabase
      .from("article_links")
      .insert({
        source_article_id: sourceArticleId,
        target_article_id: targetArticleId,
        anchor_text: anchorText,
        context,
      } as any)
      .select(
        `
        id,
        anchor_text,
        context,
        created_at,
        target_article:target_article_id (
          id,
          title,
          slug
        )
      `
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      link: newLink,
    });
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}

// PUT - AI-powered link suggestion for content
export async function PUT(request: NextRequest) {
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
    const validationResult = SuggestLinksSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { articleId, content: providedContent, maxSuggestions } =
      validationResult.data;

    // Get article content if not provided
    let content = providedContent;
    let industryId: string | null = null;

    if (!content) {
      const { data: article, error } = await supabase
        .from("articles")
        .select("content, industry_id")
        .eq("id", articleId)
        .single();

      if (error || !article) {
        return NextResponse.json(
          { error: "Article not found" },
          { status: 404 }
        );
      }

      const articleData = article as any;
      content = articleData.content;
      industryId = articleData.industry_id;
    }

    // Fetch potential target articles
    let targetQuery = supabase
      .from("articles")
      .select("id, title, slug, excerpt, seo_keywords")
      .neq("id", articleId)
      .eq("status", "published")
      .limit(50);

    if (industryId) {
      targetQuery = targetQuery.eq("industry_id", industryId);
    }

    const { data: potentialTargets, error: targetsError } = await targetQuery;

    if (targetsError || !potentialTargets || potentialTargets.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: "No potential target articles found",
      });
    }

    // Use AI to suggest links
    if (!content) {
      return NextResponse.json(
        { error: "Article content is required" },
        { status: 400 }
      );
    }

    const suggestions = await generateLinkSuggestions(
      content,
      potentialTargets,
      maxSuggestions
    );

    return NextResponse.json({
      articleId,
      suggestions,
      potentialTargetsCount: potentialTargets.length,
    });
  } catch (error) {
    console.error("Error generating link suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate link suggestions" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a link
export async function DELETE(request: NextRequest) {
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
    const linkId = searchParams.get("id");

    if (!linkId) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("article_links")
      .delete()
      .eq("id", linkId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Link deleted",
    });
  } catch (error) {
    console.error("Error deleting link:", error);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}

// Helper: Handle inline suggestion request
async function handleSuggestLinks(supabase: any, body: any) {
  const { articleId, selectedText } = body;

  if (!articleId || !selectedText) {
    return NextResponse.json(
      { error: "Article ID and selected text are required" },
      { status: 400 }
    );
  }

  // Get article's industry
  const { data: article } = await supabase
    .from("articles")
    .select("industry_id")
    .eq("id", articleId)
    .single();

  // Find relevant articles to link to
  const { data: candidates } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, seo_keywords")
    .neq("id", articleId)
    .eq("status", "published")
    .eq("industry_id", article?.industry_id)
    .limit(20);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Use AI to find best matches for the selected text
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5.1",
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are a content editor helping to create internal links. Given a piece of selected text and a list of articles, suggest which article would be the best link target.

Return a JSON array of suggestions with this format:
[
  {
    "articleId": "uuid",
    "relevanceScore": 0.0-1.0,
    "reason": "brief explanation"
  }
]

Only include articles that are genuinely relevant. If none are relevant, return an empty array.`,
      },
      {
        role: "user",
        content: `Selected text to link: "${selectedText}"

Available articles to link to:
${candidates
  .map(
    (a: any) =>
      `- ID: ${a.id}, Title: "${a.title}", Excerpt: "${a.excerpt?.substring(0, 100)}..."`
  )
  .join("\n")}

Suggest the most relevant articles to link to (max 3).`,
      },
    ],
  });

  try {
    const responseText = response.choices[0]?.message?.content || "";
    const suggestions = JSON.parse(
      responseText.replace(/```json\n?|\n?```/g, "")
    );

    // Enrich suggestions with article data
    const enrichedSuggestions = suggestions
      .map((s: any) => {
        const article = candidates.find((c: any) => c.id === s.articleId);
        if (!article) return null;
        return {
          ...s,
          article: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      selectedText,
      suggestions: enrichedSuggestions,
    });
  } catch (parseError) {
    console.error("Error parsing AI suggestions:", parseError);
    return NextResponse.json({ suggestions: [] });
  }
}

// Helper: Generate link suggestions using AI
async function generateLinkSuggestions(
  content: string,
  potentialTargets: any[],
  maxSuggestions: number
): Promise<any[]> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5.1",
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `You are a content editor specializing in internal linking strategy. Analyze the given article content and suggest opportunities to link to other articles.

For each suggestion, identify:
1. A phrase in the content that could be linked (the anchor text)
2. Which article it should link to
3. Why this link would be valuable for readers

Return a JSON array:
[
  {
    "anchorText": "exact phrase from content",
    "targetArticleId": "uuid",
    "reason": "why this link adds value",
    "relevanceScore": 0.0-1.0
  }
]

Guidelines:
- Only suggest natural anchor text that appears in the content
- Prioritize links that add value for readers
- Avoid over-linking (max ${maxSuggestions} suggestions)
- Prefer linking informational phrases, not every keyword`,
      },
      {
        role: "user",
        content: `Article content:
${content.substring(0, 4000)}

Available articles to link to:
${potentialTargets
  .map(
    (a) =>
      `- ID: ${a.id}, Title: "${a.title}", Keywords: ${a.seo_keywords?.join(", ") || "none"}, Excerpt: "${a.excerpt?.substring(0, 80)}..."`
  )
  .join("\n")}

Suggest valuable internal links.`,
      },
    ],
  });

  try {
    const responseText = response.choices[0]?.message?.content || "";
    const suggestions = JSON.parse(
      responseText.replace(/```json\n?|\n?```/g, "")
    );

    // Validate and enrich suggestions
    return suggestions
      .filter((s: any) => {
        // Verify anchor text exists in content
        return content.toLowerCase().includes(s.anchorText.toLowerCase());
      })
      .map((s: any) => {
        const target = potentialTargets.find(
          (t) => t.id === s.targetArticleId
        );
        return {
          ...s,
          targetArticle: target
            ? {
                id: target.id,
                title: target.title,
                slug: target.slug,
              }
            : null,
        };
      })
      .filter((s: any) => s.targetArticle !== null)
      .slice(0, maxSuggestions);
  } catch (parseError) {
    console.error("Error parsing link suggestions:", parseError);
    return [];
  }
}