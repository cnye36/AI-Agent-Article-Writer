import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/image-generation";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      sectionContent,
      context,
      articleId,
      isCover,
      articleTitle,
      model = "gpt-image-1-mini",
      quality = "high",
    } = await req.json();

    console.log(
      "Image generation API called with model:",
      model,
      "quality:",
      quality
    );

    let imagePrompt = prompt;

    // If section content is provided without an explicit image prompt, generate one
    if (sectionContent && !imagePrompt) {
      const { text } = await generateText({
        model: openai("gpt-4o") as any, // Cast to any to bypass temporary type mismatch between ai and @ai-sdk/openai
        prompt: isCover
          ? // COVER IMAGE PROMPT - Marketing focused with text overlay
            `You are an expert at creating compelling marketing image prompts for AI art generation.

Create a detailed prompt for a COVER IMAGE that will make people want to click and read the article.

Article Title: "${articleTitle || "Article"}"
Article Content/Hook: "${sectionContent}"
Additional Context: ${context || "None"}

REQUIREMENTS FOR COVER IMAGE:
1. **Text Overlay**: Include eye-catching text that complements the title
   - Use a compelling hook, question, or benefit statement (NOT just the title)
   - Examples: "Discover the Secret to...", "The Ultimate Guide to...", "Why [Topic] Matters Now"
   - Text should be large, bold, and readable

2. **Visual Style**:
   - Modern, professional, and eye-catching
   - High contrast and vibrant colors
   - Works well in BOTH light and dark themes (avoid pure white or pure black backgrounds)
   - Use gradients, depth, or dynamic compositions

3. **Design Elements**:
   - Include relevant icons, graphics, or illustrations
   - Use professional layout with clear visual hierarchy
   - Clean, uncluttered composition
   - Magazine or blog post cover aesthetic

4. **Color Palette**:
   - Use bold, attention-grabbing colors
   - Ensure text is readable against background
   - Consider gradients: blues, purples, oranges, teals
   - Avoid harsh black/white - use dark navy or off-white instead

5. **Typography in Image**:
   - Bold, modern fonts
   - Clear hierarchy (main text + supporting text if needed)
   - Professional but engaging

The image should be 16:9 aspect ratio, suitable for a blog/article header.
Output ONLY the detailed image generation prompt, no explanation.`
          : // REGULAR IMAGE PROMPT - Illustration focused
            `You are an expert AI art prompter. Create a detailed, high-quality image generation prompt based on the following text from an article.

Text: "${sectionContent}"
Context (optional): ${context || "None"}

REQUIREMENTS FOR ARTICLE IMAGE:
1. Create a visual illustration or diagram that represents the concepts in the text
2. Style should be professional, clean, and modern
3. Focus on clarity and visual communication
4. Use colors that work in both light and dark themes (avoid pure black/white)
5. No text overlays needed - this is an illustration, not a marketing image
6. Consider using: charts, diagrams, conceptual illustrations, or relevant imagery
7. The image should complement and enhance the article content

The image should be suitable for a high-quality generative AI model like Imagen.
Focus on visual elements, style, lighting, and composition.
Output ONLY the prompt, no explanation.`,
      });
      imagePrompt = text;
    }

    if (!imagePrompt) {
      return NextResponse.json(
        { error: "Prompt or section content is required" },
        { status: 400 }
      );
    }

    const result = await generateImage(imagePrompt, "16:9", model, quality);

    if (!result.success) {
      console.error("Image generation failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to generate image" },
        { status: 500 }
      );
    }

    let savedImage;
    if (articleId && result.image) {
       const supabase = await createClient();
       
       const imageSrc = result.image.startsWith('data:') 
          ? result.image 
          : `data:image/png;base64,${result.image}`;

       // If this is a cover image, unset all other cover images first
       if (isCover) {
         await supabase
           .from("article_images")
           .update({ is_cover: false })
           .eq("article_id", articleId);
       }

       const { data, error } = await supabase.from("article_images").insert({
           article_id: articleId,
           url: imageSrc,
           prompt: imagePrompt,
           is_cover: isCover || false
       }).select().single();
       
       if (!error) {
           savedImage = data;
           
           // If this is a cover image, also update the article's cover_image field
           if (isCover && savedImage) {
             await supabase
               .from("articles")
               .update({ cover_image: savedImage.url })
               .eq("id", articleId);
           }
       } else {
           console.error("Failed to save image to db:", error);
       }
    }

    return NextResponse.json({ 
      image: result.image,
      prompt: imagePrompt,
      record: savedImage
    });

  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
