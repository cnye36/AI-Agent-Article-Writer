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

