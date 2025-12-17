import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findSimilarPublishedArticles } from "@/lib/ai/article-embeddings";

// GET - Find similar published articles
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
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const threshold = parseFloat(searchParams.get("threshold") || "0.75");

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    // Verify article exists and user has access
    const { data: article } = await supabase
      .from("articles")
      .select("id")
      .eq("id", articleId)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Find similar articles
    const similarArticles = await findSimilarPublishedArticles(
      articleId,
      limit,
      threshold
    );

    return NextResponse.json({
      success: true,
      articles: similarArticles,
      count: similarArticles.length,
    });
  } catch (error) {
    console.error("Error finding similar articles:", error);
    return NextResponse.json(
      { error: "Failed to find similar articles" },
      { status: 500 }
    );
  }
}

