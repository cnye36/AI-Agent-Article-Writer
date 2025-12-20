"use client";

import type { Editor } from "@tiptap/react";

interface FormattingToolbarProps {
  editor: Editor;
  showMarkdown: boolean;
  onToggleMarkdown: () => void;
  isTogglingView?: boolean;
  linkUrl: string;
  showLinkInput: boolean;
  onLinkUrlChange: (url: string) => void;
  onLinkSubmit: () => void;
  onLinkCancel: () => void;
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
}

export function FormattingToolbar({
  editor,
  showMarkdown,
  onToggleMarkdown,
  isTogglingView = false,
  linkUrl,
  showLinkInput,
  onLinkUrlChange,
  onLinkSubmit,
  onLinkCancel,
  isMobileView = false,
  onToggleMobileView,
}: FormattingToolbarProps) {
  return (
    <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/50">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 flex items-center gap-1 flex-wrap shadow-sm">
          {/* View Toggles */}
          <div className="flex items-center gap-1 border-r border-slate-300 dark:border-zinc-700 pr-2 mr-1">
            <button
              onClick={onToggleMarkdown}
              disabled={isTogglingView}
              className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                showMarkdown ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white" : "text-slate-600 dark:text-zinc-400"
              }`}
              title={
                showMarkdown
                  ? "Switch to formatted view"
                  : "Switch to markdown view"
              }
            >
              {showMarkdown ? "📝 Formatted" : "📄 Markdown"}
            </button>
            {!showMarkdown && onToggleMobileView && (
              <button
                onClick={onToggleMobileView}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  isMobileView ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white" : "text-slate-600 dark:text-zinc-400"
                }`}
                title={
                  isMobileView
                    ? "Switch to desktop view"
                    : "Switch to mobile view"
                }
              >
                {isMobileView ? "🖥️ Desktop" : "📱 Mobile"}
              </button>
            )}
          </div>

          {/* History */}
          {!showMarkdown && (
            <div className="flex items-center gap-1 border-r border-slate-300 dark:border-zinc-700 pr-2 mr-1">
              <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                title="Undo (Ctrl+Z)"
              >
                ↩
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                title="Redo (Ctrl+Y)"
              >
                ↪
              </button>
            </div>
          )}

          {/* Headings */}
          {!showMarkdown && (
            <div className="flex items-center gap-1 border-r border-slate-300 dark:border-zinc-700 pr-2 mr-1">
              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                className={`px-2 py-1.5 text-xs font-bold rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("heading", { level: 1 })
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Heading 1"
              >
                H1
              </button>
              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                className={`px-2 py-1.5 text-xs font-bold rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("heading", { level: 2 })
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Heading 2"
              >
                H2
              </button>
              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                className={`px-2 py-1.5 text-xs font-bold rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("heading", { level: 3 })
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Heading 3"
              >
                H3
              </button>
            </div>
          )}

          {/* Text Style */}
          {!showMarkdown && (
            <div className="flex items-center gap-1 border-r border-slate-300 dark:border-zinc-700 pr-2 mr-1">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("bold")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Bold (Ctrl+B)"
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("italic")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Italic (Ctrl+I)"
              >
                <em>I</em>
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("underline")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Underline (Ctrl+U)"
              >
                <u>U</u>
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("strike")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Strikethrough"
              >
                <span className="line-through">S</span>
              </button>
            </div>
          )}

          {/* Lists */}
          {!showMarkdown && (
            <div className="flex items-center gap-1 border-r border-slate-300 dark:border-zinc-700 pr-2 mr-1">
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("bulletList")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Bullet List"
              >
                •
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("orderedList")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Ordered List"
              >
                1.
              </button>
            </div>
          )}

          {/* Other */}
          {!showMarkdown && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("blockquote")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Blockquote"
              >
                &quot;
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 font-mono ${
                  editor.isActive("codeBlock")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Code Block"
              >
                {`</>`}
              </button>
              <button
                onClick={onLinkSubmit}
                className={`px-2.5 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  editor.isActive("link")
                    ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
                title="Link (Ctrl+K)"
              >
                🔗
              </button>
            </div>
          )}

          {showLinkInput && !showMarkdown && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-300 dark:border-zinc-700">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => onLinkUrlChange(e.target.value)}
                placeholder="Enter URL..."
                className="w-40 px-2 py-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onLinkSubmit();
                  } else if (e.key === "Escape") {
                    onLinkCancel();
                  }
                }}
                autoFocus
              />
              <button
                onClick={onLinkSubmit}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
              >
                Add
              </button>
              <button
                onClick={onLinkCancel}
                className="px-2 py-1 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 rounded text-xs text-slate-900 dark:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

