"use client";

import { useState, useCallback } from "react";
import { getClient } from "@/lib/supabase/client";
import type {
  Topic,
  Outline,
  Article,
  GenerationStage,
  GenerationConfig,
  OutlineStructure,
  LinkOpportunity,
} from "@/types";

interface UseArticleGenerationReturn {
  // State
  stage: GenerationStage;
  config: GenerationConfig;
  topics: Topic[];
  selectedTopic: Topic | null;
  outline: Outline | null;
  article: Article | null;
  isLoading: boolean;
  error: string | null;
  researchMetadata: {
    duplicatesFiltered?: number;
    duplicates?: Array<{
      title: string;
      similarTo?: string;
      similarity?: number;
    }>;
  } | null;
  linkSuggestions: LinkOpportunity[];
  targetSiteId: string | null;

  // Actions
  setConfig: (config: Partial<GenerationConfig>) => void;
  startResearch: (config: GenerationConfig) => Promise<void>;
  selectTopic: (topic: Topic) => Promise<void>;
  rejectTopic: (topicId: string) => Promise<void>;
  generateOutline: () => Promise<void>;
  approveOutline: (targetSiteId?: string) => Promise<void>;
  editOutline: (structure: OutlineStructure) => void;
  generateArticle: () => Promise<void>;
  reset: () => void;
  goToStage: (stage: GenerationStage) => void;
  selectDifferentTopic: () => void;
  handleSaveSelected: (savedTopics: Topic[]) => void;
  applyLinks: (selectedIds: string[]) => Promise<void>;
  skipLinking: () => void;
}

const initialConfig: GenerationConfig = {
  industry: "",
  articleType: "blog",
  targetLength: "medium",
  tone: "professional",
  topicMode: "discover",
};

