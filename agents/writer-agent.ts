// agents/writer-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import type { ArticleType, Source } from "@/types";

interface ArticleOutline {
  title: string;
  hook: string;
  sections: {
    heading: string;
    keyPoints: string[];
    wordTarget: number;
    suggestedLinks: { articleId: string; anchorText: string }[];
  }[];
  conclusion: {
    summary: string;
    callToAction: string;
  };
  seoKeywords: string[];
}

interface AllowedInternalLink {
  anchorText: string;
  url: string;
  title: string;
}

const WriterState = Annotation.Root({
  outline: Annotation<ArticleOutline>,
  articleType: Annotation<ArticleType>,
  tone: Annotation<string>,
  sources: Annotation<Source[]>,
  allowedInternalLinks: Annotation<AllowedInternalLink[]>,
  currentSection: Annotation<number>,
  sections: Annotation<string[]>,
  fullArticle: Annotation<string>,
  coverImage: Annotation<string>,
  customInstructions: Annotation<string | undefined>,
  retryCount: Annotation<number>,
});

const writerAgentPrompt = `You are an expert content writer specializing in precision and conciseness.

  ═══════════════════════════════════════════════════════════════════
  🎯 PRIMARY DIRECTIVE: WORD COUNT COMPLIANCE
  ═══════════════════════════════════════════════════════════════════

  Your #1 priority is STAYING WITHIN THE WORD COUNT TARGET.
  Everything else is secondary. A section that exceeds the word limit is REJECTED.

  WORD COUNT STRATEGY:
  1. Calculate your target paragraph structure BEFORE writing
  2. For a 200-word section: Write 3 paragraphs of ~65 words each
  3. For a 300-word section: Write 4 paragraphs of ~75 words each
  4. For a 400-word section: Write 5 paragraphs of ~80 words each
  5. After drafting each paragraph, count the words mentally
  6. If approaching the limit, STOP and conclude the section
  7. VALID RANGE: Target ±10% (e.g., 200 words = 180-220 words MAXIMUM)

  COUNTING RULES:
  - Count every word in markdown links: [link text](url) counts as 2 words
  - Code blocks and tables DO count toward the total
  - Headings (##) DO count toward the total
  - Do NOT pad with filler - be concise and value-driven

  ═══════════════════════════════════════════════════════════════════
  📝 SECONDARY DIRECTIVES (only after word count is secured)
  ═══════════════════════════════════════════════════════════════════

  Article Type: {articleType}
  Tone: {tone}

  CONTENT REQUIREMENTS:
  1. Follow the outline structure - don't deviate from key points
  2. Transition smoothly from previous sections
  3. Use concrete examples and data points
  4. Avoid fluff - every sentence must add value
  5. Match the specified tone and article type
  6. Incorporate sources naturally with attribution
  7. If Custom Instructions are provided, follow them

  FORMATTING RULES:
  • Never use em dashes (—). Use commas, periods, parentheses, or colons instead
  • For comparisons/data: Use markdown tables (| Header | Header |)
  • For code/commands: Use code blocks with language tags (\`\`\`javascript)
  • Use markdown format for all links: [link text](URL)

  LINKING RULES:
  • Internal links: ONLY use links from the AllowedInternalLinks list (exact URLs provided)
  • External links: Add at least 2 using URLs from the Sources list
  • DO NOT invent URLs or slugs - only use provided links
  • If no internal links are allowed, do not create any

  ═══════════════════════════════════════════════════════════════════
  ⚠️ REJECTION CRITERIA
  ═══════════════════════════════════════════════════════════════════
  Your section will be REJECTED if:
  - Word count exceeds target by >10%
  - Word count falls short of target by >10%
  - You use em dashes (—)
  - You invent internal link URLs not in AllowedInternalLinks
  - You fail to include at least 2 external links from Sources

  Remember: WORD COUNT FIRST. Everything else second.`;

