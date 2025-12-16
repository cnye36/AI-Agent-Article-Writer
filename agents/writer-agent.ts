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

const WriterState = Annotation.Root({
    outline: Annotation<ArticleOutline>,
    articleType: Annotation<ArticleType>,
    tone: Annotation<string>,
    sources: Annotation<Source[]>,
    currentSection: Annotation<number>,
    sections: Annotation<string[]>,
    fullArticle: Annotation<string>,
  });
  
  const writerAgentPrompt = `You are an expert content writer with deep expertise across multiple industries.
  
  Writing Guidelines:
  1. Match the tone and style to the article type
  2. Use the outline as your structure - don't deviate
  3. Incorporate sources naturally with proper attribution
  4. Include internal links using the suggested anchor text
  5. Write engaging, scannable content with varied sentence structure
  6. Use concrete examples and data points
  7. Avoid fluff - every sentence should add value
  
  Article Type: {articleType}
  Tone: {tone}
  
  

  You're writing section by section. For each section:
  - Follow the key points in the outline
  - Hit the word target (approximately)
  - Transition smoothly from the previous section
  - Insert internal links where suggested
  - IMPORTANT: Do not use any em dashes in your Writing.`;

  
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
  Word Target: ${section.wordTarget}
  Suggested Links: ${JSON.stringify(section.suggestedLinks)}
            `
          }
        ]);
        
        const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        return {
          sections: [...state.sections, content],
          currentSection: state.currentSection + 1
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
            content: "Review this article for consistency, flow, and polish. Make minor edits to improve readability while preserving the content and links."
          },
          { role: "user", content: state.fullArticle }
        ]);
        const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        return { fullArticle: content };
      })
      .addConditionalEdges("writeSection", (state) => {
        if (state.currentSection < state.outline.sections.length) {
          return "writeSection"; // continue writing sections
        }
        return "compile";
      })
      .addEdge("compile", "polish")
      .addEdge("__start__", "writeSection");
  
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