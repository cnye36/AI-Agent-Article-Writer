import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Request validation schemas
const CreatePublicationSchema = z.object({
  articleId: z.string().uuid(),
  siteId: z.string().uuid(),
  slug: z.string().max(200).optional(),
});

const UpdatePublicationSchema = z.object({
  publicationId: z.string().uuid(),
  slug: z.string().min(1).max(200).optional(),
});

// GET - Get publications for an article
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

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    // Verify article ownership
    const { data: article } = await supabase
      .from("articles")
      .select("id")
      .eq("id", articleId)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Get publications with site details
    const { data: publications, error } = await supabase
      .from("article_publications")
      .select(
        `
        *,
        site:publishing_sites (
          id,
          name,
          base_path
        )
      `
      )
      .eq("article_id", articleId)
      .order("published_at", { ascending: false });

    // Compute canonical_url for each publication
    const publicationsWithUrl = (publications || []).map((pub: any) => ({
      ...pub,
      canonical_url: pub.site
        ? `${pub.site.base_path}/${pub.slug}`
        : null,
    }));

    if (error) {
      throw error;
    }

    return NextResponse.json({ publications: publicationsWithUrl });
  } catch (error) {
    console.error("Error fetching article publications:", error);
    return NextResponse.json(
      { error: "Failed to fetch publications" },
      { status: 500 }
    );
  }
}

// POST - Create a publication (mark article as published to a site)
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
    const validationResult = CreatePublicationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { articleId, siteId, slug: providedSlug } = validationResult.data;

    // Verify article ownership and get article slug
    const { data: article } = await supabase
      .from("articles")
      .select("id, slug")
      .eq("id", articleId)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Use provided slug or fall back to article slug
    const slug = providedSlug?.trim() || article.slug;

    if (!slug || slug.length === 0) {
      return NextResponse.json(
        { error: "Slug is required (either provided or from article)" },
        { status: 400 }
      );
    }

    // Verify site ownership
    const { data: site } = await supabase
      .from("publishing_sites")
      .select("id, base_path")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json(
        { error: "Site not found or access denied" },
        { status: 404 }
      );
    }

    // Check if publication already exists
    const { data: existing } = await supabase
      .from("article_publications")
      .select("id")
      .eq("article_id", articleId)
      .eq("site_id", siteId)
      .single();

    if (existing) {
      // Update existing publication
      const { data: publication, error: updateError } = await supabase
        .from("article_publications")
        .update({
          slug: slug.trim(),
          published_at: new Date().toISOString(),
        } as any)
        .eq("id", existing.id)
        .select(
          `
          *,
          site:publishing_sites (
            id,
            name,
            base_path
          )
        `
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      // Compute canonical_url
      const publicationWithUrl = {
        ...publication,
        canonical_url: publication.site
          ? `${publication.site.base_path}/${publication.slug}`
          : null,
      };

      return NextResponse.json({ success: true, publication: publicationWithUrl });
    }

    // Create new publication
    const { data: publication, error: insertError } = await supabase
      .from("article_publications")
      .insert({
        article_id: articleId,
        site_id: siteId,
        slug: slug.trim(),
        published_at: new Date().toISOString(),
      } as any)
      .select(
        `
        *,
        site:publishing_sites (
          id,
          name,
          base_path
        )
      `
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    // Compute canonical_url
    const publicationWithUrl = {
      ...publication,
      canonical_url: publication.site
        ? `${publication.site.base_path}/${publication.slug}`
        : null,
    };

    // Update article published_at if not set
    const { data: articleData } = await supabase
      .from("articles")
      .select("published_at")
      .eq("id", articleId)
      .single();

    if (!articleData?.published_at) {
      await supabase
        .from("articles")
        .update({ published_at: new Date().toISOString() } as any)
        .eq("id", articleId);
    }

    return NextResponse.json({ success: true, publication: publicationWithUrl });
  } catch (error) {
    console.error("Error creating publication:", error);
    return NextResponse.json(
      { error: "Failed to create publication" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a publication (unpublish from a site)
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
    const publicationId = searchParams.get("id");

    if (!publicationId) {
      return NextResponse.json(
        { error: "Publication ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership via site
    const { data: publication } = await supabase
      .from("article_publications")
      .select(
        `
        id,
        site:publishing_sites!inner (
          user_id
        )
      `
      )
      .eq("id", publicationId)
      .single();

    if (!publication || (publication.site as any)?.user_id !== user.id) {
      return NextResponse.json(
        { error: "Publication not found or access denied" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("article_publications")
      .delete()
      .eq("id", publicationId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Publication removed",
    });
  } catch (error) {
    console.error("Error deleting publication:", error);
    return NextResponse.json(
      { error: "Failed to delete publication" },
      { status: 500 }
    );
  }
}

