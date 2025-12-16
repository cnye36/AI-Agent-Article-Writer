// components/canvas-editor.tsx
"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useState, useCallback, useEffect, useRef } from "react";
import { markdownToTiptap, tiptapToMarkdown } from "@/lib/markdown";
import { LoadingMark } from "@/lib/tiptap-extensions/loading-mark";
import "@/app/editor-styles.css";

interface CanvasEditorProps {
  initialContent: string;
  articleId: string;
  articleType?: string;
  onSave: (content: string) => Promise<void>;
  onPublish?: () => Promise<void>;
}

export function CanvasEditor({
  initialContent,
  articleId,
  articleType,
  onSave,
  onPublish,
}: CanvasEditorProps) {
  const [selectedText, setSelectedText] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(true); // Visible by default on desktop
  const [aiAction, setAiAction] = useState<
    "rewrite" | "expand" | "simplify" | "custom"
  >("rewrite");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [editingRange, setEditingRange] = useState<{
    from: number;
    to: number;
    originalText: string;
  } | null>(null);

  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refs for debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(initialContent);
  const onSaveRef = useRef(onSave);

  // Keep onSave ref updated
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Debounced save function that persists across renders
  const debouncedSave = useCallback((markdown: string) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if content actually changed
    if (markdown === lastSavedContentRef.current) {
      return;
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSaveRef.current(markdown);
        lastSavedContentRef.current = markdown;
      } catch (error) {
        console.error("Failed to save:", error);
      }
    }, 3000); // 3 second debounce - only save after user stops typing for 3 seconds
  }, []);

  // Cleanup timeout and abort controller on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit, // Includes markdown shortcuts by default (e.g., **bold**, *italic*, # heading)
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-500 hover:text-blue-400 underline",
        },
      }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      LoadingMark, // Custom mark for AI loading state
    ],
    content: markdownToTiptap(initialContent),
    immediatelyRender: false, // Fix SSR hydration issue
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);
      setSelectedText(text);
      setShowLinkInput(false);
    },
    onUpdate: ({ editor }) => {
      // Auto-save with debounce - only if content changed
      const markdown = tiptapToMarkdown(editor.getJSON());
      if (markdown !== lastSavedContentRef.current) {
        debouncedSave(markdown);
      }
    },
  });

  // Update editor content when initialContent changes (e.g., during article generation)
  useEffect(() => {
    if (!editor || !initialContent) return;

    const currentContent = tiptapToMarkdown(editor.getJSON());
    // Only update if the new content is different and longer (to avoid overwriting with partial content)
    // This allows the editor to update during streaming without overwriting user edits
    if (
      initialContent !== currentContent &&
      initialContent.length > currentContent.length
    ) {
      editor.commands.setContent(markdownToTiptap(initialContent));
      lastSavedContentRef.current = initialContent;
    }
  }, [editor, initialContent]);

  // Handle save on unmount - save immediately if there are unsaved changes
  useEffect(() => {
    return () => {
      if (editor) {
        // Clear any pending debounced save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Save immediately if content changed
        const markdown = tiptapToMarkdown(editor.getJSON());
        if (markdown !== lastSavedContentRef.current) {
          onSaveRef.current(markdown).catch(console.error);
        }
      }
    };
  }, [editor]);

  const handleAiEdit = useCallback(
    async (action: string, customPrompt?: string) => {
      if (!selectedText || !editor) {
        console.log("[Canvas Editor] No text selected or no editor");
        return;
      }

      console.log(`[Canvas Editor] Starting AI edit: ${action}`);
      console.log(
        `[Canvas Editor] Selected text: "${selectedText.substring(0, 50)}..."`
      );

      // Store the current selection range and original text
      const { from, to } = editor.state.selection;
      const originalText = selectedText;

      // Clear previous completion
      setCompletion("");

      // Keep the original text visible and apply loading mark to make it pulse
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setMark("loading") // Apply our custom loading mark to the selected text
        .setTextSelection(to) // Move cursor to end to deselect
        .run();

      // Store the range with the original text
      setEditingRange({
        from,
        to,
        originalText,
      });

      // Build prompt - our API will parse the action from the prompt
      const text = originalText;
      const prompt = customPrompt || `${action}: ${text}`;

      console.log(
        `[Canvas Editor] Sending prompt: "${prompt.substring(0, 100)}..."`
      );

      // Start streaming completion from OpenAI
      try {
        console.log("[Canvas Editor] Starting stream with prompt:", {
          promptLength: prompt.length,
          promptPreview: prompt.substring(0, 150),
        });

        // Cancel any existing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoading(true);
        setCompletion("");

        const response = await fetch("/api/ai/edit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          setCompletion(accumulatedText);
        }

        console.log("[Canvas Editor] Stream completed:", {
          completionLength: accumulatedText.length,
        });
        setIsLoading(false);
      } catch (error) {
        console.error("[Canvas Editor] Error during completion:", error);
        setIsLoading(false);

        // Remove loading mark and restore original text on error
        if (
          editor &&
          !(error instanceof Error && error.name === "AbortError")
        ) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .unsetMark("loading")
            .setTextSelection(to)
            .run();
          setEditingRange(null);
        }
      }
    },
    [selectedText, editor]
  );

  // Log completion changes for debugging
  useEffect(() => {
    if (completion) {
      console.log("[Canvas Editor] Completion updated:", {
        length: completion.length,
        preview: completion.substring(0, 100),
        isLoading,
        hasEditingRange: !!editingRange,
      });
    }
  }, [completion, isLoading, editingRange]);

  // Update editor with AI completion when done
  useEffect(() => {
    if (!editor || !editingRange) return;

    // Only replace when loading is complete AND we have completion text
    if (isLoading) {
      console.log("[Canvas Editor] Still loading, waiting for completion...");
      return;
    }

    if (!completion || completion.trim().length === 0) {
      console.log("[Canvas Editor] No completion text yet, waiting...");
      return;
    }

    console.log("[Canvas Editor] Replacing original text with AI completion", {
      completionLength: completion.length,
      editingRange,
    });

    const { from, to } = editingRange;

    // Verify the range is still valid
    const doc = editor.state.doc;
    const docSize = doc.content.size;

    // Ensure the range is still valid
    const safeFrom = Math.min(from, docSize);
    const safeTo = Math.min(to, docSize);

    if (safeFrom < safeTo) {
      // Remove the loading mark and replace the original text with completion
      editor
        .chain()
        .focus()
        .setTextSelection({ from: safeFrom, to: safeTo })
        .unsetMark("loading") // Remove loading mark first
        .deleteRange({ from: safeFrom, to: safeTo })
        .insertContentAt(safeFrom, completion.trim())
        .setTextSelection(safeFrom + completion.trim().length) // Move cursor to end of new content
        .run();

      console.log(
        "[Canvas Editor] Successfully replaced text with AI completion",
        {
          replacedLength: safeTo - safeFrom,
          newLength: completion.trim().length,
        }
      );
    } else {
      console.warn(
        "[Canvas Editor] Invalid range, appending completion at position:",
        safeFrom
      );
      // If range is invalid, just insert at the from position
      editor.chain().focus().insertContentAt(safeFrom, completion.trim()).run();
    }

    // Clear the editing range after successful replacement (async to avoid cascading renders)
    setTimeout(() => {
      setEditingRange(null);
      setCompletion(""); // Clear completion for next edit
    }, 0);
  }, [completion, isLoading, editingRange, editor]);

  const handleLink = useCallback(() => {
    if (!editor) return;

    if (showLinkInput && linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl, target: "_blank" }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    } else {
      setShowLinkInput(true);
    }
  }, [editor, showLinkInput, linkUrl]);

  return (
    <div className="flex flex-col lg:flex-row h-full relative">
      <div
        className={`flex-1 overflow-y-auto min-w-0 relative transition-all duration-300 ${
          aiPanelOpen ? "lg:pr-96" : ""
        }`}
      >
        {/* Formatting Toolbar - Sticky Header */}
        {editor && (
          <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
            <div className="max-w-3xl mx-auto">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 flex items-center gap-1 flex-wrap shadow-sm">
                {/* History */}
                <div className="flex items-center gap-1 border-r border-zinc-700 pr-2 mr-1">
                  <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-400 hover:text-white"
                    title="Undo (Ctrl+Z)"
                  >
                    ↩
                  </button>
                  <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-400 hover:text-white"
                    title="Redo (Ctrl+Y)"
                  >
                    ↪
                  </button>
                </div>

                {/* Headings */}
                <div className="flex items-center gap-1 border-r border-zinc-700 pr-2 mr-1">
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`px-2 py-1.5 text-xs font-bold rounded hover:bg-zinc-800 ${
                      editor.isActive("heading", { level: 1 }) ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`px-2 py-1.5 text-xs font-bold rounded hover:bg-zinc-800 ${
                      editor.isActive("heading", { level: 2 }) ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`px-2 py-1.5 text-xs font-bold rounded hover:bg-zinc-800 ${
                      editor.isActive("heading", { level: 3 }) ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Heading 3"
                  >
                    H3
                  </button>
                </div>

                {/* Text Style */}
                <div className="flex items-center gap-1 border-r border-zinc-700 pr-2 mr-1">
                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("bold") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Bold (Ctrl+B)"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("italic") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Italic (Ctrl+I)"
                  >
                    <em>I</em>
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("underline") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Underline (Ctrl+U)"
                  >
                    <u>U</u>
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("strike") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Strikethrough"
                  >
                    <span className="line-through">S</span>
                  </button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-1 border-r border-zinc-700 pr-2 mr-1">
                  <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("bulletList") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Bullet List"
                  >
                    •
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("orderedList") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Ordered List"
                  >
                    1.
                  </button>
                </div>

                {/* Other */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("blockquote") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Blockquote"
                  >
                    ”
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 font-mono ${
                      editor.isActive("codeBlock") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Code Block"
                  >
                    {`</>`}
                  </button>
                  <button
                    onClick={handleLink}
                    className={`px-2.5 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                      editor.isActive("link") ? "bg-zinc-700 text-white" : "text-zinc-400"
                    }`}
                    title="Link (Ctrl+K)"
                  >
                    🔗
                  </button>
                </div>

                {showLinkInput && (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-700">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="Enter URL..."
                      className="w-40 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLink();
                        } else if (e.key === "Escape") {
                          setShowLinkInput(false);
                          setLinkUrl("");
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleLink}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowLinkInput(false);
                        setLinkUrl("");
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile AI Assistant Toggle Button */}
        <button
          onClick={() => setAiPanelOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg"
          aria-label="Open AI Assistant"
        >
          <span className="text-xl">💬</span>
        </button>

        {/* Editor Content */}
        <div className="px-4 sm:px-6 lg:px-8 pb-12 pt-6">
          <div className="max-w-3xl mx-auto">
            <EditorContent
              editor={editor}
              className="editor-content min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] focus:outline-none"
            />
          </div>
        </div>

        {/* Floating AI Menu on Selection */}
        {editor && (
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 p-1 flex flex-wrap gap-1">
              <button
                onClick={() => handleAiEdit("rewrite")}
                className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
              >
                ✨ Rewrite
              </button>
              <button
                onClick={() => handleAiEdit("expand")}
                className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
              >
                📝 Expand
              </button>
              <button
                onClick={() => handleAiEdit("simplify")}
                className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
              >
                🎯 Simplify
              </button>
              <button
                onClick={() => setAiPanelOpen(true)}
                className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
              >
                💬 Custom
              </button>
            </div>
          </BubbleMenu>
        )}
      </div>

      {/* AI Assistant Panel - Mobile: Overlay, Desktop: Fixed Sidebar */}
      <div
        className={`fixed inset-0 lg:top-[64px] lg:bottom-0 lg:right-0 lg:left-auto z-50 transition-transform duration-300 ${
          aiPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className={`w-full sm:w-80 lg:w-96 h-full border-l border-zinc-800 bg-zinc-950 flex flex-col`}
        >
          <AIAssistantPanel
            selectedText={selectedText}
            onApply={handleAiEdit}
            isLoading={isLoading}
            completion={completion}
            onClose={() => setAiPanelOpen(false)}
          />
        </div>
      </div>

      {/* Mobile overlay backdrop */}
      {aiPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setAiPanelOpen(false)}
        />
      )}

      {/* Toggle button for desktop - show when panel is closed */}
      {!aiPanelOpen && (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 shadow-lg"
          aria-label="Open AI Assistant"
        >
          <span className="text-lg">💬</span>
        </button>
      )}
    </div>
  );
}

