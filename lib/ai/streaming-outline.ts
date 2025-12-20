import { openai } from "./openai";
import type { ArticleType, Source } from "@/types";

interface StreamOutlineParams {
  topic: {
    title: string;
    summary: string;
    sources: Source[];
    angle?: string;
    hook?: string;
  };
  articleType: ArticleType;
  targetLength: "short" | "medium" | "long";
  tone: string;
  freshSources: Source[];
  relatedArticles?: Array<{ id: string; title: string; slug: string }>;
}

const outlineAgentPrompt = `You are an expert content strategist and outline architect.
  
  Your job is to create detailed, structured outlines that will guide the writing agent.
  
  Article Type: {articleType}
  - blog: Conversational, engaging, personal insights. Sections flow naturally with transitions.
  - technical: In-depth, code examples, precise terminology. Include code snippets and technical details.
  - news: Factual, timely, objective reporting. Use inverted pyramid structure (most important info first).
  - opinion: Persuasive, well-argued, clear stance. Include counterarguments and rebuttals.
  - tutorial: Step-by-step, actionable, beginner-friendly. Each section is a numbered step with clear instructions.
  - personal: First-person experience/journey. Use a narrative arc (setup → experiment → results → takeaways). Include specific steps/workflow and concrete outcomes.
  - listicle: **CRITICAL**: MUST be a numbered list format. Each section heading MUST start with a number (e.g., "1. [Item Name]", "2. [Item Name]"). The title should match this format (e.g., "11 AI Tools..."). Each numbered item is a separate section. Make it scannable and engaging.
  - affiliate: Comparison and recommendation articles. Include pros/cons sections, comparison tables, and clear recommendations.
  
  Target Length: {targetLength}
  
  Optimal word counts by article type:
  - Blog/Affiliate/Personal (medium): ~1,500 words (5-6 sections for blog/personal, 8-12 items for listicle)
  - Technical/Tutorial (long): ~2,500+ words (7-10 sections, comprehensive guides)
  - News (short): ~600 words (3-4 sections, concise reporting)
  - Opinion (short): ~900 words (4-6 sections, focused argument)
  - Listicle (long): ~1,800 words (8-12 items, scannable format)
  
  Section counts by length:
  - short: 3-4 sections for blog/news, 5-7 items for listicle
  - medium: 5-6 sections for blog/news, 8-12 items for listicle
  - long: 7-10 sections for blog/news, 15+ items for listicle
  
  Tone: {tone}
  
  Related Articles for Internal Linking:
  {relatedArticles}
  
  For each section, suggest opportunities to link to related articles using natural anchor text.
  
  Create an outline that:
  1. Opens with a compelling hook {hookNote}
  2. Flows logically from section to section (or numbered items for listicles)
  3. Includes specific talking points (not vague)
  4. Suggests internal links where relevant
  5. Ends with a strong conclusion and CTA
  6. Includes SEO keywords
  7. **STRICTLY follows the article type format** - especially for listicles (numbered sections)
  
  **IMPORTANT**: Do not use any em dashes in your outline.`;

/**
 * Stream generate an article outline with token-by-token updates
 * This enables real-time progress feedback to users
 * Yields tokens (strings) as they arrive. The caller should accumulate and parse.
 */
export async function* streamGenerateOutline(
  params: StreamOutlineParams
): AsyncGenerator<string, void> {
  const { topic, articleType, targetLength, tone, freshSources, relatedArticles = [] } = params;

  // Combine fresh sources with topic sources (fresh sources take priority)
  const allSources = [
    ...freshSources,
    ...topic.sources.filter(
      (ts) => !freshSources.some((fs) => fs.url === ts.url)
    ),
  ];

  const hookNote = topic.hook
    ? `(Use this hook if appropriate: "${topic.hook}")`
    : "";

  const prompt = outlineAgentPrompt
    .replace("{articleType}", articleType)
    .replace("{targetLength}", targetLength)
    .replace("{tone}", tone)
    .replace("{hookNote}", hookNote)
    .replace(
      "{relatedArticles}",
      relatedArticles.length > 0
        ? relatedArticles.map((a) => `- ${a.title} (${a.slug})`).join("\n")
        : "No related articles available"
    );

  const userContent = `Topic: ${topic.title}\n\nSummary: ${topic.summary}\n\nAngle: ${topic.angle || "General coverage"}${topic.hook ? `\n\nSuggested Hook: ${topic.hook}` : ""}\n\nSources (prioritize the most recent): ${JSON.stringify(
    allSources.slice(0, 15),
    null,
    2
  )}\n\nIMPORTANT: 
- We are in late December 2025, approaching 2026 - use the most recent sources from late 2025
- Focus on recent developments and trends from late 2025, and forward-looking predictions for 2026
- Use forward-looking language like "going into 2026", "trends for 2026", "what to expect in 2026" when appropriate
- ${
    articleType === "listicle"
      ? "**CRITICAL FOR LISTICLES**: Section headings MUST be numbered (e.g., '1. First Item', '2. Second Item'). Each numbered item is a separate section."
      : ""
  }
- ${
    articleType === "listicle"
      ? "The title should match the listicle format (e.g., '11 Tools...', '7 Ways...'). Consider using 2026 forward-looking language (e.g., '11 Tools for 2026')."
      : ""
  }

Return a JSON object with this exact structure:
{
  "title": "${
    articleType === "listicle"
      ? "Numbered list title (e.g., '11 AI Tools Every Developer Needs')"
      : "Article title"
  }",
  "hook": "${topic.hook ? topic.hook : "Compelling opening hook"}",
  "sections": [
    {
      "heading": "${
        articleType === "listicle"
          ? "1. First Item Name"
          : "Section heading"
      }",
      "keyPoints": ["point 1", "point 2"],
      "wordTarget": 200,
      "suggestedLinks": [{"articleId": "uuid", "anchorText": "link text"}]
    }${
      articleType === "listicle"
        ? ',\n    {\n      "heading": "2. Second Item Name",\n      "keyPoints": ["point 1", "point 2"],\n      "wordTarget": 200,\n      "suggestedLinks": []\n    }'
        : ""
    }
  ],
  "conclusion": {
    "summary": "Conclusion summary",
    "callToAction": "CTA text"
  },
  "seoKeywords": ["keyword1", "keyword2"]
}`;

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;

      if (delta) {
        fullContent += delta;
        yield delta; // Yield each token as it arrives (as string)
      }
    }

    // Note: Caller should parse fullContent using parseOutline()
  } catch (error) {
    console.error("Error streaming outline:", error);
    throw new Error(
      `Failed to generate outline: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

