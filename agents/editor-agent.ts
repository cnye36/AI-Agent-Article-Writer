// agents/editor-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import type { ArticleType } from "@/types";

const EditorState = Annotation.Root({
  articleContent: Annotation<string>,
  articleType: Annotation<ArticleType | undefined>,
  tone: Annotation<string | undefined>,
  editedContent: Annotation<string>,
});

const editorAgentPrompt = `You are an expert magazine/newspaper editor with decades of experience refining content for publication. Your role is to review and improve articles to ensure they sound genuinely human-written, not AI-generated.

CRITICAL EDITING TASKS:
1. **Remove ALL em dashes (—)**: Replace them with commas, parentheses, colons, or periods as appropriate. Em dashes are a telltale sign of AI-generated content.

2. **Fix AI-sounding patterns**:
   - Remove overly formal or robotic phrasing
   - Eliminate repetitive sentence structures
   - Break up overly long, complex sentences
   - Replace generic transitions like "Furthermore," "Moreover," "In addition" with more natural alternatives
   - Remove excessive use of "it's important to note," "it's worth mentioning," etc.

3. **Eliminate duplicates**:
   - Find and remove duplicate sentences or paragraphs
   - Consolidate repetitive ideas
   - Remove redundant phrases

4. **Improve flow and readability**:
   - Ensure smooth transitions between paragraphs
   - Vary sentence length and structure
   - Make the writing conversational and engaging
   - Fix awkward phrasing
   - Ensure logical progression of ideas

5. **Maintain authenticity**:
   - Keep the original meaning and facts intact
   - Preserve all links (internal and external) exactly as they are
   - Maintain the article's structure and headings
   - Keep the tone appropriate for the article type
   - Don't over-edit - only make necessary improvements

6. **Grammar and style**:
   - Fix any grammatical errors
   - Ensure consistent style throughout
   - Check for proper punctuation

IMPORTANT GUIDELINES:
- Do NOT rewrite the entire article - only edit what needs improvement
- Preserve ALL markdown formatting (headings, links, bold, italic, etc.)
- Keep all URLs and links exactly as they appear
- Maintain the article's original structure and organization
- The goal is to make it sound human, not to completely rewrite it

Article Type: {articleType}
Tone: {tone}

Review the article carefully and make targeted improvements to eliminate AI patterns while preserving the content's integrity.`;

export function createEditorAgent() {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    temperature: 0.3, // Lower temperature for more consistent editing
  });

  const graph = new StateGraph(EditorState)
    .addNode("review", async (state) => {
      const prompt = editorAgentPrompt
        .replace("{articleType}", state.articleType || "blog")
        .replace("{tone}", state.tone || "professional");

      const response = await model.invoke([
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Please review and edit this article to make it sound genuinely human-written. Focus on removing AI patterns, fixing em dashes, eliminating duplicates, and improving flow. Preserve all links, formatting, and structure.

Article to edit:
${state.articleContent}`,
        },
      ]);

      const editedContent =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      return { editedContent };
    })
    .addNode("verify", async (state) => {
      // Second pass to catch any remaining issues
      const response = await model.invoke([
        {
          role: "system",
          content:
            "You are a quality assurance editor. Do a final check for: 1) Any remaining em dashes (—), 2) AI-sounding phrases, 3) Duplicate content, 4) Flow issues. Make minimal, targeted fixes only. Preserve all links and formatting.",
        },
        {
          role: "user",
          content: `Final review pass - only fix remaining issues:
${state.editedContent}`,
        },
      ]);

      const finalContent =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      return { editedContent: finalContent };
    })
    .addEdge("__start__", "review")
    .addEdge("review", "verify");

  return graph.compile();
}

