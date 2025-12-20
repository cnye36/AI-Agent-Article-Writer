/**
 * Utility to parse outline JSON from AI response
 * This is a standalone function that can be safely imported on client or server
 */

export interface ArticleOutline {
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

export function parseOutline(content: string): ArticleOutline {
  // Parse AI response into outline structure
  try {
    // Strip markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|```/g, "").trim();
    
    const parsed = JSON.parse(cleanContent);
    if (parsed.title && parsed.sections) return parsed;
    
    console.warn("[Outline Parser] Parsed JSON missing required fields:", parsed);
    return {
      title: parsed.title || "Untitled",
      hook: parsed.hook || "",
      sections: parsed.sections || [],
      conclusion: parsed.conclusion || { summary: "", callToAction: "" },
      seoKeywords: parsed.seoKeywords || [],
    };
  } catch (e) {
    console.error("[Outline Parser] Failed to parse outline JSON:", e);
    console.error("[Outline Parser] Raw content was:", content);
    return {
      title: "Untitled",
      hook: "",
      sections: [],
      conclusion: { summary: "", callToAction: "" },
      seoKeywords: [],
    };
  }
}

