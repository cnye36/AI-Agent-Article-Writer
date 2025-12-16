import { ChatOpenAI } from "@langchain/openai";
import type { Topic, Source } from "@/types";

interface BrainstormInput {
  industry: string;
  keywords?: string[];
  articleType?: string;
  targetAudience?: string;
  contentGoals?: string[];
  avoidTopics?: string[]; // Previously used topics to avoid duplicates
  count?: number;
}

interface BrainstormOutput {
  topics: Array<{
    title: string;
    angle: string;
    summary: string;
    seoValue: number;
    uniquenessScore: number;
    targetKeywords: string[];
    estimatedSearchVolume: "low" | "medium" | "high";
    contentType: string;
    hooks: string[];
  }>;
}

/**
 * Brainstorm Agent - Generates creative, SEO-optimized article topic ideas
 * using AI reasoning rather than web search
 */
export async function createBrainstormAgent() {
  const model = new ChatOpenAI({
    modelName: "gpt-5.2",
    reasoningEffort: "medium",
  });

  return {
    invoke: async (input: BrainstormInput): Promise<BrainstormOutput> => {
      const {
        industry,
        keywords = [],
        articleType = "blog",
        targetAudience = "general audience",
        contentGoals = ["educate", "engage"],
        avoidTopics = [],
        count = 5,
      } = input;

      // Build a comprehensive prompt for creative brainstorming
      const prompt = buildBrainstormPrompt({
        industry,
        keywords,
        articleType,
        targetAudience,
        contentGoals,
        avoidTopics,
        count,
      });

      const response = await model.invoke(prompt);
      const content = response.content as string;

      // Parse the structured response
      const topics = parseTopicsFromResponse(content, industry);

      return {
        topics: topics.slice(0, count),
      };
    },
  };
}

function buildBrainstormPrompt(params: BrainstormInput): string {
  const {
    industry,
    keywords,
    articleType,
    targetAudience,
    contentGoals,
    avoidTopics,
    count,
  } = params;

  return `You are an expert content strategist and SEO specialist. Generate ${count} unique, compelling article topic ideas for the ${industry} industry.

**Requirements:**
- Article Type: ${articleType}
- Target Audience: ${targetAudience}
${contentGoals && contentGoals.length > 0 ? `- Content Goals: ${contentGoals.join(", ")}` : ""}
${keywords && keywords.length > 0 ? `- Focus Keywords: ${keywords.join(", ")}` : ""}
${avoidTopics && avoidTopics.length > 0 ? `- AVOID these topics (already covered): ${avoidTopics.join(", ")}` : ""}

**For each topic, provide:**

1. **Title**: A compelling, SEO-friendly title (60-70 characters)
2. **Angle**: The unique perspective or approach (what makes this different)
3. **Summary**: 2-3 sentence overview of the article's value proposition
4. **SEO Value**: Score 1-10 based on search potential and competitiveness
5. **Uniqueness Score**: Score 1-10 based on how original/fresh the angle is
6. **Target Keywords**: 3-5 primary keywords this article would rank for
7. **Estimated Search Volume**: low/medium/high
8. **Content Type**: listicle/how-to/analysis/case-study/opinion/comparison/etc.
9. **Hooks**: 3 compelling opening hooks that could grab attention

**Guidelines:**
- Prioritize topics with high SEO value AND uniqueness (not just trending topics)
- Think about what the audience actually needs vs what's already out there
- Consider evergreen topics that will remain relevant
- Look for gaps in existing content (contrarian takes, unexplored angles)
- Focus on actionable, practical content over purely theoretical
- Consider current industry trends but avoid being too reactive

**Output Format:**
Return ONLY a valid JSON array with this structure:

\`\`\`json
[
  {
    "title": "How to...",
    "angle": "Unlike typical guides, this focuses on...",
    "summary": "This article will...",
    "seoValue": 8,
    "uniquenessScore": 7,
    "targetKeywords": ["keyword1", "keyword2", "keyword3"],
    "estimatedSearchVolume": "medium",
    "contentType": "how-to",
    "hooks": [
      "Did you know that...",
      "Most people think... but the reality is...",
      "What if I told you..."
    ]
  }
]
\`\`\`

Generate ${count} diverse, high-quality topic ideas now:`;
}

