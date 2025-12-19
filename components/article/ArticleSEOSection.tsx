"use client";

import type { Article } from "@/types";

interface ArticleSEOSectionProps {
  article: Article;
  onUpdate: (updates: Partial<Article>) => void;
}

export function ArticleSEOSection({
  article,
  onUpdate,
}: ArticleSEOSectionProps) {
  return (
    <section className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">SEO Keywords</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {article.seo_keywords.map((keyword, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 rounded-full text-sm flex items-center gap-2 text-slate-900 dark:text-white"
          >
            {keyword}
            <button
              onClick={() => {
                const newKeywords = article.seo_keywords.filter(
                  (_, i) => i !== index
                );
                onUpdate({ seo_keywords: newKeywords });
              }}
              className="text-slate-500 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Add keyword and press Enter..."
        className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const input = e.target as HTMLInputElement;
            const keyword = input.value.trim();
            if (keyword && !article.seo_keywords.includes(keyword)) {
              onUpdate({
                seo_keywords: [...article.seo_keywords, keyword],
              });
              input.value = "";
            }
          }
        }}
      />
    </section>
  );
}

