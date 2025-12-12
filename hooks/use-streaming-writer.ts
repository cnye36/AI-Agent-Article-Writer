"use client";

import { useState, useCallback, useRef } from "react";
import type { Article } from "@/types";

export interface StreamingProgress {
  stage: "hook" | "section" | "conclusion" | "saving" | "complete";
  message: string;
  progress: number; // 0-100
  section?: number;
  total?: number;
  sectionTitle?: string;
}

export interface StreamingContent {
  hook: string;
  sections: string[];
  conclusion: string;
  currentSection: number;
}

interface UseStreamingWriterReturn {
  isStreaming: boolean;
  progress: StreamingProgress | null;
  content: StreamingContent;
  article: Article | null;
  error: string | null;
  startStreaming: (outlineId: string) => Promise<void>;
  cancelStreaming: () => void;
  reset: () => void;
}

export function useStreamingWriter(): UseStreamingWriterReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<StreamingProgress | null>(null);
  const [content, setContent] = useState<StreamingContent>({
    hook: "",
    sections: [],
    conclusion: "",
    currentSection: -1,
  });
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSectionRef = useRef<number>(-1);

  const startStreaming = useCallback(async (outlineId: string) => {
    setIsStreaming(true);
    setError(null);
    setProgress(null);
    setContent({
      hook: "",
      sections: [],
      conclusion: "",
      currentSection: -1,
    });
    setArticle(null);
    currentSectionRef.current = -1;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/agents/writer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineId }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case "progress":
                  setProgress({
                    stage: event.stage,
                    message: event.message,
                    progress: event.progress || 0,
                    section: event.section,
                    total: event.total,
                    sectionTitle: event.sectionTitle,
                  });

                  // Initialize new section when switching sections
                  if (event.stage === "section" && event.section !== currentSectionRef.current) {
                    currentSectionRef.current = event.section || 0;
                    setContent((prev) => {
                      const newSections = [...prev.sections];
                      newSections[currentSectionRef.current - 1] = "";
                      return {
                        ...prev,
                        sections: newSections,
                        currentSection: currentSectionRef.current - 1,
                      };
                    });
                  }
                  break;

                case "token":
                  // Append token to the appropriate part of content
                  if (event.stage === "hook") {
                    setContent((prev) => ({
                      ...prev,
                      hook: prev.hook + event.content,
                    }));
                  } else if (event.stage === "section") {
                    setContent((prev) => {
                      const newSections = [...prev.sections];
                      const index = prev.currentSection;
                      if (index >= 0) {
                        newSections[index] = (newSections[index] || "") + event.content;
                      }
                      return {
                        ...prev,
                        sections: newSections,
                      };
                    });
                  } else if (event.stage === "conclusion") {
                    setContent((prev) => ({
                      ...prev,
                      conclusion: prev.conclusion + event.content,
                    }));
                  }
                  break;

                case "complete":
                  setArticle(event.article);
                  setProgress({
                    stage: "complete",
                    message: "Article complete!",
                    progress: 100,
                  });
                  setIsStreaming(false);
                  break;

                case "error":
                  setError(event.message || "Unknown error occurred");
                  setIsStreaming(false);
                  break;

                case "warning":
                  console.warn("Streaming warning:", event.message);
                  break;

                default:
                  console.log("Unknown event type:", event.type);
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError, data);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Article generation was cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate article");
      }
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setError("Generation cancelled by user");
  }, []);

  const reset = useCallback(() => {
    setIsStreaming(false);
    setProgress(null);
    setContent({
      hook: "",
      sections: [],
      conclusion: "",
      currentSection: -1,
    });
    setArticle(null);
    setError(null);
    currentSectionRef.current = -1;
  }, []);

  return {
    isStreaming,
    progress,
    content,
    article,
    error,
    startStreaming,
    cancelStreaming,
    reset,
  };
}
