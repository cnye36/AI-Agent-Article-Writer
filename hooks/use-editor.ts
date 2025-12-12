"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { EditAction, ArticleType } from "@/types";
import { debounce } from "@/lib/utils";

interface UseEditorReturn {
  // Selection state
  selectedText: string;
  selectionRange: { from: number; to: number } | null;

  // AI editing
  isAiLoading: boolean;
  aiResult: string | null;
  aiError: string | null;

  // Actions
  handleSelectionChange: (editor: Editor) => void;
  applyAiEdit: (action: EditAction, customPrompt?: string) => Promise<void>;
  applyResult: () => void;
  discardResult: () => void;

  // Version history
  versions: VersionInfo[];
  saveVersion: (content: string, summary?: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;

  // Auto-save
  enableAutoSave: (editor: Editor, onSave: (content: string) => Promise<void>) => void;
  disableAutoSave: () => void;
}

interface VersionInfo {
  id: string;
  editedBy: "user" | "ai";
  changeSummary: string | null;
  createdAt: string;
}

interface UseEditorOptions {
  articleId: string;
  articleType?: ArticleType;
  tone?: string;
  autoSaveInterval?: number; // ms
}

export function useEditor(options: UseEditorOptions): UseEditorReturn {
  const { articleId, articleType, tone, autoSaveInterval = 30000 } = options;

  // Selection state
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);

  // AI editing state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Version history
  const [versions, setVersions] = useState<VersionInfo[]>([]);

  // Refs for auto-save
  const editorRef = useRef<Editor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Handle selection changes in editor
  const handleSelectionChange = useCallback((editor: Editor) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    
    setSelectedText(text);
    setSelectionRange(text ? { from, to } : null);
    
    // Clear previous AI result when selection changes
    if (text !== selectedText) {
      setAiResult(null);
      setAiError(null);
    }
  }, [selectedText]);

  // Apply AI edit to selected text
  const applyAiEdit = useCallback(async (
    action: EditAction,
    customPrompt?: string
  ) => {
    if (!selectedText || !selectionRange) {
      setAiError("No text selected");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      // Get surrounding context
      const editor = editorRef.current;
      let beforeText = "";
      let afterText = "";

      if (editor) {
        const docText = editor.state.doc.textContent;
        const contextLength = 100;
        
        beforeText = docText.substring(
          Math.max(0, selectionRange.from - contextLength),
          selectionRange.from
        );
        afterText = docText.substring(
          selectionRange.to,
          Math.min(docText.length, selectionRange.to + contextLength)
        );
      }

      const response = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText,
          action,
          customPrompt,
          context: {
            beforeText,
            afterText,
            articleType,
            tone,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process edit");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setAiResult(result);
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAiLoading(false);
    }
  }, [selectedText, selectionRange, articleType, tone]);

  // Apply the AI result to the editor
  const applyResult = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !aiResult || !selectionRange) return;

    editor
      .chain()
      .focus()
      .deleteRange(selectionRange)
      .insertContent(aiResult)
      .run();

    setAiResult(null);
    setSelectedText("");
    setSelectionRange(null);
  }, [aiResult, selectionRange]);

  // Discard the AI result
  const discardResult = useCallback(() => {
    setAiResult(null);
    setAiError(null);
  }, []);

  // Fetch version history
  const fetchVersions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/articles/versions?articleId=${articleId}&limit=10`
      );

      if (response.ok) {
        const data = await response.json();
        setVersions(
          data.versions.map((v: { id: string; edited_by: string; change_summary: string | null; created_at: string }) => ({
            id: v.id,
            editedBy: v.edited_by,
            changeSummary: v.change_summary,
            createdAt: v.created_at,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err);
    }
  }, [articleId]);

  // Save a new version
  const saveVersion = useCallback(async (
    content: string,
    summary?: string
  ) => {
    try {
      await fetch("/api/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: articleId,
          content,
          saveVersion: true,
          editedBy: "user",
          changeSummary: summary || "Manual save",
        }),
      });

      lastSavedContentRef.current = content;
      await fetchVersions();
    } catch (err) {
      console.error("Failed to save version:", err);
    }
  }, [articleId, fetchVersions]);

  // Restore a previous version
  const restoreVersion = useCallback(async (versionId: string) => {
    try {
      const response = await fetch("/api/articles/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          versionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to restore version");
      }

      const data = await response.json();
      
      // Update editor content
      const editor = editorRef.current;
      if (editor && data.article?.content) {
        editor.commands.setContent(data.article.content);
        lastSavedContentRef.current = data.article.content;
      }

      await fetchVersions();
    } catch (err) {
      console.error("Failed to restore version:", err);
    }
  }, [articleId, fetchVersions]);

  // Auto-save functionality
  const enableAutoSave = useCallback((
    editor: Editor,
    onSave: (content: string) => Promise<void>
  ) => {
    editorRef.current = editor;
    lastSavedContentRef.current = editor.getHTML();

    // Debounced save function
    const debouncedSave = debounce(async () => {
      const currentContent = editor.getHTML();
      
      if (currentContent !== lastSavedContentRef.current) {
        try {
          await onSave(currentContent);
          lastSavedContentRef.current = currentContent;
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      }
    }, autoSaveInterval);

    // Listen for content changes
    editor.on("update", debouncedSave);

    // Also set up periodic saves
    autoSaveTimerRef.current = setInterval(async () => {
      const currentContent = editor.getHTML();
      
      if (currentContent !== lastSavedContentRef.current) {
        try {
          await onSave(currentContent);
          lastSavedContentRef.current = currentContent;
        } catch (err) {
          console.error("Periodic save failed:", err);
        }
      }
    }, autoSaveInterval);

    return () => {
      editor.off("update", debouncedSave);
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveInterval]);

  const disableAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // Fetch versions on mount
  useEffect(() => {
    if (articleId) {
      fetchVersions();
    }
  }, [articleId, fetchVersions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableAutoSave();
    };
  }, [disableAutoSave]);

  return {
    selectedText,
    selectionRange,
    isAiLoading,
    aiResult,
    aiError,
    handleSelectionChange,
    applyAiEdit,
    applyResult,
    discardResult,
    versions,
    saveVersion,
    restoreVersion,
    enableAutoSave,
    disableAutoSave,
  };
}

// Hook for link suggestions
import type { LinkSuggestion } from "@/types";

export function useLinkSuggestions(articleId: string) {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestionsForSelection = useCallback(async (selectedText: string) => {
    if (!selectedText || selectedText.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/articles/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest",
          articleId,
          selectedText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to get link suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  const getAllSuggestions = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/articles/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          maxSuggestions: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to get all link suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  const createLink = useCallback(async (
    targetArticleId: string,
    anchorText: string,
    context?: string
  ) => {
    try {
      const response = await fetch("/api/articles/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceArticleId: articleId,
          targetArticleId,
          anchorText,
          context,
        }),
      });

      return response.ok;
    } catch (err) {
      console.error("Failed to create link:", err);
      return false;
    }
  }, [articleId]);

  return {
    suggestions,
    isLoading,
    getSuggestionsForSelection,
    getAllSuggestions,
    createLink,
  };
}