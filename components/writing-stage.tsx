"use client";

import type { Article } from "@/types";

interface WritingStageProps {
  article: Article | null;
  isLoading: boolean;
  onComplete: () => void;
}

export function WritingStage({ article, isLoading, onComplete }: WritingStageProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-zinc-400">Writing article...</p>
        <p className="text-zinc-500 text-sm mt-2">This may take a few minutes</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Article not available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Article Generated</h2>
      </div>

      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <h3 className="text-2xl font-bold mb-4">{article.title}</h3>
        
        {article.excerpt && (
          <p className="text-zinc-300 mb-6">{article.excerpt}</p>
        )}

        <div className="prose prose-invert max-w-none">
          <div 
            className="text-zinc-300 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: article.content_html || article.content }}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between text-sm text-zinc-500">
          <div className="flex gap-4">
            {article.word_count && <span>{article.word_count} words</span>}
            {article.reading_time && <span>{article.reading_time} min read</span>}
          </div>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium"
      >
        Continue to Editor →
      </button>
    </div>
  );
}

