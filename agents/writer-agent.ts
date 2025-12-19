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
});

const writerAgentPrompt = `You are an expert content writer with deep expertise across multiple industries.
  
  Writing Guidelines:
  1. Match the tone and style to the article type
  2. Use the outline as your structure - don't deviate
  3. Incorporate sources naturally with proper attribution
  4. Include internal links ONLY from the provided AllowedInternalLinks list - DO NOT invent URLs or slugs
  5. Add at least 2 external links per article using markdown format [link text](URL) - these links MUST come from the provided Sources list and MUST be valid URLs
  6. Write engaging, scannable content with varied sentence structure
  7. Use concrete examples and data points
  8. Avoid fluff - every sentence should add value
  9. STRICTLY FORBIDDEN: Do not use em dashes (—). Use commas, parentheses, or colons instead. This is a critical requirement for authenticity.
  10. If Custom Instructions are provided, you MUST follow them.
  
  Article Type: {articleType}
  Tone: {tone}
  
  You're writing section by section. For each section:
  - Follow the key points in the outline
  - Hit the word target (approximately)
  - Transition smoothly from the previous section
  - Insert internal links ONLY from AllowedInternalLinks - use the exact URL provided, format: [anchorText](url)
  - Add at least 2 external links from the Sources list - use format [link text](https://valid-url.com) with URLs from the Sources list only
  - IMPORTANT: Do not use any em dashes in your Writing.
  - CRITICAL: Do not create internal links that are not in the AllowedInternalLinks list. If no internal links are allowed, do not add any.`;

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
  Previous sections for context:
  ${previousContext}
  
  Now write this section:
  Heading: ${section.heading}
  Key Points: ${section.keyPoints.join(", ")}
  Word Target: ${
    section.wordTarget
  }${allowedInternalLinksText}${sourcesText}${customInstructionsText}
  
  CRITICAL REQUIREMENTS:
  - Add at least 2 external links using URLs from the Sources list above
  - Only use internal links from the AllowedInternalLinks list (if any)
  - Do not invent or create any links that are not explicitly provided
  - Use markdown format: [link text](URL)
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
      };
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
            "Review this article for consistency, flow, and polish. Make minor edits to improve readability while preserving the content and links. STRICTLY REMOVE ALL EM DASHES (—) if found, replacing them with commas, parentheses, or periods. Do not introduce new em dashes.",
        },
        { role: "user", content: state.fullArticle },
      ]);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      return { fullArticle: content };
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
        const imageResult = await generateImage(prompt, "16:9");

        if (imageResult.success && imageResult.image) {
          return { coverImage: `data:image/png;base64,${imageResult.image}` };
        }
      } catch (e) {
        console.error("Failed to generate cover image:", e);
      }
      return {};
    })
    .addConditionalEdges("writeSection", (state) => {
      if (state.currentSection < state.outline.sections.length) {
        return "writeSection"; // continue writing sections
      }
      return "compile";
    })
    .addEdge("compile", "polish")
    .addEdge("polish", "generateAssets");

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