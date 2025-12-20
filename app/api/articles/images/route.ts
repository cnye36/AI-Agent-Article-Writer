import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const { articleId, imageId, isCover } = await req.json();

    if (!articleId || !imageId) {
      return NextResponse.json(
        { error: "articleId and imageId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // If setting as cover, unset all other cover images for this article
    if (isCover) {
      // First, unset all cover images for this article
      await supabase
        .from("article_images")
        .update({ is_cover: false })
        .eq("article_id", articleId);

      // Then set this image as cover
      const { data, error } = await supabase
        .from("article_images")
        .update({ is_cover: true })
        .eq("id", imageId)
        .eq("article_id", articleId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to update cover image" },
          { status: 500 }
        );
      }

      // Also update the article's cover_image field
      const image = data;
      await supabase
        .from("articles")
        .update({ cover_image: image.url })
        .eq("id", articleId);

      return NextResponse.json({ success: true, image: data });
    } else {
      // Unset cover
      const { data, error } = await supabase
        .from("article_images")
        .update({ is_cover: false })
        .eq("id", imageId)
        .eq("article_id", articleId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to update image" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, image: data });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("id");
    const articleId = searchParams.get("articleId");

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    // Verify the image belongs to an article owned by the user
    if (articleId) {
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, user_id")
        .eq("id", articleId)
        .eq("user_id", user.id)
        .single();

      if (articleError || !article) {
        return NextResponse.json(
          { error: "Article not found or unauthorized" },
          { status: 404 }
        );
      }

      // Verify the image belongs to this article
      const { data: image, error: imageError } = await supabase
        .from("article_images")
        .select("id, article_id")
        .eq("id", imageId)
        .eq("article_id", articleId)
        .single();

      if (imageError || !image) {
        return NextResponse.json(
          { error: "Image not found or doesn't belong to this article" },
          { status: 404 }
        );
      }

      // If this is a cover image, unset it from the article
      const { data: imageData } = await supabase
        .from("article_images")
        .select("is_cover")
        .eq("id", imageId)
        .single();

      if (imageData?.is_cover) {
        await supabase
          .from("articles")
          .update({ cover_image: null })
          .eq("id", articleId);
      }
    }

    // Delete the image
    const { error: deleteError } = await supabase
      .from("article_images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

