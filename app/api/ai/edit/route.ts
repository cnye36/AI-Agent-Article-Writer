import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/ai/openai";
import { z } from "zod";

// Request validation schema
const EditRequestSchema = z.object({
  selectedText: z.string().min(1),
  action: z.enum(["rewrite", "expand", "simplify", "custom", "fix_grammar", "change_tone"]),
  customPrompt: z.string().optional(),
  context: z
    .object({
      beforeText: z.string().optional(),
      afterText: z.string().optional(),
      articleType: z.string().optional(),
      tone: z.string().optional(),
    })
    .optional(),
  targetTone: z.string().optional(), // for change_tone action
});

// Action-specific system prompts
const ACTION_PROMPTS: Record<string, string> = {
  rewrite: `You are an expert editor. Rewrite the provided text to improve clarity, flow, and engagement while maintaining the same meaning and approximate length. 

Guidelines:
- Keep the same voice and style
- Maintain technical accuracy
- Improve sentence structure variety
- Use active voice when possible
- Ensure smooth transitions`,

  expand: `You are an expert content writer. Expand the provided text by adding relevant details, examples, data points, or explanations.

Guidelines:
- Add 50-100% more content
- Include specific examples or statistics where relevant
- Maintain the same tone and style
- Don't add fluff - every addition should provide value
- Keep the original points intact`,

  simplify: `You are an expert editor specializing in clear communication. Simplify the provided text to make it more accessible and easier to understand.

Guidelines:
- Use shorter sentences
- Replace jargon with plain language
- Break down complex concepts
- Maintain accuracy while improving accessibility
- Keep the core message intact`,

  fix_grammar: `You are a professional proofreader. Fix any grammar, spelling, punctuation, or syntax errors in the provided text.

Guidelines:
- Only fix actual errors
- Don't change style or meaning
- Preserve the author's voice
- Fix subject-verb agreement, tense consistency
- Correct punctuation and capitalization`,

  change_tone: `You are an expert editor. Rewrite the provided text to match the specified tone while preserving the meaning.

Guidelines:
- Adjust vocabulary to match the target tone
- Modify sentence structure as needed
- Keep all factual information intact
- Ensure the transformation feels natural`,

  custom: `You are an expert content editor. Follow the user's specific instructions to modify the provided text.

Guidelines:
- Follow the instructions precisely
- Maintain the context and flow with surrounding text
- Preserve any technical accuracy
- Output only the modified text, no explanations`,
};

// Tone descriptions for context
const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: "formal, authoritative, business-appropriate",
  casual: "conversational, friendly, approachable",
  technical: "precise, detailed, using industry terminology",
  enthusiastic: "energetic, excited, engaging",
  neutral: "balanced, objective, matter-of-fact",
  persuasive: "compelling, convincing, action-oriented",
  academic: "scholarly, well-researched, citation-ready",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = EditRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { selectedText, action, customPrompt, context, targetTone } =
      validationResult.data;

    // Build the system prompt
    let systemPrompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.custom;

    // Add context about surrounding text if available
    if (context?.beforeText || context?.afterText) {
      systemPrompt += `\n\nContext:
The text appears in an article with the following surrounding content:
${context.beforeText ? `Before: "...${context.beforeText}"` : ""}
${context.afterText ? `After: "${context.afterText}..."` : ""}

Ensure your edit flows naturally with this context.`;
    }

    // Add article type context
    if (context?.articleType) {
      systemPrompt += `\n\nThis is a ${context.articleType} article. Match the appropriate style.`;
    }

    // Add tone context
    if (context?.tone || targetTone) {
      const toneKey = targetTone || context?.tone || "professional";
      const toneDesc = TONE_DESCRIPTIONS[toneKey] || toneKey;
      systemPrompt += `\n\nTarget tone: ${toneDesc}`;
    }

    // Build user prompt
    let userPrompt = `Text to edit:\n\n${selectedText}`;

    if (action === "custom" && customPrompt) {
      userPrompt = `Instructions: ${customPrompt}\n\nText to edit:\n\n${selectedText}`;
    }

    if (action === "change_tone" && targetTone) {
      userPrompt = `Change the tone to: ${targetTone}\n\nText to edit:\n\n${selectedText}`;
    }

    // Stream the response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-5.1",
            max_tokens: 2048,
            stream: true,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
          });

          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }

          controller.close();
        } catch (error) {
          console.error("OpenAI API error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI edit error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process edit request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Non-streaming version for simple edits
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const validationResult = EditRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { selectedText, action, customPrompt, context, targetTone } =
      validationResult.data;

    let systemPrompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.custom;

    if (context?.tone || targetTone) {
      const toneKey = targetTone || context?.tone || "professional";
      const toneDesc = TONE_DESCRIPTIONS[toneKey] || toneKey;
      systemPrompt += `\n\nTarget tone: ${toneDesc}`;
    }

    let userPrompt = `Text to edit:\n\n${selectedText}`;

    if (action === "custom" && customPrompt) {
      userPrompt = `Instructions: ${customPrompt}\n\nText to edit:\n\n${selectedText}`;
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5.1",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const editedText = response.choices[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        success: true,
        originalText: selectedText,
        editedText,
        action,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI edit error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process edit request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Batch edit endpoint for multiple selections
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { edits } = body;

    if (!Array.isArray(edits) || edits.length === 0) {
      return new Response(
        JSON.stringify({ error: "Edits array is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (edits.length > 10) {
      return new Response(
        JSON.stringify({ error: "Maximum 10 edits per batch" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Process edits in parallel
    const results = await Promise.all(
      edits.map(async (edit: any) => {
        const { selectedText, action, customPrompt } = edit;

        const systemPrompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.custom;
        let userPrompt = `Text to edit:\n\n${selectedText}`;

        if (action === "custom" && customPrompt) {
          userPrompt = `Instructions: ${customPrompt}\n\nText to edit:\n\n${selectedText}`;
        }

        try {
          const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-5.1",
            max_tokens: 1024,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
          });

          return {
            success: true,
            originalText: selectedText,
            editedText: response.choices[0]?.message?.content || "",
            action,
          };
        } catch (error) {
          return {
            success: false,
            originalText: selectedText,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Batch edit error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process batch edits",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}