// Helper function to count words in text (excluding markdown syntax)
function countWords(text: string): number {
  // Remove code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, " ");
  // Remove markdown links but keep link text: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove markdown formatting
  cleaned = cleaned.replace(/[#*_~`]/g, "");
  // Remove extra whitespace and count
  const words = cleaned.trim().split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

// Helper function to calculate recommended paragraph structure
function getRecommendedStructure(wordTarget: number): string {
  if (wordTarget <= 150) {
    return "2 paragraphs × ~75 words each";
  } else if (wordTarget <= 250) {
    return "3 paragraphs × ~65-70 words each";
  } else if (wordTarget <= 350) {
    return "4 paragraphs × ~75-80 words each";
  } else if (wordTarget <= 450) {
    return "5 paragraphs × ~80-90 words each";
  } else {
    const numParagraphs = Math.ceil(wordTarget / 90);
    const wordsPerParagraph = Math.floor(wordTarget / numParagraphs);
    return `${numParagraphs} paragraphs × ~${wordsPerParagraph} words each`;
  }
}

export function createWriterAgent() {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-5.1",
    temperature: 0.7, // slightly higher for creative writing
  });

  const graph = new StateGraph(WriterState)
    .addNode("writeSection", async (state) => {
      const section = state.outline.sections[state.currentSection];
      const previousContext = state.sections.slice(-2).join("\n\n");

      const prompt = writerAgentPrompt
        .replace("{articleType}", state.articleType)
        .replace("{tone}", state.tone);

      // Format allowed internal links for the prompt
      const allowedInternalLinksText =
        state.allowedInternalLinks && state.allowedInternalLinks.length > 0
          ? `\n\nAllowed Internal Links (ONLY use these - do not invent any):\n${state.allowedInternalLinks
              .map(
                (link, i) =>
                  `${i + 1}. Anchor: "${link.anchorText}" → URL: ${
                    link.url
                  } (Article: ${link.title})`
              )
              .join("\n")}`
          : "\n\nNo internal links are available. Do not create any internal links in this section.";

      // Format sources for the prompt
      const sourcesText =
        state.sources.length > 0
          ? `\n\nAvailable Sources (MUST use these URLs for external links - at least 2 required):\n${state.sources
              .map((s, i) => `${i + 1}. ${s.title || s.url}\n   URL: ${s.url}`)
              .join("\n")}`
          : "\n\nWARNING: No sources provided. You must still write the section, but cannot add external links.";

      const customInstructionsText = state.customInstructions
        ? `\n\nCustom Instructions (MUST follow):\n${state.customInstructions}`
        : "";

      const response = await model.invoke([
        { role: "system", content: prompt },
        {
          role: "user",
          content: `
  ═══════════════════════════════════════════════════════════════════
  📊 SECTION ASSIGNMENT
  ═══════════════════════════════════════════════════════════════════

  TARGET WORD COUNT: ${section.wordTarget} words
  VALID RANGE: ${Math.floor(section.wordTarget * 0.9)}-${Math.ceil(section.wordTarget * 1.1)} words (±10%)

  RECOMMENDED STRUCTURE:
  ${getRecommendedStructure(section.wordTarget)}

  ═══════════════════════════════════════════════════════════════════
  📝 CONTENT BRIEF
  ═══════════════════════════════════════════════════════════════════

  Heading: ${section.heading}
  Key Points to Cover: ${section.keyPoints.join(", ")}

  Previous Context (for transitions):
  ${previousContext || "[First section - no previous context]"}
${allowedInternalLinksText}${sourcesText}${customInstructionsText}

  ═══════════════════════════════════════════════════════════════════
  ✍️ WRITING INSTRUCTIONS
  ═══════════════════════════════════════════════════════════════════

  STEP 1: Plan your paragraph structure (see RECOMMENDED STRUCTURE above)
  STEP 2: Write each paragraph, counting words as you go
  STEP 3: When you reach ~90% of target, start concluding
  STEP 4: STOP writing when you hit the upper limit (${Math.ceil(section.wordTarget * 1.1)} words)

  CRITICAL CHECKLIST:
  ☐ Word count within ${Math.floor(section.wordTarget * 0.9)}-${Math.ceil(section.wordTarget * 1.1)} words
  ☐ At least 2 external links from Sources list
  ☐ Zero em dashes (—)
  ☐ Only approved internal links (if any)
  ☐ All key points covered

  Write the section now. STOP immediately when approaching the word limit.
            `,
        },
      ]);

      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      return {
        sections: [...state.sections, content],
        currentSection: state.currentSection + 1,
        // Don't reset retryCount here - let validateSection handle it
      };
    })
    .addNode("validateSection", async (state) => {
      // Validate the most recently written section
      const latestSection = state.sections[state.sections.length - 1];
      const sectionIndex = state.sections.length - 1;
      const targetWord = state.outline.sections[sectionIndex].wordTarget;
      const actualWords = countWords(latestSection);
      const minWords = Math.floor(targetWord * 0.9);
      const maxWords = Math.ceil(targetWord * 1.1);

      console.log(
        `[Writer Agent] Section ${sectionIndex + 1} validation: ${actualWords} words (target: ${targetWord}, range: ${minWords}-${maxWords})`
      );

      const isValid = actualWords >= minWords && actualWords <= maxWords;

      if (!isValid && state.retryCount < 2) {
        // Section failed validation and we haven't exceeded retry limit
        const overage = actualWords - maxWords;
        const shortage = minWords - actualWords;

        console.warn(
          `[Writer Agent] Section ${sectionIndex + 1} FAILED validation. Retry ${state.retryCount + 1}/2`
        );

        // Remove the invalid section and retry
        return {
          sections: state.sections.slice(0, -1),
          currentSection: state.currentSection - 1,
          retryCount: state.retryCount + 1,
        };
      } else if (!isValid) {
        // Exceeded retry limit - accept section with warning
        console.warn(
          `[Writer Agent] Section ${sectionIndex + 1} validation failed after 2 retries. Accepting anyway (${actualWords} words).`
        );
        // Reset retry count for next section
        return { retryCount: 0 };
      } else {
        console.log(`[Writer Agent] Section ${sectionIndex + 1} PASSED validation ✓`);
        // Reset retry count for next section
        return { retryCount: 0 };
      }
    })
    .addNode("compile", async (state) => {
      // Compile all sections into final article
      const fullArticle = compileArticle(
        state.outline.title,
        state.outline.hook,
        state.sections,
        state.outline.conclusion
      );
      return { fullArticle };
    })
    .addNode("polish", async (state) => {
      // Final polish pass for consistency and flow
      const response = await model.invoke([
        {
          role: "system",
          content:
            "You are a copy editor performing a final polish pass. Your job is to EDIT, not ADD.\n\n" +
            "ALLOWED CHANGES:\n" +
            "• Fix grammar, spelling, and punctuation errors\n" +
            "• Improve sentence flow and transitions\n" +
            "• Replace em dashes (—) with commas, periods, or colons\n" +
            "• Ensure consistency in tone and style\n" +
            "• Fix awkward phrasing\n\n" +
            "FORBIDDEN CHANGES:\n" +
            "✗ DO NOT add new sentences or paragraphs\n" +
            "✗ DO NOT expand on existing content\n" +
            "✗ DO NOT add new examples or data points\n" +
            "✗ DO NOT introduce new em dashes\n" +
            "✗ DO NOT increase the word count\n\n" +
            "If anything, you should REDUCE word count by tightening prose, not increase it.\n" +
            "Preserve all links exactly as written. Return the polished article.",
        },
        { role: "user", content: state.fullArticle },
      ]);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      return { fullArticle: content };
    })
    .addNode("cleanup", async (state) => {
      // FORCIBLE cleanup step - programmatically remove em dashes
      // This is a failsafe in case the model didn't comply
      let cleaned = state.fullArticle;

      // Remove all em dashes (—) and replace with appropriate alternatives
      // Common patterns where em dashes appear:
      // 1. "word—word" -> "word, word" or "word. Word"
      // 2. "word — word" -> "word, word"
      // 3. " — " -> ", "
      cleaned = cleaned.replace(/\s*—\s*/g, ", ");

      // Also check for the unicode em dash character
      cleaned = cleaned.replace(/\s*\u2014\s*/g, ", ");

      // Check for HTML entity version
      cleaned = cleaned.replace(/&mdash;/g, ", ");
      cleaned = cleaned.replace(/&#8212;/g, ", ");

      console.log(`[Writer Agent] Cleanup: Removed em dashes from article`);

      return { fullArticle: cleaned };
    })
    .addNode("generateAssets", async (state) => {
      // Generate cover image
      try {
        const promptResponse = await model.invoke([
          {
            role: "system",
            content:
              "You are an AI art director. Create a compelling, high-quality image generation prompt for the cover image of this article. Output ONLY the English prompt, no other text.",
          },
          {
            role: "user",
            content: `Title: ${state.outline.title}\n\nSummary: ${state.outline.conclusion.summary}`,
          },
        ]);

        const prompt =
          typeof promptResponse.content === "string"
            ? promptResponse.content
            : JSON.stringify(promptResponse.content);

        // Import dynamically to avoid circular deps if any, or just standard import
        const { generateImage } = await import("@/lib/ai/image-generation");
        const imageResult = await generateImage(
          prompt,
          "16:9",
          "gpt-image-1.5",
          "medium"
        );

        if (imageResult.success && imageResult.image) {
          return { coverImage: `data:image/png;base64,${imageResult.image}` };
        }
      } catch (e) {
        console.error("Failed to generate cover image:", e);
      }
      return {};
    })
    .addEdge("__start__", "writeSection") // Set entry point
    .addEdge("writeSection", "validateSection")
    .addConditionalEdges("validateSection", (state) => {
      // If validation triggered a retry (sections array was reduced), go back to writeSection
      if (state.retryCount > 0 && state.sections.length < state.currentSection) {
        return "writeSection";
      }
      // Otherwise, check if we need to write more sections
      if (state.currentSection < state.outline.sections.length) {
        return "writeSection";
      }
      return "compile";
    })
    .addEdge("compile", "polish")
    .addEdge("polish", "cleanup")
    .addEdge("cleanup", "generateAssets");

  return graph.compile();
}

// Helper function (stub - to be implemented)
function compileArticle(
  title: string,
  hook: string,
  sections: string[],
  conclusion: { summary: string; callToAction: string }
): string {
  return `# ${title}\n\n${hook}\n\n${sections.join("\n\n")}\n\n## Conclusion\n\n${conclusion.summary}\n\n${conclusion.callToAction}`;
}