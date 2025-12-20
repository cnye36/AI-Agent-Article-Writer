import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

    // Fetch article statistics
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, status, word_count, published_at, updated_at")
      .eq("user_id", user.id);

    if (articlesError) throw articlesError;

    // Fetch topic statistics
    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, status, relevance_score, discovered_at")
      .eq("user_id", user.id);

    if (topicsError) throw topicsError;


    // Fetch recent publications
    const { data: publications, error: publicationsError } = await supabase
      .from("article_publications")
      .select(
        `
        id,
        published_at,
        article:articles!inner(id, title, user_id),
        site:publishing_sites!inner(id, name)
      `
      )
      .eq("article.user_id", user.id)
      .order("published_at", { ascending: false })
      .limit(5);

    if (publicationsError) throw publicationsError;

    // Calculate article statistics
    const articleStats = {
      total: articles?.length || 0,
      draft: articles?.filter((a) => a.status === "draft").length || 0,
      review: articles?.filter((a) => a.status === "review").length || 0,
      published: articles?.filter((a) => a.status === "published").length || 0,
      totalWords:
        articles?.reduce((sum, a) => sum + (a.word_count || 0), 0) || 0,
    };

    // Calculate topic statistics
    const topicStats = {
      total: topics?.length || 0,
      pending: topics?.filter((t) => t.status === "pending").length || 0,
      approved: topics?.filter((t) => t.status === "approved").length || 0,
      used: topics?.filter((t) => t.status === "used").length || 0,
      rejected: topics?.filter((t) => t.status === "rejected").length || 0,
    };


    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentArticles = articles
      ?.filter((a) => new Date(a.updated_at) >= sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      .slice(0, 10);

    const recentTopics = topics
      ?.filter((t) => new Date(t.discovered_at) >= sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
      )
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        articles: articleStats,
        topics: topicStats,
        publications: publications || [],
        recentArticles:
          recentArticles?.map((a) => ({
            id: a.id,
            status: a.status,
            updatedAt: a.updated_at,
          })) || [],
        recentTopics:
          recentTopics?.map((t) => ({
            id: t.id,
            status: t.status,
            createdAt: t.discovered_at,
          })) || [],
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
