import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Article, ArticleVersion } from "@/types";

// Request validation schemas
const CreateArticleSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(300).optional(),
  industryId: z.string().uuid(),
  articleType: z.enum([
    "blog",
    "technical",
    "news",
    "opinion",
    "tutorial",
    "listicle",
    "affiliate",
  ]),
  status: z.enum(["draft", "review", "published"]).default("draft"),
  seoKeywords: z.array(z.string()).optional(),
  outlineId: z.string().uuid().optional(),
});

const UpdateArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(300).optional(),
  status: z.enum(["draft", "review", "published"]).optional(),
  seoKeywords: z.array(z.string()).optional(),
  publishedTo: z.array(z.string()).optional(),
  saveVersion: z.boolean().default(true),
  editedBy: z.enum(["user", "ai"]).default("user"),
  changeSummary: z.string().optional(),
});

const SearchArticlesSchema = z.object({
  query: z.string().optional(),
  industryId: z.string().uuid().optional(),
  articleType: z
    .enum([
      "blog",
      "technical",
      "news",
      "opinion",
      "tutorial",
      "listicle",
      "affiliate",
    ])
    .optional(),
  status: z.enum(["draft", "review", "published"]).optional(),
  sortBy: z
    .enum(["created_at", "updated_at", "title", "word_count"])
    .default("updated_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// GET - List/Search articles
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

    // Check for single article fetch
    const articleId = searchParams.get("id");
    if (articleId) {
      return getSingleArticle(supabase, articleId);
    }

    // Parse search parameters
    const params = {
      query: searchParams.get("query") || undefined,
      industryId: searchParams.get("industryId") || undefined,
      articleType: searchParams.get("articleType") || undefined,
      status: searchParams.get("status") || undefined,
      sortBy: searchParams.get("sortBy") || "updated_at",
      sortOrder: searchParams.get("sortOrder") || "desc",
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const validationResult = SearchArticlesSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      query,
      industryId,
      articleType,
      status,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = validationResult.data;

    // Build query
    let dbQuery = supabase.from("articles").select(
      `
        id,
        title,
        slug,
        excerpt,
        article_type,
        status,
        word_count,
        reading_time,
        seo_keywords,
        published_at,
        published_to,
        created_at,
        updated_at,
        industries (
          id,
          name,
          slug
        )
      `,
      { count: "exact" }
    );

    // Apply filters
    if (query) {
      // Use full-text search
      dbQuery = dbQuery.textSearch("search_vector", query, {
        type: "websearch",
        config: "english",
      });
    }

    if (industryId) {
      dbQuery = dbQuery.eq("industry_id", industryId);
    }

    if (articleType) {
      dbQuery = dbQuery.eq("article_type", articleType);
    }

    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }

    // Apply sorting
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: articles, error, count } = await dbQuery;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      articles,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

// POST - Create new article
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
    const validationResult = CreateArticleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title,
      content,
      excerpt,
      industryId,
      articleType,
      status,
      seoKeywords,
      outlineId,
    } = validationResult.data;

    // Generate slug
    const slug = await generateUniqueSlug(supabase, title);

    // Calculate metrics
    const wordCount = countWords(content);
    const readingTime = Math.ceil(wordCount / 200);

    // Generate excerpt if not provided
    const finalExcerpt = excerpt || generateExcerpt(content, 160);

    // Convert to HTML
    const contentHtml = convertMarkdownToHtml(content);

    // Create article
    const insertData: Omit<Article, "id" | "created_at" | "updated_at"> = {
      title,
      slug,
      content,
      content_html: contentHtml,
      excerpt: finalExcerpt,
      industry_id: industryId,
      article_type: articleType,
      status,
      word_count: wordCount,
      reading_time: readingTime,
      seo_keywords: seoKeywords || [],
      outline_id: outlineId ?? null,
      published_at: status === "published" ? new Date().toISOString() : null,
      published_to: [],
    };

    const { data: article, error: insertError } = await supabase
      .from("articles")
      .insert(insertData)
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
      .single();

    if (insertError) {
      throw insertError;
    }

    // Create initial version
    const versionData: Omit<ArticleVersion, "id" | "created_at"> = {
      article_id: article.id,
      content,
      edited_by: "user",
      change_summary: "Initial creation",
    };
    await supabase.from("article_versions").insert(versionData);

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Error creating article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}