export function useArticleGeneration(): UseArticleGenerationReturn {
  const [stage, setStage] = useState<GenerationStage>("config");
  const [config, setConfigState] = useState<GenerationConfig>(initialConfig);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researchMetadata, setResearchMetadata] = useState<{
    duplicatesFiltered?: number;
    duplicates?: Array<{
      title: string;
      similarTo?: string;
      similarity?: number;
    }>;
  } | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<LinkOpportunity[]>([]);
  const [targetSiteId, setTargetSiteId] = useState<string | null>(null);

  const supabase = getClient();

  const setConfig = useCallback((updates: Partial<GenerationConfig>) => {
    setConfigState((prev) => ({ ...prev, ...updates }));
  }, []);

  const startResearch = useCallback(
    async (cfg: GenerationConfig) => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = "/api/agents/research";

        const parseCommaList = (value: string): string[] =>
          value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        const effectiveKeywords =
          cfg.topicMode === "direct"
            ? cfg.topicQuery?.trim()
              ? parseCommaList(cfg.topicQuery)
              : cfg.customInstructions?.trim()
              ? // Fallback: use first line of the brief as a seed query
                [cfg.customInstructions.split("\n")[0]!.trim()].filter(Boolean)
              : cfg.keywords
            : cfg.keywords;

        const requestBody = {
          ...(cfg.industry && cfg.industry.trim()
            ? { industry: cfg.industry }
            : {}),
          ...(effectiveKeywords && effectiveKeywords.length > 0
            ? { keywords: effectiveKeywords }
            : {}),
          ...(cfg.articleType ? { articleType: cfg.articleType } : {}),
          // For "direct" mode we want a single best-fit topic backed by sources
          maxTopics: cfg.topicMode === "direct" ? 1 : 5,
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to research topics");
        }

        const data = await response.json();
        setTopics(data.topics);
        setConfigState(cfg);
        setResearchMetadata(data.metadata || null);
        setStage("topics");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Handle saving selected topics
  const handleSaveSelected = useCallback((savedTopics: Topic[]) => {
    // Create a map of saved topics by their title (since IDs change from temp to real)
    const savedTopicsByTitle = new Map(
      savedTopics.map((t) => [t.title, t])
    );
    
    // Update topics list: replace temporary topics with saved ones, keep unsaved ones
    setTopics((prevTopics) => {
      return prevTopics.map((topic) => {
        // If this topic was saved (matches by title), replace with saved version
        const savedTopic = savedTopicsByTitle.get(topic.title);
        if (savedTopic) {
          return savedTopic;
        }
        // Otherwise keep the original (unsaved) topic
        return topic;
      });
    });
  }, []);

  const selectTopic = useCallback(
    async (topic: Topic) => {
      if (!topic || !topic.id) {
        setError("Invalid topic selected. Please try again.");
        console.error(
          "Topic selection error: topic or topic.id is missing",
          topic
        );
        return;
      }

      // Check if topic has a temporary ID (from failed database save)
      if (topic.id.startsWith("temp-")) {
        setError(
          "This topic could not be saved to the database. Please try finding topics again."
        );
        console.error("Topic has temporary ID, cannot proceed:", topic);
        return;
      }

      setSelectedTopic(topic);
      setIsLoading(true);
      setError(null);

      try {
        // Use streaming endpoint for outline generation
        const response = await fetch("/api/agents/outline", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: topic.id,
            articleType: config.articleType,
            targetLength: config.targetLength,
            tone: config.tone,
            customInstructions: config.customInstructions,
            wordCount: config.wordCount,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate outline (${response.status})`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let outlineId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const event = JSON.parse(data);

                if (event.type === "outline_created" && event.outlineId) {
                  outlineId = event.outlineId;
                  // Fetch the initial outline placeholder
                  const outlineResponse = await fetch(
                    `/api/agents/outline?id=${outlineId}`
                  );
                  if (outlineResponse.ok) {
                    const outlineData = await outlineResponse.json();
                    if (outlineData.outline) {
                      setOutline(outlineData.outline);
                      setStage("outline");
                      // Stop loading spinner - streaming UI will take over
                      setIsLoading(false);
                    }
                  }
                } else if (
                  event.type === "progress" &&
                  event.outline &&
                  outlineId
                ) {
                  // Update outline structure as progress comes in
                  setOutline((prev) =>
                    prev
                      ? {
                          ...prev,
                          structure: event.outline,
                        }
                      : null
                  );
                } else if (event.type === "complete" && event.outline) {
                  setOutline(event.outline);
                  setIsLoading(false);
                  setStage("outline");
                  return;
                } else if (event.type === "error") {
                  throw new Error(
                    event.message || "Failed to generate outline"
                  );
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError);
              }
            }
          }
        }

        // If we have an outlineId, ensure we have the outline
        if (outlineId) {
          const outlineResponse = await fetch(
            `/api/agents/outline?id=${outlineId}`
          );
          if (outlineResponse.ok) {
            const outlineData = await outlineResponse.json();
            if (outlineData.outline) {
              setOutline(outlineData.outline);
              setStage("outline");
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        console.error("Error selecting topic:", err);
        setIsLoading(false);
      }
    },
    [config]
  );

  const rejectTopic = useCallback(
    async (topicId: string) => {
      try {
        // Use type assertion to work around Supabase type inference issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topicsTable = supabase.from("topics") as any;
        const { error } = await topicsTable
          .update({ status: "rejected" })
          .eq("id", topicId);

        if (!error) {
          setTopics((prev) => prev.filter((t) => t.id !== topicId));
        }
      } catch (err) {
        console.error("Failed to reject topic:", err);
      }
    },
    [supabase]
  );

  const generateOutline = useCallback(async () => {
    if (!selectedTopic) {
      setError("No topic selected");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use streaming PUT endpoint for better UX
      const response = await fetch("/api/agents/outline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopic.id,
          articleType: config.articleType,
          targetLength: config.targetLength,
          tone: config.tone,
          customInstructions: config.customInstructions,
          wordCount: config.wordCount,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate outline");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let outlineId: string | null = null;
      let latestOutline: OutlineStructure | null = null;
      let accumulatedOutlineText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "outline_created") {
                outlineId = data.outlineId;
              } else if (data.type === "token") {
                // Accumulate tokens for streaming outline text
                accumulatedOutlineText += data.content || "";
                // Try to parse periodically (every 100 chars or so) to update UI
                // But don't fail if JSON is incomplete
                if (accumulatedOutlineText.length % 100 === 0) {
                  try {
                    const { parseOutline } = await import("@/lib/utils/outline-parser");
                    const parsed = parseOutline(accumulatedOutlineText);
                    if (parsed && parsed.title && parsed.sections) {
                      latestOutline = parsed;
                      // Update outline state with partial outline for real-time display
                      if (outlineId) {
                        setOutline({
                          id: outlineId,
                          structure: parsed,
                          topic_id: selectedTopic.id,
                          article_type: config.articleType,
                          target_length: config.targetLength,
                          tone: config.tone,
                          approved: false,
                          created_at: new Date().toISOString(),
                        });
                        setStage("outline");
                      }
                    }
                  } catch (e) {
                    // JSON incomplete, that's fine - will parse when complete
                  }
                }
              } else if (data.type === "progress") {
                // Update progress - could show in UI if needed
                if (data.outline) {
                  latestOutline = data.outline;
                  if (outlineId) {
                    setOutline({
                      id: outlineId,
                      structure: data.outline,
                      topic_id: selectedTopic.id,
                      article_type: config.articleType,
                      target_length: config.targetLength,
                      tone: config.tone,
                      approved: false,
                      created_at: new Date().toISOString(),
                    });
                    setStage("outline");
                  }
                }
              } else if (data.type === "complete") {
                if (data.outline) {
                  latestOutline = data.outline;
                }
              } else if (data.type === "error") {
                throw new Error(data.message || "Outline generation failed");
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }

      // Parse final accumulated text if we have it
      if (accumulatedOutlineText && !latestOutline) {
        try {
          const { parseOutline } = await import("@/lib/utils/outline-parser");
          const parsed = parseOutline(accumulatedOutlineText);
          if (parsed && parsed.title) {
            latestOutline = parsed;
          }
        } catch (e) {
          console.error("Error parsing final outline:", e);
        }
      }

      // Fetch final outline if we have an ID
      if (outlineId) {
        const outlineResponse = await fetch(
          `/api/agents/outline?id=${outlineId}`
        );
        if (outlineResponse.ok) {
          const outlineData = await outlineResponse.json();
          if (outlineData.outline) {
            setOutline(outlineData.outline);
            setStage("outline");
          }
        }
      } else if (latestOutline && outlineId) {
        // Create Outline object from structure
        const outline: Outline = {
          id: outlineId,
          structure: latestOutline,
          topic_id: selectedTopic.id,
          article_type: config.articleType,
          target_length: config.targetLength,
          tone: config.tone,
          approved: false,
          created_at: new Date().toISOString(),
        };
        setOutline(outline);
        setStage("outline");
      } else {
        throw new Error("No outline received");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTopic, config]);

  const approveOutline = useCallback(
    async (siteId?: string) => {
      if (!outline) {
        setError("No outline to approve");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Approve the outline
        const approveResponse = await fetch("/api/agents/outline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlineId: outline.id,
            approved: true,
          }),
        });

        if (!approveResponse.ok) {
          throw new Error("Failed to approve outline");
        }

        // Start writing - article will be saved to DB automatically
        setStage("content");

        const writeResponse = await fetch("/api/agents/writer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlineId: outline.id,
            targetSiteId: siteId || undefined,
          }),
        });

        if (!writeResponse.ok) {
          const data = await writeResponse.json();
          throw new Error(data.error || "Failed to generate article");
        }

        const data = await writeResponse.json();
        setArticle(data.article);

        // Check if link suggestions exist in article metadata
        const metadata = data.article?.metadata as { linkSuggestions?: LinkOpportunity[]; targetSiteId?: string } | null;
        if (metadata?.linkSuggestions && metadata.linkSuggestions.length > 0) {
          setLinkSuggestions(metadata.linkSuggestions);
          setTargetSiteId(metadata.targetSiteId || null);
          setStage("linking"); // Show link review UI
        } else {
          setStage("content"); // No suggestions - skip to editor
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setStage("outline"); // Go back to outline on error
      } finally {
        setIsLoading(false);
      }
    },
    [outline]
  );

  const editOutline = useCallback(
    (structure: OutlineStructure) => {
      if (!outline) return;
      setOutline({
        ...outline,
        structure,
      });
    },
    [outline]
  );

  const generateArticle = useCallback(
    async () => {
      if (!outline) {
        setError("No outline available");
        return;
      }

      setIsLoading(true);
      setError(null);
      setStage("content");

      try {
        const response = await fetch("/api/agents/writer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlineId: outline.id,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate article");
        }

        const data = await response.json();
        setArticle(data.article);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [outline]
  );

  const reset = useCallback(() => {
    setStage("config");
    setConfigState(initialConfig);
    setTopics([]);
    setSelectedTopic(null);
    setOutline(null);
    setArticle(null);
    setError(null);
  }, []);

  const goToStage = useCallback((newStage: GenerationStage) => {
    // Allow navigation to any stage
    setStage(newStage);
    setError(null);

    // If going back to topics, clear downstream state
    if (newStage === "topics") {
      setSelectedTopic(null);
      setOutline(null);
      setArticle(null);
    }

    // If going back to outline, clear article
    if (newStage === "outline") {
      setArticle(null);
    }
  }, []);

  // Allow selecting a different topic
  const selectDifferentTopic = useCallback(() => {
    setSelectedTopic(null);
    setOutline(null);
    setArticle(null);
    setStage("topics");
    setError(null);
  }, []);

  const applyLinks = useCallback(
    async (selectedIds: string[]) => {
      if (!article) {
        setError("No article to apply links to");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/articles/intelligent-links", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: article.id,
            selectedLinkIds: selectedIds,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to apply links");
        }

        const data = await response.json();
        setArticle(data.article);
        setLinkSuggestions([]);
        setTargetSiteId(null);
        setStage("content"); // Proceed to editor
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [article]
  );

  const skipLinking = useCallback(() => {
    setLinkSuggestions([]);
    setTargetSiteId(null);
    setStage("content");
  }, []);

  return {
    stage,
    config,
    topics,
    selectedTopic,
    outline,
    article,
    isLoading,
    error,
    researchMetadata,
    linkSuggestions,
    targetSiteId,
    setConfig,
    startResearch,
    selectTopic,
    rejectTopic,
    generateOutline,
    approveOutline,
    editOutline,
    generateArticle,
    reset,
    goToStage,
    selectDifferentTopic,
    handleSaveSelected,
    applyLinks,
    skipLinking,
  };
}

// Hook for fetching existing articles
export function useArticles(filters?: {
  industryId?: string;
  status?: string;
  articleType?: string;
  limit?: number;
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: filters?.limit || 20,
    offset: 0,
    hasMore: false,
  });

  const fetchArticles = useCallback(async (offset = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.industryId) params.set("industryId", filters.industryId);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.articleType) params.set("articleType", filters.articleType);
      params.set("limit", String(filters?.limit || 20));
      params.set("offset", String(offset));

      const response = await fetch(`/api/articles?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch articles");
      }

      const data = await response.json();
      
      if (offset === 0) {
        setArticles(data.articles);
      } else {
        setArticles((prev) => [...prev, ...data.articles]);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !isLoading) {
      fetchArticles(pagination.offset + pagination.limit);
    }
  }, [pagination, isLoading, fetchArticles]);

  const refresh = useCallback(() => {
    fetchArticles(0);
  }, [fetchArticles]);

  return {
    articles,
    isLoading,
    error,
    pagination,
    fetchArticles,
    loadMore,
    refresh,
  };
}

// Hook for single article operations
export function useArticle(articleId: string | null) {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticle = useCallback(async () => {
    if (!articleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/articles?id=${articleId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch article");
      }

      const data = await response.json();
      setArticle(data.article);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  const updateArticle = useCallback(async (updates: Partial<Article>) => {
    if (!articleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: articleId,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update article");
      }

      const data = await response.json();
      setArticle(data.article);
      return data.article;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  const deleteArticle = useCallback(async () => {
    if (!articleId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/articles?id=${articleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete article");
      }

      setArticle(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  return {
    article,
    isLoading,
    error,
    fetchArticle,
    updateArticle,
    deleteArticle,
  };
}