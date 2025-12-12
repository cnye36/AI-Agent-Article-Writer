import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/ai/openai";
import { z } from "zod";
import type { OutlineSection } from "@/types";

const EditSectionSchema = z.object({
  outlineId: z.string().uuid(),
  sectionIndex: z.number().int().min(0),
  instruction: z.string().min(1),
  currentSection: z.object({
    heading: z.string(),
    keyPoints: z.array(z.string()),
    wordTarget: z.number(),
    suggestedLinks: z.array(z.object({
      articleId: z.string(),
      anchorText: z.string(),
    })).optional(),
  }),
});

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
    const validationResult = EditSectionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { outlineId, sectionIndex, instruction, currentSection } = validationResult.data;

    // Fetch the outline to get context
    const { data: outlineData, error: outlineError } = await supabase
      .from("outlines")
      .select("*")
      .eq("id", outlineId)
      .single();

    if (outlineError || !outlineData) {
      return NextResponse.json(
        { error: "Outline not found" },
        { status: 404 }
      );
    }

    const outline = outlineData as any;
    const structure = outline.structure;

    // Build context for AI
    const context = {
      articleTitle: structure.title,
      articleHook: structure.hook,
      articleType: outline.article_type,
      targetLength: outline.target_length,
      tone: outline.tone,
      allSections: structure.sections,
      currentSectionIndex: sectionIndex,
    };

    // Create prompt for AI
    const systemPrompt = `You are an expert content strategist. Your task is to rewrite a specific section of an article outline based on user instructions.

Article Context:
- Title: ${context.articleTitle}
- Hook: ${context.articleHook}
- Type: ${context.articleType}
- Target Length: ${context.targetLength}
- Tone: ${context.tone}

Current Section to Rewrite:
- Heading: ${currentSection.heading}
- Key Points: ${currentSection.keyPoints.join(", ")}
- Word Target: ${currentSection.wordTarget}

User Instruction: ${instruction}

Return a JSON object with this exact structure:
{
  "heading": "Updated section heading",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "wordTarget": ${currentSection.wordTarget},
  "suggestedLinks": ${JSON.stringify(currentSection.suggestedLinks || [])}
}

Important:
- Keep the same wordTarget
- Maintain consistency with the article's tone and style
- Ensure the section flows naturally with surrounding sections
- Follow the user's instruction precisely
- Return ONLY valid JSON, no additional text`;

    // Call OpenAI to rewrite the section
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Rewrite this section according to the instruction: "${instruction}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the response
    let updatedSection: OutlineSection;
    try {
      const parsed = JSON.parse(content);
      updatedSection = {
        heading: parsed.heading || currentSection.heading,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : currentSection.keyPoints,
        wordTarget: parsed.wordTarget || currentSection.wordTarget,
        suggestedLinks: parsed.suggestedLinks || currentSection.suggestedLinks || [],
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Update the outline structure in the database
    const updatedSections = [...structure.sections];
    updatedSections[sectionIndex] = updatedSection;

    const updatedStructure = {
      ...structure,
      sections: updatedSections,
    };

    const { error: updateError } = await supabase
      .from("outlines")
      .update({ structure: updatedStructure })
      .eq("id", outlineId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      updatedSection,
      outline: {
        ...outline,
        structure: updatedStructure,
      },
    });
  } catch (error) {
    console.error("Error rewriting outline section:", error);
    return NextResponse.json(
      {
        error: "Failed to rewrite section",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

