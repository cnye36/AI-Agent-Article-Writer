"use client";

import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

interface ImageBubbleMenuProps {
  editor: Editor;
  disabled?: boolean;
}

export function ImageBubbleMenu({ editor, disabled = false }: ImageBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      shouldShow={({ editor }) =>
        !disabled && !editor.isDestroyed && editor.isActive("image")
      }
    >
      <div className="bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 p-1 flex gap-1">
        <button
          onClick={() => editor.chain().focus().deleteSelection().run()}
          className="px-3 py-1.5 text-sm hover:bg-red-900 bg-red-900/50 text-red-200 rounded flex items-center gap-1"
          title="Remove from canvas"
        >
          ✕ Remove
        </button>
      </div>
    </BubbleMenu>
  );
}

