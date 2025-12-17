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
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">SEO Keywords</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {article.seo_keywords.map((keyword, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-zinc-800 rounded-full text-sm flex items-center gap-2"
          >
            {keyword}
            <button
              onClick={() => {
                const newKeywords = article.seo_keywords.filter(
                  (_, i) => i !== index
                );
                onUpdate({ seo_keywords: newKeywords });
              }}
              className="text-zinc-500 hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Add keyword and press Enter..."
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
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

