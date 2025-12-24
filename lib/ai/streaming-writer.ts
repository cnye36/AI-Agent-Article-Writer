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
    customInstructions?: string;
  }
): AsyncGenerator<string, StreamingSectionResult> {
  const previousContext = context.previousSections.slice(-2).join("\n\n");

  const minWords = Math.floor(section.wordTarget * 0.9);
  const maxWords = Math.ceil(section.wordTarget * 1.1);

  const systemPrompt = `You are an expert content writer with deep expertise across multiple industries.

╔═══════════════════════════════════════════════════════════════════╗
║                       PRIMARY DIRECTIVE                           ║
║                   WORD COUNT IS MANDATORY                         ║
╠═══════════════════════════════════════════════════════════════════╣
║ TARGET: ${section.wordTarget} words (STRICT: ${minWords}-${maxWords} words)              ║
║                                                                   ║
║ This section MUST be between ${minWords}-${maxWords} words.                    ║
║ Failure to meet this requirement = REJECTION.                    ║
║                                                                   ║
║ Count your words as you write. Be concise and value-driven.      ║
╚═══════════════════════════════════════════════════════════════════╝

SECONDARY DIRECTIVES:
1. Match tone (${context.tone}) and article type (${context.articleType})
2. Follow outline structure exactly
3. Include 2+ external links from provided Sources
4. Internal links ONLY from AllowedInternalLinks list
5. NO em dashes (—) - use commas, parentheses, or colons
6. Use concrete examples and data points
7. Make content scannable and engaging

You're writing section ${context.sectionIndex + 1} of ${context.totalSections} for "${context.articleTitle}".`;

  const customInstructionsText = context.customInstructions?.trim()
    ? `\n\nCustom Instructions (MUST follow):\n${context.customInstructions.trim()}`
    : "";

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
**MANDATORY Word Count: ${section.wordTarget} words (STRICT: ${minWords}-${maxWords} words)**${allowedInternalLinksText}${sourcesText}
${customInstructionsText}

CRITICAL REQUIREMENTS (FAILURE = REJECTION):
✓ WORD COUNT: MUST be ${minWords}-${maxWords} words. Count carefully as you write.
✓ NO EM DASHES: Absolutely forbidden. Use commas, periods, or colons.
✓ EXTERNAL LINKS: Add 2+ links using URLs from Sources list
✓ INTERNAL LINKS: Only use links from AllowedInternalLinks (if provided)
✓ FORMAT: Use markdown [text](URL)

Write the complete section content now. Start with the heading (## ${
    section.heading
  }), then write concise, value-driven content that STAYS WITHIN THE WORD COUNT.`;

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
  tone: string,
  customInstructions?: string
): AsyncGenerator<string, string> {
  const systemPrompt = `You are an expert content writer. Write an engaging, CONCISE article introduction.

**MANDATORY: 50-100 words MAXIMUM** (strict limit)

Tone: ${tone}
Article Type: ${articleType}

The hook should be 2-3 SHORT paragraphs that:
1. Grab attention immediately
2. Establish relevance
3. Hint at what's covered
4. Make reader want to continue

BE CONCISE. Every word must count. Do NOT exceed 100 words.`;

  const customInstructionsText = customInstructions?.trim()
    ? `\n\nCustom Instructions (MUST follow):\n${customInstructions.trim()}`
    : "";

  const userPrompt = `Write the introduction/hook for this article:

Title: ${title}
Hook Brief: ${hook}
${customInstructionsText}

**CRITICAL: 50-100 words MAXIMUM. Be concise and impactful.**

Write the complete introduction now. DO NOT include the title - just 2-3 short hook paragraphs.`;

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
  fullArticleSoFar: string,
  customInstructions?: string
): AsyncGenerator<string, string> {
  const systemPrompt = `You are an expert content writer. Write a compelling, CONCISE article conclusion.

**MANDATORY: 100-150 words MAXIMUM** (strict limit)

Tone: ${tone}
Article Type: ${articleType}

The conclusion should:
1. Summarize key points (briefly, no repetition)
2. Provide actionable next steps
3. End with strong call-to-action
4. Leave reader informed and motivated

BE CONCISE. Do NOT exceed 150 words.`;

  const customInstructionsText = customInstructions?.trim()
    ? `\n\nCustom Instructions (MUST follow):\n${customInstructions.trim()}`
    : "";

  const userPrompt = `Write the conclusion for this article:

Title: ${articleTitle}
Conclusion Brief: ${conclusion.summary}
Call to Action: ${conclusion.callToAction}
${customInstructionsText}

Article content so far:
${fullArticleSoFar.substring(0, 1000)}... [truncated]

**CRITICAL: 100-150 words MAXIMUM. Be concise and impactful.**

Write the complete conclusion now. Start with "## Conclusion" as the heading, then write 2-3 short paragraphs.`;

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
