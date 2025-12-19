"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn, getStatusConfig, getArticleTypeLabel, formatRelativeTime, copyToClipboard, removeFirstH1FromMarkdown } from "@/lib/utils";
import type { Article } from "@/types";

interface ArticleHeaderProps {
  article: Article;
  activeTab: "edit" | "settings";
  onTabChange: (tab: "edit" | "settings") => void;
  onPublish: () => void;
  onExport: (format: "md" | "pdf" | "txt") => void;
}

export function ArticleHeader({
  article,
  activeTab,
  onTabChange,
  onPublish,
  onExport,
}: ArticleHeaderProps) {
  const router = useRouter();
  const statusConfig = getStatusConfig(article.status);
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard?tab=library")}
          className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
        >
          ← Back to Articles
        </button>
        <div>
          <h1 className="font-semibold truncate max-w-md text-slate-900 dark:text-white">
            {article.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-500">
            <span
              className={cn("px-2 py-0.5 rounded-full", statusConfig.color)}
            >
              {statusConfig.label}
            </span>
            <span>•</span>
            <span>{getArticleTypeLabel(article.article_type)}</span>
            <span>•</span>
            <span>{article.word_count || 0} words</span>
            <span>•</span>
            <span>Updated {formatRelativeTime(article.updated_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 rounded-lg p-1 mr-4">
          {(["edit", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                activeTab === tab
                  ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Actions */}
        {article.status !== "published" && (
          <button
            onClick={onPublish}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
          >
            Publish
          </button>
        )}

        <div
          className="relative"
          onMouseEnter={() => setIsExportOpen(true)}
          onMouseLeave={() => setIsExportOpen(false)}
        >
          <button className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white">
            Export ▾
          </button>
          {isExportOpen && (
            <div className="absolute right-0 top-full pt-1 z-[60]">
              <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    onExport("md");
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-sm text-left text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700"
                >
                  Markdown
                </button>
                <button
                  onClick={() => {
                    onExport("pdf");
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-sm text-left text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700"
                >
                  PDF
                </button>
                <button
                  onClick={() => {
                    onExport("txt");
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-sm text-left text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700"
                >
                  Plain Text
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() =>
            copyToClipboard(removeFirstH1FromMarkdown(article.content))
          }
          className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white"
          title="Copy to clipboard"
        >
          📋
        </button>
      </div>
    </header>
  );
}