interface AIAssistantPanelProps {
  selectedText: string;
  onApply: (action: string, customPrompt?: string) => void;
  isLoading: boolean;
  completion: string;
  onClose: () => void;
}

function AIAssistantPanel({
  selectedText,
  onApply,
  isLoading,
  completion,
  onClose,
}: AIAssistantPanelProps) {
  const [customPrompt, setCustomPrompt] = useState("");

  const suggestions = [
    {
      label: "Make more engaging",
      prompt: "Rewrite to be more engaging and captivating",
    },
    {
      label: "Add statistics",
      prompt: "Expand with relevant statistics and data",
    },
    { label: "Fix grammar", prompt: "Fix any grammar or spelling issues" },
    {
      label: "Change tone to casual",
      prompt: "Rewrite in a casual, conversational tone",
    },
    {
      label: "Make more technical",
      prompt: "Add more technical depth and precision",
    },
    {
      label: "Shorten",
      prompt: "Make this more concise while keeping key points",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="font-semibold text-sm sm:text-base">AI Assistant</h3>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white text-lg sm:text-xl"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Selected Text Preview */}
        {selectedText && (
          <div className="bg-zinc-900 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-zinc-500 mb-2">Selected text:</p>
            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-4">
              {selectedText}
            </p>
          </div>
        )}

        {/* Quick Suggestions */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Quick actions:</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => onApply("custom", s.prompt)}
                disabled={!selectedText || isLoading}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-full disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Custom instruction:</p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="E.g., 'Rewrite this paragraph to focus more on the business implications...'"
            className="w-full h-20 sm:h-24 bg-zinc-900 rounded-lg p-2 sm:p-3 text-xs sm:text-sm resize-none"
          />
          <button
            onClick={() => onApply("custom", customPrompt)}
            disabled={!selectedText || !customPrompt || isLoading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Apply"}
          </button>
        </div>

        {/* AI Response Preview */}
        {completion && (
          <div className="bg-zinc-900 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-zinc-500 mb-2">Preview:</p>
            <p className="text-xs sm:text-sm text-zinc-300">{completion}</p>
          </div>
        )}
      </div>
    </div>
  );
}