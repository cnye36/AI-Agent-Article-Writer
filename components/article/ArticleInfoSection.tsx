"use client";

import type { Article, ArticleStatus } from "@/types";

interface ArticleInfoSectionProps {
  article: Article;
  onUpdate: (updates: Partial<Article>) => void;
}

export function ArticleInfoSection({
  article,
  onUpdate,
}: ArticleInfoSectionProps) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Article Information</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Title</label>
          <input
            type="text"
            value={article.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">/articles/</span>
            <input
              type="text"
              value={article.slug}
              readOnly
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Excerpt</label>
          <textarea
            value={article.excerpt || ""}
            onChange={(e) => onUpdate({ excerpt: e.target.value })}
            placeholder="Brief description for SEO and previews..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 h-24"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Status</label>
          <select
            value={article.status}
            onChange={(e) =>
              onUpdate({ status: e.target.value as ArticleStatus })
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
          >
            <option value="draft">Draft</option>
            <option value="review">In Review</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
    </section>
  );
}

