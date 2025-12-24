import { NextRequest, NextResponse } from "next/server";
import { generateImage, ImageModel, ImageQuality } from "@/lib/ai/image-generation";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const {
      prompt, // The user's edit instruction (e.g., "remove the cat")
      originalPrompt, // The original prompt that generated the image
      model = "gpt-image-1.5",
      quality = "medium",
    } = await req.json();

    if (!prompt || !originalPrompt) {
        return NextResponse.json(
            { error: "Both prompt (edit instruction) and originalPrompt are required" },
            { status: 400 }
        );
    }
    
    console.log("Image edit API called", { model, quality });

    // 1. Refine the prompt using an LLM
    const { text: newPrompt } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are an expert AI art prompter. specificially for DALL-E 3 / GPT Image models.
      
      Your task is to create a NEW image generation prompt based on an ORIGINAL prompt and a user's EDIT instruction.
      The goal is to modify the original prompt to satisfy the user's request while keeping the rest of the style and content consistent (unless the user asks to change it).
      
      ORIGINAL PROMPT:
      "${originalPrompt}"
      
      USER EDIT INSTRUCTION:
      "${prompt}"
      
      REQUIREMENTS:
      1. Fully incorporate the user's edit.
      2. Keep the original style, lighting, and composition details unless asked to change.
      3. The output must be a single, detailed prompt suitable for image generation.
      4. Do NOT explain your changes. Output ONLY the new prompt.
      
      NEW PROMPT:`,
    });

    console.log("Refined prompt:", newPrompt);

    // 2. Generate the new image
    const result = await generateImage(newPrompt, "16:9", model as ImageModel, quality as ImageQuality);

    if (!result.success) {
      console.error("Image generation failed during edit:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to generate image" },
        { status: 500 }
      );
    }

    // Return the new image and the new prompt (so the frontend can update the attribute)
    return NextResponse.json({ 
      image: result.image,
      prompt: newPrompt,
    });

  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
