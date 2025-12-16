// agents/orchestrator.ts
import { StateGraph, Annotation, MemorySaver } from "@langchain/langgraph";
import type { ArticleType, Article, Source } from "@/types";
import { createResearchAgent } from "./research-agent";
import { createOutlineAgent } from "./outline-agent";
import { createWriterAgent } from "./writer-agent";
import { INDUSTRY_KEYWORDS } from "@/lib/config";


// Agent-specific types (matching what agents actually use)
interface TopicCandidate {
  title: string;
  summary: string;
  angle: string;
  sources: Source[];
  relevanceScore: number;
}

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

const OrchestratorState = Annotation.Root({
  // Input
  industry: Annotation<string>,
  articleType: Annotation<ArticleType>,
  targetLength: Annotation<"short" | "medium" | "long">,
  tone: Annotation<string>,
  
  // Pipeline state
  topics: Annotation<TopicCandidate[]>,
  selectedTopic: Annotation<TopicCandidate>,
  outline: Annotation<ArticleOutline>,
  article: Annotation<Article>,
  
  // Control
  stage: Annotation<"research" | "outline" | "write" | "complete">,
  requiresApproval: Annotation<boolean>,
});

export function createOrchestrator() {
  const researchAgent = createResearchAgent();
  const outlineAgent = createOutlineAgent();
  const writerAgent = createWriterAgent();

  const graph = new StateGraph(OrchestratorState)
    .addNode("research", async (state) => {
      // Note: These helper functions should be implemented or passed as parameters
      // For now, using empty arrays as placeholders
      const result = await researchAgent.invoke({
        industry: state.industry,
        keywords: getIndustryKeywords(state.industry),
        existingTopics: await getExistingTopicTitles(state.industry),
      });
      // Convert TopicCandidate[] to match state type
      return { topics: result.discoveredTopics as TopicCandidate[], stage: "outline" };
    })
    .addNode("awaitTopicSelection", async () => {
      // This node pauses for user input
      // In practice, you'd use LangGraph's interrupt feature
      return { requiresApproval: true };
    })
    .addNode("outline", async (state) => {
      const result = await outlineAgent.invoke({
        topic: state.selectedTopic,
        articleType: state.articleType,
        targetLength: state.targetLength,
        tone: state.tone,
      });
      // The outline agent returns ArticleOutline (structure only)
      return { outline: result.outline, stage: "write" };
    })
    .addNode("write", async (state) => {
      const result = await writerAgent.invoke({
        outline: state.outline,
        articleType: state.articleType,
        tone: state.tone,
        sources: state.selectedTopic.sources,
        currentSection: 0,
        sections: [],
      });
      return { 
        article: {
          id: "",
          title: state.outline.title,
          content: result.fullArticle,
          outline_id: null,
          slug: "",
          content_html: null,
          excerpt: null,
          industry_id: "",
          article_type: state.articleType,
          status: "draft",
          word_count: null,
          reading_time: null,
          seo_keywords: state.outline.seoKeywords || [],
          published_at: null,
          published_to: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Article,
        stage: "complete" 
      };
    })
    .addEdge("__start__", "research")
    .addEdge("research", "awaitTopicSelection")
    .addConditionalEdges("awaitTopicSelection", (state) => {
      if (state.selectedTopic) return "outline";
      return "awaitTopicSelection"; // wait for selection
    })
    .addEdge("outline", "write");

  return graph.compile({
    checkpointer: new MemorySaver(), // for state persistence
  });
}

// Helper functions (stubs - to be implemented)
function getIndustryKeywords(industry: string): string[] {
  return INDUSTRY_KEYWORDS[industry] || [];
}

async function getExistingTopicTitles(_industry: string): Promise<string[]> {
  // This should query the database for existing topics
  // For now, return empty array
  return [];
}