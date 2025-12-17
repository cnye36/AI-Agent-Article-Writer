import { openai } from "./openai";
import type { ArticleType, Source } from "@/types";

export interface AllowedInternalLink {
  anchorText: string;
  url: string;
  title: string;
}

export interface SectionToWrite {
  heading: string;
  keyPoints: string[];
  wordTarget: number;
  suggestedLinks?: Array<{ articleId: string; anchorText: string }>;
}

export interface StreamingSectionResult {
  content: string;
  tokens: number;
  wordCount: number;
}

/**
 * Stream-write a single article section with token-by-token updates
 * This enables real-time progress feedback to users
 */
export async function* streamWriteSection(
  section: SectionToWrite,
  context: {
    articleTitle: string;
    articleType: ArticleType;
    tone: string;
    previousSections: string[];
    sources: Source[];
    allowedInternalLinks?: AllowedInternalLink[];
    sectionIndex: number;
    totalSections: number;
  }
): AsyncGenerator<string, StreamingSectionResult> {
  const previousContext = context.previousSections.slice(-2).join("\n\n");

  const systemPrompt = `You are an expert content writer with deep expertise across multiple industries.

Writing Guidelines:
1. Match the tone and style to the article type (${context.articleType})
2. Use the outline as your structure - don't deviate
3. Incorporate sources naturally with proper attribution
4. Include internal links ONLY from the provided AllowedInternalLinks list - DO NOT invent URLs or slugs
5. Add at least 2 external links from the provided Sources list
6. Write engaging, scannable content with varied sentence structure
7. Use concrete examples and data points
8. Avoid fluff - every sentence should add value
9. STRICTLY FORBIDDEN: Do not use em dashes (—). Use commas, parentheses, or colons instead.

Tone: ${context.tone}

You're writing section ${context.sectionIndex + 1} of ${
    context.totalSections
  } for the article "${context.articleTitle}".
Follow the key points in the outline, hit the word target (approximately), and transition smoothly from the previous section.`;

  const allowedInternalLinksText =
    context.allowedInternalLinks && context.allowedInternalLinks.length > 0
      ? `\n\nAllowed Internal Links (ONLY use these - do not invent any):\n${context.allowedInternalLinks
          .map(
            (link, i) =>
              `${i + 1}. Anchor: "${link.anchorText}" → URL: ${
                link.url
              } (Article: ${link.title})`
          )
          .join("\n")}`
      : "\n\nNo internal links are available. Do not create any internal links in this section.";

  const sourcesText =
    context.sources.length > 0
      ? `\n\nAvailable Sources (MUST use these URLs for external links - at least 2 required):\n${context.sources
          .map((s, i) => `${i + 1}. ${s.title || s.url}\n   URL: ${s.url}`)
          .join("\n")}`
      : "\n\nWARNING: No sources provided. You must still write the section, but cannot add external links.";

  const userPrompt = `${
    previousContext
      ? `Previous sections for context:\n${previousContext}\n\n`
      : ""
  }Now write this section:

Heading: ${section.heading}
Key Points: ${section.keyPoints.join(", ")}
Word Target: ${
    section.wordTarget
  } words${allowedInternalLinksText}${sourcesText}

CRITICAL REQUIREMENTS:
- Add at least 2 external links using URLs from the Sources list above
- Only use internal links from the AllowedInternalLinks list (if any)
- Do not invent or create any links that are not explicitly provided
- Use markdown format: [link text](URL)

Write the complete section content now. Start with the heading as a markdown heading (## ${
    section.heading
  }), then write the content.`;

  let fullContent = "";
  let tokenCount = 0;

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // Slightly higher for creative writing
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;

      if (delta) {
        fullContent += delta;
        yield delta; // Yield each token as it arrives
      }

      // Track token usage if available
      if (chunk.usage) {
        tokenCount = chunk.usage.total_tokens;
      }
    }

    // Calculate word count
    const wordCount = fullContent
      .replace(/[#*_\[\]()]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      content: fullContent,
      tokens: tokenCount,
      wordCount,
    };
  } catch (error) {
    console.error("Error streaming section:", error);
    throw new Error(
      `Failed to write section: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Write the article hook/introduction with streaming
 */
export async function* streamWriteHook(
  title: string,
  hook: string,
  articleType: ArticleType,
  tone: string
): AsyncGenerator<string, string> {
  const systemPrompt = `You are an expert content writer. Write an engaging article introduction that hooks the reader.

Tone: ${tone}
Article Type: ${articleType}

The hook should be 2-3 paragraphs that:
1. Grab attention immediately
2. Establish relevance and context
3. Hint at what the article will cover
4. Make the reader want to continue`;

  const userPrompt = `Write the introduction/hook for this article:

Title: ${title}
Hook Brief: ${hook}

Write the complete introduction now. DO NOT include the title - just the hook paragraphs.`;

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;

      if (delta) {
        fullContent += delta;
        yield delta;
      }
    }

    return fullContent;
  } catch (error) {
    console.error("Error streaming hook:", error);
    throw new Error(
      `Failed to write hook: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Write the article conclusion with streaming
 */
export async function* streamWriteConclusion(
  conclusion: { summary: string; callToAction: string },
  articleTitle: string,
  articleType: ArticleType,
  tone: string,
  fullArticleSoFar: string
): AsyncGenerator<string, string> {
  const systemPrompt = `You are an expert content writer. Write a compelling article conclusion.

Tone: ${tone}
Article Type: ${articleType}

The conclusion should:
1. Summarize the key points without being repetitive
2. Provide actionable next steps
3. End with a strong call-to-action
4. Leave the reader feeling informed and motivated`;

  const userPrompt = `Write the conclusion for this article:

Title: ${articleTitle}
Conclusion Brief: ${conclusion.summary}
Call to Action: ${conclusion.callToAction}

Article content so far:
${fullArticleSoFar.substring(0, 1000)}... [truncated]

Write the complete conclusion section now. Start with "## Conclusion" as the heading.`;

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;

      if (delta) {
        fullContent += delta;
        yield delta;
      }
    }

    return fullContent;
  } catch (error) {
    console.error("Error streaming conclusion:", error);
    throw new Error(
      `Failed to write conclusion: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
