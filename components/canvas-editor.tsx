// components/canvas-editor.tsx
"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { ImageWithRemove } from "@/lib/tiptap-extensions/image-with-remove";
import { useState, useCallback, useEffect, useRef } from "react";
import { markdownToTiptap, tiptapToMarkdown } from "@/lib/markdown";
import { LoadingMark } from "@/lib/tiptap-extensions/loading-mark";
import "@/app/editor-styles.css";
import { FormattingToolbar } from "./canvas-editor/FormattingToolbar";
import { TextBubbleMenu } from "./canvas-editor/TextBubbleMenu";
import { ImageBubbleMenu } from "./canvas-editor/ImageBubbleMenu";
import { ImagePreviewModal } from "./canvas-editor/ImagePreviewModal";
import { AIAssistantPanel } from "./canvas-editor/AIAssistantPanel";

interface CanvasEditorProps {
  initialContent: string;
  articleId: string;
  articleType?: string;
  articleTitle?: string;
  onSave: (content: string) => Promise<void>;
  onPublish?: () => Promise<void>;
  onGenerateCoverImage?: (params?: {
    model?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
    quality?: "low" | "medium" | "high";
  }) => Promise<void>;
  isGeneratingCoverImage?: boolean;
  images?: Array<{
    id: string;
    url: string;
    prompt: string | null;
    is_cover?: boolean;
  }>;
  onSetCoverImage?: (imageId: string) => Promise<void>;
  onDeleteImage?: (imageId: string) => Promise<void>;
  onImagesChange?: () => void;
  onGenerateCoverImageComplete?: () => void;
  imageModel?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
  imageQuality?: "low" | "medium" | "high";
  onImageModelChange?: (model: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini") => void;
  onImageQualityChange?: (quality: "low" | "medium" | "high") => void;
}

export function CanvasEditor({
  initialContent,
  articleId,
  articleType,
  articleTitle,
  onSave,
  onPublish,
  onGenerateCoverImage,
  isGeneratingCoverImage = false,
  images = [],
  onSetCoverImage,
  onDeleteImage,
  onImagesChange,
  onGenerateCoverImageComplete,
  imageModel = "gpt-image-1-mini",
  imageQuality = "high",
  onImageModelChange,
  onImageQualityChange,
}: CanvasEditorProps) {
  const [selectedText, setSelectedText] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(true); // Visible by default on desktop
  const [aiAssistantTab, setAiAssistantTab] = useState<"text" | "image">(
    "text"
  );
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState(initialContent);
  const [isTogglingView, setIsTogglingView] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isRunningEditor, setIsRunningEditor] = useState(false);
  const [editorStreamingContent, setEditorStreamingContent] = useState("");
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
    prompt?: string;
    pos?: number;
  } | null>(null);
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

  // Handle responsive sidebar state - open on desktop, closed on mobile/tablet
  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      setAiPanelOpen(isDesktop);
    };

    // Check on mount
    checkScreenSize();

    // Listen for resize events
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (e: MediaQueryListEvent) => {
      setAiPanelOpen(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Handle Escape key to close image preview modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewImage) {
        setPreviewImage(null);
      }
    };

    if (previewImage) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [previewImage]);

  const editor = useEditor({
    extensions: [
      StarterKit, // Includes markdown shortcuts by default (e.g., **bold**, *italic*, # heading)
      Underline,
      ImageWithRemove.configure({
        HTMLAttributes: {
          class:
            "rounded-lg cursor-move hover:ring-2 hover:ring-blue-500 transition-all max-w-full",
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-blue-500 hover:text-blue-400 underline cursor-pointer",
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
    editorProps: {
      handleDOMEvents: {
        focus: () => {
          setIsEditorFocused(true);
          return false;
        },
        blur: () => {
          setIsEditorFocused(false);
          return false;
        },
      },
      handleClick: (view, pos, event) => {
        const node = view.state.doc.nodeAt(pos);
        if (node && node.type.name === "image") {
          // Open preview modal on click
          setPreviewImage({
            src: node.attrs.src,
            alt: node.attrs.alt,
            prompt: node.attrs.prompt,
            pos: pos,
          });
          return true; // Stop default behavior
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        // Handle image drops from sidebar
        const dataTransfer = event.dataTransfer;
        if (
          dataTransfer &&
          dataTransfer.files &&
          dataTransfer.files.length > 0
        ) {
          // Handle file drops (not needed for our use case, but keep for compatibility)
          return false;
        }

        // Check if image is being dragged from canvas (to sidebar)
        const fromCanvas = dataTransfer?.getData("image/from-canvas");
        if (fromCanvas === "true") {
          // Image is being dragged from canvas - if dropped outside editor, remove it
          // This will be handled by the dragend event
          return false;
        }

        // Check if this is a move operation (dragging content within the editor)
        if (moved) {
          // Check if we're moving an image that already exists in the document
          if (slice && slice.content) {
            let hasImage = false;
            let imageSrc = "";

            // Check if slice contains an image
            slice.content.forEach((node) => {
              if (node.type && node.type.name === "image") {
                hasImage = true;
                imageSrc = node.attrs?.src || "";
              }
              if (node.content) {
                node.content.forEach((child) => {
                  if (child.type && child.type.name === "image") {
                    hasImage = true;
                    imageSrc = child.attrs?.src || "";
                  }
                });
              }
            });

            // If moving an existing image, check if it's already in the document
            if (hasImage && imageSrc && editor) {
              let imageExists = false;
              view.state.doc.descendants((node) => {
                if (
                  node.type.name === "image" &&
                  node.attrs?.src === imageSrc
                ) {
                  imageExists = true;
                  return false; // Stop searching
                }
              });

              // If image exists, let TipTap handle the move (it will move, not duplicate)
              if (imageExists) {
                return false; // Let TipTap handle the move
              }
            }
          }

          // For other move operations, let TipTap handle it
          return false;
        }

        // Handle new image drops from sidebar (only when not moving existing content)
        const imageUrl = dataTransfer?.getData("image/url");
        const imageAlt =
          dataTransfer?.getData("image/alt") || "Generated Image";

        // Fallback: Check if we're dropping an image from our sidebar via HTML
        const imageData = dataTransfer?.getData("text/html");
        let imgSrc = imageUrl;
        let imgAlt = imageAlt;

        if (!imgSrc && imageData && imageData.includes("<img")) {
          // Extract image URL from the HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(imageData, "text/html");
          const img = doc.querySelector("img");
          if (img && img.src) {
            imgSrc = img.src;
            imgAlt = img.alt || "Generated Image";
          }
        }

        if (imgSrc && editor) {
          // Check if this image already exists in the document
          // If it does, this might be a move operation that wasn't caught by the moved flag
          let imageAlreadyExists = false;
          view.state.doc.descendants((node, nodePos) => {
            if (node.type.name === "image" && node.attrs?.src === imgSrc) {
              imageAlreadyExists = true;
              return false; // Stop searching
            }
          });

          // If image already exists, don't insert it again (let TipTap handle it if it's a move)
          if (imageAlreadyExists) {
            return false; // Let TipTap handle it or ignore if it's a duplicate drop
          }

          event.preventDefault();

          // Get drop position
          const coordinates = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (coordinates) {
            const { pos } = coordinates;
            const $pos = view.state.doc.resolve(pos);

            // Find the nearest block node position to avoid splitting text
            // Insert at the end of the current block or start of next block
            let insertPos = pos;

            // If we're in the middle of a text node, move to the end of the paragraph
            if (
              $pos.parent.type.name === "paragraph" &&
              $pos.parent.textContent
            ) {
              insertPos = $pos.after();
            }

            // Insert image with proper spacing (paragraph breaks before and after)
            editor
              .chain()
              .focus()
              .insertContentAt(insertPos, [
                { type: "paragraph", content: [] }, // Empty paragraph before
                {
                  type: "image",
                  attrs: {
                    src: imgSrc,
                    alt: imgAlt,
                  },
                },
                { type: "paragraph", content: [] }, // Empty paragraph after
              ])
              .run();

            // Immediately save content with the new image to ensure it persists
            const markdownWithImage = tiptapToMarkdown(editor.getJSON());
            if (markdownWithImage !== lastSavedContentRef.current) {
              // Clear any pending debounced save
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
              }
              // Save immediately to ensure image is persisted
              onSaveRef.current(markdownWithImage).catch(console.error);
              lastSavedContentRef.current = markdownWithImage;
            }

            return true;
          }
        }

        return false;
      },
    },
  });

  // Handle drag from canvas to sidebar - remove image from canvas when dropped on sidebar
  useEffect(() => {
    if (!editor) return;

    const handleDrop = (e: DragEvent) => {
      const fromCanvas = e.dataTransfer?.getData("image/from-canvas");
      if (fromCanvas !== "true") return;

      const target = e.target as HTMLElement;
      // Check if dropped on sidebar (ImageLibrary area)
      if (
        target.closest(".image-library-container") ||
        target.closest('[class*="ImageLibrary"]') ||
        target.closest('[class*="image-library"]')
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Get stored position from dataTransfer
        const pos = (e.dataTransfer as any)?.canvasImagePos;
        const size = (e.dataTransfer as any)?.canvasImageSize;

        if (pos !== null && pos !== undefined && editor) {
          // Remove image from canvas
          const actualSize =
            size || editor.state.doc.nodeAt(pos)?.nodeSize || 1;
          editor
            .chain()
            .focus()
            .deleteRange({
              from: pos,
              to: pos + actualSize,
            })
            .run();
        }
      }
    };

    document.addEventListener("drop", handleDrop, true);

    return () => {
      document.removeEventListener("drop", handleDrop, true);
    };
  }, [editor]);

  // Update editor content when initialContent changes (e.g., during article generation)
  // CRITICAL: Only update if content is significantly different AND longer to avoid overwriting user edits
  // This prevents images and unsaved changes from being lost when switching tabs
  useEffect(() => {
    if (!editor || !initialContent) return;

    const currentMarkdown = tiptapToMarkdown(editor.getJSON());
    const currentJson = editor.getJSON();
    const newContent = markdownToTiptap(initialContent);
    const newJson = JSON.stringify(newContent);
    const currentJsonString = JSON.stringify(currentJson);

    // Only update if:
    // 1. Content is actually different (JSON comparison)
    // 2. New content is significantly longer (indicates new content, not just a refresh)
    // 3. Current editor is empty or very short (initial load scenario)
    const isSignificantlyDifferent = currentJsonString !== newJson;
    const isNewContentLonger =
      initialContent.length > currentMarkdown.length + 100; // 100 char buffer
    const isEditorEmpty = currentMarkdown.length < 50; // Empty or near-empty editor

    // Don't overwrite if editor has unsaved changes (images, edits) unless it's clearly new content
    if (isSignificantlyDifferent && (isNewContentLonger || isEditorEmpty)) {
      editor.commands.setContent(newContent);
      lastSavedContentRef.current = initialContent;
      if (showMarkdown) {
        setMarkdownContent(initialContent);
      }
    }
  }, [editor, initialContent, showMarkdown]);

  // Sync markdown content when switching to markdown view
  useEffect(() => {
    if (showMarkdown && editor) {
      try {
        const currentMarkdown = tiptapToMarkdown(editor.getJSON());
        setMarkdownContent(currentMarkdown);
      } catch (error) {
        console.error("Error syncing markdown content:", error);
      }
    }
  }, [showMarkdown, editor]);

  // Update editor when switching from markdown to formatted view
  const prevShowMarkdownRef = useRef(showMarkdown);
  useEffect(() => {
    // Only update when transitioning from markdown (true) to formatted (false)
    if (
      prevShowMarkdownRef.current === true &&
      !showMarkdown &&
      editor &&
      markdownContent
    ) {
      // Use a small delay to ensure React has finished rendering and DOM is stable
      const timeoutId = setTimeout(() => {
        try {
          if (editor && !editor.isDestroyed) {
            editor.commands.setContent(markdownToTiptap(markdownContent));
          }
        } catch (error) {
          console.error("Error updating editor from markdown:", error);
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
    prevShowMarkdownRef.current = showMarkdown;
  }, [showMarkdown, editor, markdownContent]);

  // Handle markdown content changes
  const handleMarkdownChange = useCallback(
    (newMarkdown: string) => {
      setMarkdownContent(newMarkdown);
      if (editor) {
        editor.commands.setContent(markdownToTiptap(newMarkdown));
        debouncedSave(newMarkdown);
      }
    },
    [editor, debouncedSave]
  );

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

  const handleToggleMarkdown = useCallback(() => {
    // Prevent rapid toggling
    if (isTogglingView) return;

    setIsTogglingView(true);

    // Switching from formatted -> markdown: snapshot current editor content into textarea.
    if (!showMarkdown && editor && !editor.isDestroyed) {
      try {
        const currentMarkdown = tiptapToMarkdown(editor.getJSON());
        setMarkdownContent(currentMarkdown);
      } catch (error) {
        console.error("Error getting editor content:", error);
      }
    }

    setShowMarkdown((prev) => !prev);

    // Small delay to avoid accidental double-clicks on the toggle.
    setTimeout(() => setIsTogglingView(false), 75);
  }, [showMarkdown, editor, isTogglingView]);

  const handleToggleMobileView = useCallback(() => {
    setIsMobileView((prev) => !prev);
  }, []);

  const handleGenerateImage = useCallback(
    async (params?: {
      prompt?: string;
      sectionContent?: string;
      model?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
      quality?: "low" | "medium" | "high";
    }) => {
      console.log("🚀 handleGenerateImage CALLED with params:", params);
      console.log("🚀 params?.model:", params?.model);

      // If no params provided, try to use selected text (default behavior for selection menu)
      const requestBody = params || { sectionContent: selectedText };

      if (!requestBody.prompt && !requestBody.sectionContent) {
        if (!selectedText) {
          console.log("🚀 Early return: no selectedText");
          return;
        }
        // Fallback for button click without args
        requestBody.sectionContent = selectedText;
      }

      if (!editor) {
        console.log("🚀 Early return: no editor");
        return;
      }

      // Switch to image tab when generating images
      setAiAssistantTab("image");

      // Use separate loading state for image generation
      setIsGeneratingImage(true);

      try {
        // Extract model and quality from params if provided, otherwise use defaults
        // CRITICAL: Always check params.model first, never use requestBody.model as it might be stale
        const model = params?.model || "gpt-image-1-mini";
        const quality = params?.quality || "high";

        console.log("🚀 [Image Gen] Inside try block");
        console.log("🚀 [Image Gen] params object:", params);
        console.log("🚀 [Image Gen] params?.model value:", params?.model);
        console.log(
          "🚀 [Image Gen] Extracted model:",
          model,
          "quality:",
          quality
        );

        // Build request payload - explicitly set model and quality to ensure they're correct
        const requestPayload = {
          prompt: requestBody.prompt,
          sectionContent: requestBody.sectionContent,
          articleId: articleId,
          articleTitle: articleTitle,
          isCover: false,
          model: model, // CRITICAL: Use extracted model, not requestBody.model
          quality: quality, // CRITICAL: Use extracted quality, not requestBody.quality
        };

        console.log(
          "🚀 [Image Gen] Final payload:",
          JSON.stringify(requestPayload, null, 2)
        );
        console.log(
          "🚀 [Image Gen] Final payload model:",
          requestPayload.model
        );
        console.log("🚀 [Image Gen] About to send fetch request...");

        const response = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        console.log(
          "🚀 [Image Gen] Fetch response received, status:",
          response.status
        );

        if (!response.ok) throw new Error("Failed to generate image");

        const data = await response.json();

        if (data.image) {
          // Insert image after selection with proper spacing
          const { to } = editor.state.selection;
          const $pos = editor.state.doc.resolve(to);

          const src = data.image.startsWith("data:")
            ? data.image
            : `data:image/png;base64,${data.image}`;

          // Determine insertion position - move to end of current block if in text
          let insertPos = to;
          if (
            $pos.parent.type.name === "paragraph" &&
            $pos.parent.textContent
          ) {
            insertPos = $pos.after();
          }

          // Insert image with proper spacing (paragraph breaks before and after)
          editor
            .chain()
            .focus()
            .insertContentAt(insertPos, [
              { type: "paragraph", content: [] }, // Empty paragraph before
              {
                type: "image",
                attrs: {
                  src: src,
                  alt: data.prompt || "Generated Image",
                  prompt: data.prompt,
                },
              },
              { type: "paragraph", content: [] }, // Empty paragraph after
            ])
            .run();

          // Immediately save content with the new image to ensure it persists
          // This prevents images from being lost when switching tabs
          const markdownWithImage = tiptapToMarkdown(editor.getJSON());
          if (markdownWithImage !== lastSavedContentRef.current) {
            // Clear any pending debounced save
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            // Save immediately to ensure image is persisted
            onSaveRef.current(markdownWithImage).catch(console.error);
            lastSavedContentRef.current = markdownWithImage;
          }

          // Refresh images list if callback provided
          // Call onImagesChange regardless of data.record to ensure images refresh
          if (onImagesChange) {
            console.log(
              "🖼️ [CanvasEditor] Calling onImagesChange to refresh images"
            );
            onImagesChange();
          }
        }
      } catch (error) {
        console.error("Image generation failed:", error);
        alert("Failed to generate image. Please try again.");
      } finally {
        setIsGeneratingImage(false);
      }
    },

    [
      selectedText,
      editor,
      articleId,
      articleTitle,
      onImagesChange,
      imageModel,
      imageQuality,
    ]
  );

  const handleEditPreviewImage = useCallback(
    async (editPrompt: string, originalPrompt: string, targetPos?: number) => {
      if (!editor) return;

      console.log("[Canvas Editor] Editing preview image:", {
        originalPrompt,
        editPrompt,
        targetPos,
      });
      setIsGeneratingImage(true);

      try {
        const response = await fetch("/api/ai/edit-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: editPrompt,
            originalPrompt: originalPrompt || "A generic image",
            model: imageModel,
            quality: imageQuality,
          }),
        });

        if (!response.ok) throw new Error("Failed to edit image");

        const data = await response.json();

        if (data.image) {
          const imageSrc = data.image.startsWith("data:")
            ? data.image
            : `data:image/png;base64,${data.image}`;

          // Determine node position
          let pos = targetPos;
          if (pos === undefined) {
            const { from } = editor.state.selection;
            pos = from;
          }

          // Verify node is an image
          const node = editor.state.doc.nodeAt(pos);
          if (!node || node.type.name !== "image") {
            console.error("Target node is not an image at pos", pos);
            // Fallback: try to find image by selection? Or just fail safely.
            // If we are in preview mode, we really should rely on passed pos.
          } else {
            // Update image in editor
            editor
              .chain()
              .setNodeSelection(pos)
              .updateAttributes("image", {
                src: imageSrc,
                prompt: data.prompt,
                alt: data.prompt || node.attrs.alt,
              })
              .run();

            // Update preview if open
            setPreviewImage((prev) =>
              prev
                ? {
                    ...prev,
                    src: imageSrc,
                    prompt: data.prompt,
                    alt: data.prompt || prev.alt,
                  }
                : null
            );

            // Force save
            const markdown = tiptapToMarkdown(editor.getJSON());
            debouncedSave(markdown);
          }
        }
      } catch (error) {
        console.error("Failed to edit image:", error);
        alert("Failed to edit image. Please try again.");
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [editor, imageModel, imageQuality, debouncedSave]
  );

  // Handler for editing images from the image library (not in editor)
  const handleEditLibraryImage = useCallback(
    async (imageId: string, newImageData: string, newPrompt: string) => {
      setIsGeneratingImage(true);
      try {
        const response = await fetch(`/api/articles/images`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageId,
            articleId,
            imageData: newImageData,
            prompt: newPrompt,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update image");
        }

        // Refresh images list
        if (onImagesChange) {
          onImagesChange();
        }
      } catch (error) {
        console.error("Failed to edit image:", error);
        alert("Failed to edit image. Please try again.");
        throw error;
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [articleId, onImagesChange]
  );

  // Wrapper for cover image generation that switches to image tab
  const handleGenerateCoverImage = useCallback(
    async (params?: {
      model?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
      quality?: "low" | "medium" | "high";
    }) => {
      // Switch to image tab when generating cover
      setAiAssistantTab("image");
      console.log(
        "🎨 [CanvasEditor] handleGenerateCoverImage called with params:",
        params
      );
      if (onGenerateCoverImage) {
        await onGenerateCoverImage(params);
        // Refresh images after cover image generation
        if (onGenerateCoverImageComplete) {
          await onGenerateCoverImageComplete();
        }
      }
    },
    [onGenerateCoverImage, onGenerateCoverImageComplete]
  );

  const handleRunEditor = useCallback(async () => {
    if (!editor || !articleId) return;

    setIsRunningEditor(true);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Get current content from editor
      const currentContent = tiptapToMarkdown(editor.getJSON());

      // Save current version before editing (for rollback)
      // This is done automatically by the API, but we'll track it here too
      const originalContent = currentContent;

      const response = await fetch("/api/agents/editor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          content: currentContent,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Stream the edited content
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";
      let hasReceivedFirstToken = false;

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

              if (data.type === "token" && data.content) {
                if (!hasReceivedFirstToken) {
                  // Clear editor when first token arrives to show skeleton
                  editor.commands.setContent("");
                  hasReceivedFirstToken = true;
                }

                accumulatedContent += data.content;
                setEditorStreamingContent(accumulatedContent);

                // Update editor in real-time as content streams in
                editor.commands.setContent(
                  markdownToTiptap(accumulatedContent)
                );
              } else if (data.type === "complete") {
                // Final save
                await onSave(accumulatedContent);
                console.log("Article edited successfully by editor agent", {
                  wordCount: data.wordCount,
                  originalWordCount: data.originalWordCount,
                });
              } else if (data.type === "error") {
                throw new Error(data.message || "Editor agent error");
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error running editor agent:", error);

      // Restore original content on error (if we have it)
      if (editor && !(error instanceof Error && error.name === "AbortError")) {
        const currentContent = tiptapToMarkdown(editor.getJSON());
        if (!currentContent || currentContent.trim().length === 0) {
          // If editor was cleared, try to restore from last saved content
          // The API should have saved a version before editing
        }
      }
    } finally {
      setIsRunningEditor(false);
      setEditorStreamingContent("");
    }
  }, [editor, articleId, onSave]);

  return (
    <div className="flex flex-col lg:flex-row h-full relative">
      <div
        className={`flex-1 min-w-0 relative transition-all duration-300 ${
          aiPanelOpen ? "lg:pr-96" : ""
        }`}
      >
        <div className="h-full overflow-y-auto scrollbar-thin">
          {/* Formatting Toolbar - Sticky Header */}
          {editor && (
            <FormattingToolbar
              editor={editor}
              showMarkdown={showMarkdown}
              onToggleMarkdown={handleToggleMarkdown}
              isTogglingView={isTogglingView}
              linkUrl={linkUrl}
              showLinkInput={showLinkInput}
              onLinkUrlChange={setLinkUrl}
              onLinkSubmit={handleLink}
              onLinkCancel={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              isMobileView={isMobileView}
              onToggleMobileView={handleToggleMobileView}
            />
          )}

          {/* Mobile/Tablet AI Assistant Toggle Button - show when panel is closed */}
          {!aiPanelOpen && (
            <button
              onClick={() => setAiPanelOpen(true)}
              className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg"
              aria-label="Open AI Assistant"
            >
              <span className="text-xl">💬</span>
            </button>
          )}

          {/* Editor Content */}
          <div className="px-4 sm:px-6 lg:px-8 pb-12 pt-6">
            <div
              className={`mx-auto transition-all duration-300 ${
                isMobileView ? "max-w-[414px]" : "max-w-3xl"
              }`}
            >
              <div
                className={`relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] ${
                  isMobileView
                    ? "mobile-view-container"
                    : "desktop-view-container"
                } ${
                  !isMobileView && isEditorFocused ? "desktop-view-focused" : ""
                }`}
              >
                {/* Editor Skeleton Overlay - Shows while streaming, fades out as content appears */}
                {isRunningEditor && !editorStreamingContent && (
                  <div className="absolute inset-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm rounded-lg">
                    <div className="p-6 space-y-4 animate-pulse">
                      {/* Skeleton lines */}
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="h-4 bg-slate-200 dark:bg-zinc-800 rounded"
                          style={{
                            width: `${Math.random() * 40 + 60}%`,
                            animationDelay: `${i * 100}ms`,
                          }}
                        />
                      ))}
                      {/* Pulsing indicator */}
                      <div className="flex items-center gap-2 mt-6">
                        <div className="h-2 w-2 bg-purple-600 rounded-full animate-pulse" />
                        <span className="text-sm text-slate-600 dark:text-zinc-400">
                          Editor agent is refining your content...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Keep TipTap mounted to avoid DOM teardown races (BubbleMenu/Tippy + ProseMirror) */}
                <div className={showMarkdown ? "hidden" : ""}>
                  <EditorContent
                    editor={editor}
                    className="editor-content min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]"
                  />
                </div>

                <textarea
                  value={markdownContent}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  className={`w-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-lg p-4 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    showMarkdown ? "" : "hidden"
                  }`}
                  placeholder="Write your markdown here..."
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* Floating AI Menu on Text Selection */}
          {editor && (
            <TextBubbleMenu
              editor={editor}
              disabled={showMarkdown}
              onRewrite={() => handleAiEdit("rewrite")}
              onExpand={() => handleAiEdit("expand")}
              onSimplify={() => handleAiEdit("simplify")}
              onCustom={() => setAiPanelOpen(true)}
              onGenerateImage={() => handleGenerateImage()}
            />
          )}

          {/* Image Menu - Shows when image is selected */}
          {editor && <ImageBubbleMenu editor={editor} />}
        </div>
      </div>

      {/* AI Assistant Panel - Mobile/Tablet: Drawer from right, Desktop: Fixed Sidebar */}
      <div
        className={`fixed top-0 right-0 bottom-0 lg:top-[160px] lg:bottom-0 z-50 transition-transform duration-300 ${
          aiPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className={`w-full sm:w-80 lg:w-96 h-full border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden`}
        >
          <AIAssistantPanel
            selectedText={selectedText}
            onApply={handleAiEdit}
            isLoading={isLoading}
            completion={completion}
            onClose={() => setAiPanelOpen(false)}
            onGenerateImage={handleGenerateImage}
            onGenerateCover={handleGenerateCoverImage}
            isGeneratingCoverImage={isGeneratingCoverImage}
            images={images}
            onSetCoverImage={onSetCoverImage}
            onDeleteImage={onDeleteImage}
            isGeneratingImage={isGeneratingImage}
            activeTab={aiAssistantTab}
            onTabChange={setAiAssistantTab}
            onRunEditor={handleRunEditor}
            isRunningEditor={isRunningEditor}
            articleId={articleId}
            imageModel={imageModel}
            imageQuality={imageQuality}
            onImageModelChange={onImageModelChange}
            onImageQualityChange={onImageQualityChange}
            onEditImage={handleEditLibraryImage}
          />
        </div>
      </div>

      {/* Mobile/Tablet overlay backdrop */}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          src={previewImage.src}
          alt={previewImage.alt}
          prompt={previewImage.prompt}
          onClose={() => setPreviewImage(null)}
          onEdit={(prompt) =>
            handleEditPreviewImage(
              prompt,
              previewImage.prompt || previewImage.alt,
              previewImage.pos
            )
          }
          isEditing={isGeneratingImage}
        />
      )}
    </div>
  );
}