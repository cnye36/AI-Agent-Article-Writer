import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Request validation schema
const CalendarQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  siteIds: z.array(z.string().uuid()).optional(),
});

// GET - Fetch publications for calendar view by date range
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
    // Support both 'start'/'end' and 'startDate'/'endDate' for backward compatibility
    const startDateParam =
      searchParams.get("startDate") || searchParams.get("start");
    const endDateParam = searchParams.get("endDate") || searchParams.get("end");
    const siteIdsParam = searchParams.get("siteIds");
    const siteIds = siteIdsParam ? siteIdsParam.split(",") : undefined;

    // Default to last 30 days to next 30 days if no dates provided
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 30);

    // Use provided dates or defaults
    const startDate = startDateParam || defaultStartDate.toISOString();
    const endDate = endDateParam || defaultEndDate.toISOString();

    // Validate provided dates if they exist, or validate defaults
    if (
      startDateParam &&
      !z.string().datetime().safeParse(startDateParam).success
    ) {
      return NextResponse.json(
        { error: "Invalid startDate parameter" },
        { status: 400 }
      );
    }
    if (
      endDateParam &&
      !z.string().datetime().safeParse(endDateParam).success
    ) {
      return NextResponse.json(
        { error: "Invalid endDate parameter" },
        { status: 400 }
      );
    }

    const validStartDate = startDate;
    const validEndDate = endDate;
    const validSiteIds = siteIds;

    // Fetch publications from article_publications table (articles published to specific sites)
    let publicationsQuery = supabase
      .from("article_publications")
      .select(
        `
        *,
        site:publishing_sites!inner (
          id,
          name,
          base_path,
          user_id
        ),
        article:articles (
          id,
          title,
          slug,
          excerpt,
          article_type,
          cover_image
        )
      `
      )
      .eq("site.user_id", user.id)
      .gte("published_at", validStartDate)
      .lte("published_at", validEndDate)
      .order("published_at", { ascending: true });

    // Apply site filter if provided
    if (validSiteIds && validSiteIds.length > 0) {
      publicationsQuery = publicationsQuery.in("site_id", validSiteIds);
    }

    const { data: publications, error: pubError } = await publicationsQuery;

    if (pubError) {
      throw pubError;
    }

    // Fetch published articles that aren't in article_publications (published without a site)
    // Only fetch if no site filter is applied (since these articles have no site)
    let standAloneArticles: any[] = [];
    if (!validSiteIds || validSiteIds.length === 0) {
      const { data: articles, error: articlesError } = await supabase
        .from("articles")
        .select(
          "id, title, slug, excerpt, article_type, cover_image, published_at"
        )
        .eq("user_id", user.id)
        .eq("status", "published")
        .gte("published_at", validStartDate)
        .lte("published_at", validEndDate)
        .order("published_at", { ascending: true });

      if (articlesError) {
        throw articlesError;
      }

      // Filter out articles that already have publications
      const publishedArticleIds = new Set(
        (publications || []).map((p: any) => p.article_id)
      );
      standAloneArticles = (articles || [])
        .filter((a) => a.published_at && !publishedArticleIds.has(a.id))
        .map((a) => ({
          id: `standalone-${a.id}`,
          article_id: a.id,
          site_id: null,
          slug: a.slug,
          published_at: a.published_at,
          created_at: a.published_at,
          site: {
            id: "no-site",
            name: "Not published to site",
            base_path: "",
            user_id: user.id,
          },
          article: {
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            article_type: a.article_type,
            cover_image: a.cover_image,
          },
          canonical_url: null,
        }));
    }

    // Compute canonical_url for publications with sites
    const publicationsWithUrl = (publications || []).map((pub: any) => ({
      ...pub,
      canonical_url: pub.site?.base_path
        ? `${pub.site.base_path}/${pub.slug}`
        : null,
    }));

    // Combine both sources
    const allPublications = [...publicationsWithUrl, ...standAloneArticles];

    return NextResponse.json({
      publications: allPublications,
      meta: {
        totalCount: allPublications.length,
        dateRange: {
          startDate: validStartDate,
          endDate: validEndDate,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching calendar publications:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch calendar publications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