function parseTopicsFromResponse(
  content: string,
  industry: string
): BrainstormOutput["topics"] {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonStr.trim());

    if (!Array.isArray(parsed)) {
      throw new Error("Expected array of topics");
    }

    return parsed.map((topic: any) => ({
      title: topic.title || "Untitled",
      angle: topic.angle || "",
      summary: topic.summary || "",
      seoValue: Math.min(10, Math.max(1, topic.seoValue || 5)),
      uniquenessScore: Math.min(10, Math.max(1, topic.uniquenessScore || 5)),
      targetKeywords: Array.isArray(topic.targetKeywords)
        ? topic.targetKeywords.slice(0, 5)
        : [],
      estimatedSearchVolume:
        topic.estimatedSearchVolume === "low" ||
        topic.estimatedSearchVolume === "medium" ||
        topic.estimatedSearchVolume === "high"
          ? topic.estimatedSearchVolume
          : "medium",
      contentType: topic.contentType || "blog",
      hooks: Array.isArray(topic.hooks) ? topic.hooks.slice(0, 3) : [],
    }));
  } catch (error) {
    console.error("Error parsing brainstorm response:", error);
    console.error("Raw content:", content);

    // Fallback: try to extract topics manually
    return extractTopicsManually(content, industry);
  }
}

function extractTopicsManually(
  content: string,
  industry: string
): BrainstormOutput["topics"] {
  // Fallback parser for when JSON parsing fails
  const topics: BrainstormOutput["topics"] = [];

  // Try to find title patterns
  const titleMatches = content.match(/(?:title|Topic)[:\s]+["']?([^"\n]+)["']?/gi);

  if (titleMatches) {
    titleMatches.forEach((match, index) => {
      const titleMatch = match.match(/["']?([^"'\n]+)["']?$/);
      const title = titleMatch ? titleMatch[1].trim() : `Generated Topic ${index + 1}`;

      topics.push({
        title,
        angle: "AI-generated unique perspective",
        summary: `Exploring ${title.toLowerCase()} in the context of ${industry}`,
        seoValue: 7,
        uniquenessScore: 8,
        targetKeywords: extractKeywords(title),
        estimatedSearchVolume: "medium",
        contentType: "blog",
        hooks: [
          `Discover how ${title.toLowerCase()}`,
          `What you need to know about ${title.toLowerCase()}`,
          `The ultimate guide to ${title.toLowerCase()}`,
        ],
      });
    });
  }

  // If we still have no topics, generate at least one
  if (topics.length === 0) {
    topics.push({
      title: `Innovative Strategies for ${industry.charAt(0).toUpperCase() + industry.slice(1)}`,
      angle: "Fresh perspective on industry best practices",
      summary: `A comprehensive guide to modern approaches in ${industry}`,
      seoValue: 7,
      uniquenessScore: 7,
      targetKeywords: [industry, "strategies", "guide"],
      estimatedSearchVolume: "medium",
      contentType: "guide",
      hooks: [
        `The ${industry} landscape is changing rapidly...`,
        `Are you keeping up with the latest in ${industry}?`,
        `Here's what top ${industry} experts won't tell you...`,
      ],
    });
  }

  return topics;
}

function extractKeywords(title: string): string[] {
  // Extract meaningful keywords from title
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "how",
    "what",
    "why",
    "when",
    "where",
  ]);

  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}

/**
 * Convert brainstorm topics to standard Topic format for database storage
 */
export function convertBrainstormToTopics(
  brainstormTopics: BrainstormOutput["topics"],
  industryId: string
): Omit<Topic, "id" | "discovered_at">[] {
  return brainstormTopics.map((bt) => ({
    title: bt.title,
    summary: bt.summary,
    industry_id: industryId,
    sources: bt.hooks.map((hook, index) => ({
      url: `brainstorm://hook-${index}`,
      title: hook,
      snippet: bt.angle,
    })) as Source[],
    relevance_score:
      (bt.seoValue * 0.6 + bt.uniquenessScore * 0.4) / 10, // Combined score
    status: "pending" as const,
    metadata: {
      angle: bt.angle,
      seoValue: bt.seoValue,
      uniquenessScore: bt.uniquenessScore,
      targetKeywords: bt.targetKeywords,
      estimatedSearchVolume: bt.estimatedSearchVolume,
      contentType: bt.contentType,
      hooks: bt.hooks,
      generatedBy: "brainstorm-agent",
    },
  }));
}
