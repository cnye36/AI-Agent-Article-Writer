// components/canvas-editor.tsx
"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback, useEffect, useRef } from "react";
import { useCompletion } from "ai/react";
import { markdownToTiptap, tiptapToMarkdown } from "@/lib/markdown";
import "@/app/editor-styles.css";

interface CanvasEditorProps {
  initialContent: string;
  articleId: string;
  articleType?: string;
  onSave: (content: string) => Promise<void>;
  onPublish?: () => Promise<void>;
}

export function CanvasEditor({ initialContent, articleId, articleType, onSave, onPublish }: CanvasEditorProps) {
  const [selectedText, setSelectedText] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(true); // Visible by default on desktop
  const [aiAction, setAiAction] = useState<
    "rewrite" | "expand" | "simplify" | "custom"
  >("rewrite");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const { complete, completion, isLoading } = useCompletion({
    api: "/api/ai/edit",
  });

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit, // Includes markdown shortcuts by default (e.g., **bold**, *italic*, # heading)
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-500 hover:text-blue-400 underline",
        },
      }),
      Placeholder.configure({ placeholder: "Start writing..." }),
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
      if (!selectedText || !editor) return;

      const prompt = customPrompt || getPromptForAction(action, selectedText);
      const result = await complete(prompt);

      if (result) {
        const { from, to } = editor.state.selection;
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(result)
          .run();
      }
    },
    [selectedText, editor, complete]
  );

  const handleBold = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  }, [editor]);

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

  const handleHeading = useCallback(
    (level: 1 | 2 | 3) => {
      if (!editor) return;
      if (editor.isActive("heading", { level })) {
        editor.chain().focus().setParagraph().run();
      } else {
        editor.chain().focus().toggleHeading({ level }).run();
      }
    },
    [editor]
  );

  const isBold = editor?.isActive("bold") || false;
  const isLink = editor?.isActive("link") || false;
  const isH1 = editor?.isActive("heading", { level: 1 }) || false;
  const isH2 = editor?.isActive("heading", { level: 2 }) || false;
  const isH3 = editor?.isActive("heading", { level: 3 }) || false;

  return (
    <div className="flex flex-col lg:flex-row h-full relative">
      {/* Main Editor */}
      <div
        className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0 relative transition-all duration-300 ${
          aiPanelOpen ? "lg:pr-96" : ""
        }`}
      >
        {/* Formatting Toolbar */}
        {editor && (
          <div className="sticky top-0 z-10 mb-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg p-2 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 border-r border-zinc-700 pr-2 mr-1">
              <button
                onClick={() => handleHeading(1)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded hover:bg-zinc-800 ${
                  isH1 ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
                title="Heading 1"
              >
                H1
              </button>
              <button
                onClick={() => handleHeading(2)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded hover:bg-zinc-800 ${
                  isH2 ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
                title="Heading 2"
              >
                H2
              </button>
              <button
                onClick={() => handleHeading(3)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded hover:bg-zinc-800 ${
                  isH3 ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
                title="Heading 3"
              >
                H3
              </button>
            </div>
            <button
              onClick={handleBold}
              className={`px-3 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                isBold ? "bg-zinc-700 text-white" : "text-zinc-400"
              }`}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={handleLink}
              className={`px-3 py-1.5 text-sm rounded hover:bg-zinc-800 ${
                isLink ? "bg-zinc-700 text-white" : "text-zinc-400"
              }`}
              title="Link (Ctrl+K)"
            >
              🔗
            </button>
            {showLinkInput && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Enter URL..."
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowLinkInput(false);
                    setLinkUrl("");
                  }}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile AI Assistant Toggle Button */}
        <button
          onClick={() => setAiPanelOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-30 p-3 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg"
          aria-label="Open AI Assistant"
        >
          <span className="text-xl">💬</span>
        </button>

        <div className="max-w-3xl mx-auto">
          <EditorContent
            editor={editor}
            className="editor-content min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] focus:outline-none"
          />
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

function AIAssistantPanel({ selectedText, onApply, isLoading, completion, onClose }: AIAssistantPanelProps) {
  const [customPrompt, setCustomPrompt] = useState("");

  const suggestions = [
    { label: "Make more engaging", prompt: "Rewrite to be more engaging and captivating" },
    { label: "Add statistics", prompt: "Expand with relevant statistics and data" },
    { label: "Fix grammar", prompt: "Fix any grammar or spelling issues" },
    { label: "Change tone to casual", prompt: "Rewrite in a casual, conversational tone" },
    { label: "Make more technical", prompt: "Add more technical depth and precision" },
    { label: "Shorten", prompt: "Make this more concise while keeping key points" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="font-semibold text-sm sm:text-base">AI Assistant</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-lg sm:text-xl">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Selected Text Preview */}
        {selectedText && (
          <div className="bg-zinc-900 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-zinc-500 mb-2">Selected text:</p>
            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-4">{selectedText}</p>
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

function getPromptForAction(action: string, text: string): string {
  const prompts: Record<string, string> = {
    rewrite: `Rewrite this text to improve clarity and engagement while maintaining the same meaning:\n\n${text}`,
    expand: `Expand this text with more detail, examples, or supporting information:\n\n${text}`,
    simplify: `Simplify this text to be more accessible and easier to understand:\n\n${text}`,
  };
  return prompts[action] || text;
}