// PUT - Update article
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
    const validationResult = UpdateArticleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      id,
      title,
      content,
      excerpt,
      status,
      seoKeywords,
      publishedTo,
      saveVersion,
      editedBy,
      changeSummary,
    } = validationResult.data;

    // Fetch current article for comparison
    const { data: currentArticle, error: fetchError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updateData.title = title;
      // Update slug if title changed significantly
      if (title !== currentArticle.title) {
        updateData.slug = await generateUniqueSlug(supabase, title, id);
      }
    }

    if (content !== undefined) {
      updateData.content = content;
      updateData.content_html = convertMarkdownToHtml(content);
      updateData.word_count = countWords(content);
      updateData.reading_time = Math.ceil(updateData.word_count / 200);
    }

    if (excerpt !== undefined) {
      updateData.excerpt = excerpt;
    }

    if (status !== undefined) {
      updateData.status = status;
      // Set published_at when first published
      if (status === "published" && currentArticle.status !== "published") {
        updateData.published_at = new Date().toISOString();
      }
    }

    if (seoKeywords !== undefined) {
      updateData.seo_keywords = seoKeywords;
    }

    if (publishedTo !== undefined) {
      updateData.published_to = publishedTo;
    }

    // Update article
    const { data: updatedArticle, error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", id)
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
      .single();

    if (updateError) {
      throw updateError;
    }

    // Save version if content changed
    if (
      saveVersion &&
      content !== undefined &&
      content !== currentArticle.content
    ) {
      const versionData: Omit<ArticleVersion, "id" | "created_at"> = {
        article_id: id,
        content,
        edited_by: editedBy,
        change_summary: changeSummary || `Updated by ${editedBy}`,
      };
      await supabase.from("article_versions").insert(versionData);
    }

    return NextResponse.json({
      success: true,
      article: updatedArticle,
    });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

// DELETE - Delete article
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    // Check if article exists
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("id, title")
      .eq("id", id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Delete article (cascade will handle versions and links)
    const { error: deleteError } = await supabase
      .from("articles")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `Article "${article.title}" deleted`,
    });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}

// Helper: Get single article with full details
async function getSingleArticle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
) {
  const { data: article, error } = await supabase
    .from("articles")
    .select(
      `
      *,
      industries (
        id,
        name,
        slug
      ),
      outlines (
        id,
        structure,
        article_type,
        target_length
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Fetch version history
  const { data: versions } = await supabase
    .from("article_versions")
    .select("id, edited_by, change_summary, created_at")
    .eq("article_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch internal links
  const { data: outgoingLinks } = await supabase
    .from("article_links")
    .select(
      `
      anchor_text,
      target_article:target_article_id (
        id,
        title,
        slug
      )
    `
    )
    .eq("source_article_id", id);

  const { data: incomingLinks } = await supabase
    .from("article_links")
    .select(
      `
      anchor_text,
      source_article:source_article_id (
        id,
        title,
        slug
      )
    `
    )
    .eq("target_article_id", id);

  return NextResponse.json({
    article,
    versions,
    links: {
      outgoing: outgoingLinks,
      incoming: incomingLinks,
    },
  });
}

// Helper: Generate unique slug
async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabase.from("articles").select("id").eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query.single();

    if (!data) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// Helper: Count words
function countWords(text: string): number {
  return text
    .replace(/[#*_\[\]()]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// Helper: Generate excerpt
function generateExcerpt(content: string, maxLength: number): string {
  const plainText = content
    .replace(/[#*_\[\]()]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return truncated.substring(0, lastSpace) + "...";
}

// Helper: Convert markdown to HTML
function convertMarkdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>'
    )
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}