"use client";

import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

interface TextBubbleMenuProps {
  editor: Editor;
  disabled?: boolean;
  onRewrite: () => void;
  onExpand: () => void;
  onSimplify: () => void;
  onCustom: () => void;
  onGenerateImage: () => void;
}

export function TextBubbleMenu({
  editor,
  disabled = false,
  onRewrite,
  onExpand,
  onSimplify,
  onCustom,
  onGenerateImage,
}: TextBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      shouldShow={({ editor, state }) => {
        if (disabled || editor.isDestroyed) return false;
        // Only show for text selections, not for images
        const { from, to } = state.selection;
        const text = state.doc.textBetween(from, to);
        return text.length > 0 && !editor.isActive("image");
      }}
    >
      <div className="bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 p-1 flex flex-wrap gap-1">
        <button
          onClick={onRewrite}
          className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
        >
          ✨ Rewrite
        </button>
        <button
          onClick={onExpand}
          className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
        >
          📝 Expand
        </button>
        <button
          onClick={onSimplify}
          className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
        >
          🎯 Simplify
        </button>
        <button
          onClick={onCustom}
          className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
        >
          💬 Custom
        </button>
        <button
          onClick={onGenerateImage}
          className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-zinc-800 rounded"
          title="Generate Image from selection"
        >
          🎨 Image
        </button>
      </div>
    </BubbleMenu>
  );
}

