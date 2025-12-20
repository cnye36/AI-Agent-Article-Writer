import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  generateIntelligentLinks,
  insertLinksIntoContent,
  type LinkOpportunity,
} from "@/lib/ai/intelligent-linking";

// Request validation schemas
const GenerateSuggestionsSchema = z.object({
  content: z.string().min(100),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  siteId: z.string().uuid(),
  industryId: z.string().uuid(),
  options: z
    .object({
      minLinks: z.number().min(1).max(10).optional(),
      maxLinks: z.number().min(1).max(10).optional(),
      threshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const ApplyLinksSchema = z.object({
  articleId: z.string().uuid(),
  selectedLinkIds: z.array(z.string().uuid()),
});

/**
 * POST - Generate link suggestions for article content
 */
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
    const validation = GenerateSuggestionsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { content, title, excerpt, siteId, industryId, options } =
      validation.data;

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from("publishing_sites")
      .select("id, user_id")
      .eq("id", siteId)
      .single();

    if (siteError || !site || site.user_id !== user.id) {
      return NextResponse.json(
        { error: "Publishing site not found or access denied" },
        { status: 404 }
      );
    }

    // Generate intelligent link suggestions
    const result = await generateIntelligentLinks(
      content,
      title,
      excerpt || "",
      siteId,
      industryId,
      options
    );

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Error generating link suggestions:", error);
    return NextResponse.json(
      {
        error: "Failed to generate link suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Apply selected links to article
 */
export async function PUT(request: NextRequest) {
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
    const validation = ApplyLinksSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { articleId, selectedLinkIds } = validation.data;

    // Fetch article and verify ownership
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, user_id, content, metadata")
      .eq("id", articleId)
      .single();

    if (articleError || !article || article.user_id !== user.id) {
      return NextResponse.json(
        { error: "Article not found or access denied" },
        { status: 404 }
      );
    }

    // Get link suggestions from article metadata
    const linkSuggestions = (article.metadata as { linkSuggestions?: LinkOpportunity[] })?.linkSuggestions || [];

    if (linkSuggestions.length === 0) {
      return NextResponse.json(
        { error: "No link suggestions found in article metadata" },
        { status: 400 }
      );
    }

    // Filter to selected links
    const selectedSuggestions = linkSuggestions.filter((s: LinkOpportunity) =>
      selectedLinkIds.includes(s.id)
    );

    if (selectedSuggestions.length === 0) {
      return NextResponse.json(
        { error: "No matching suggestions found for selected IDs" },
        { status: 400 }
      );
    }

    // Insert links into content
    const { modifiedContent, insertedLinks } = insertLinksIntoContent(
      article.content,
      selectedSuggestions
    );

    // Update article content
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        content: modifiedContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (updateError) {
      throw updateError;
    }

    // Save links to article_links table
    const linksToSave = insertedLinks.map((link) => ({
      source_article_id: articleId,
      target_article_id: link.targetArticleId,
      anchor_text: link.anchorText,
      context: link.context,
    }));

    if (linksToSave.length > 0) {
      const { error: linksError } = await supabase
        .from("article_links")
        .upsert(linksToSave, {
          onConflict: "source_article_id,target_article_id,anchor_text",
        });

      if (linksError) {
        console.error("Error saving links to database:", linksError);
        // Don't fail the request - content was already updated
      }
    }

    // Clear link suggestions from metadata
    const { error: metadataError } = await supabase
      .from("articles")
      .update({
        metadata: {
          ...((article.metadata as object) || {}),
          linkSuggestions: undefined,
          targetSiteId: undefined,
        },
      })
      .eq("id", articleId);

    if (metadataError) {
      console.error("Error clearing metadata:", metadataError);
      // Non-critical error
    }

    // Fetch updated article
    const { data: updatedArticle } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    return NextResponse.json({
      success: true,
      article: updatedArticle,
      linksCreated: insertedLinks.length,
    });
  } catch (error) {
    console.error("Error applying links:", error);
    return NextResponse.json(
      {
        error: "Failed to apply links",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
