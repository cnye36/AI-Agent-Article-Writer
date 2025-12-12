"use client";

import type { Article } from "@/types";
import { CanvasEditor } from "./canvas-editor";

interface ContentStageProps {
  article: Article | null;
  isLoading: boolean;
  onBack: () => void;
}

export function ContentStage({ article, isLoading, onBack }: ContentStageProps) {
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
        <p className="text-zinc-400 mb-4">Article not available.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Article Editor</h2>
        <button
          onClick={onBack}
          className="px-3 sm:px-4 py-2 text-sm sm:text-base text-zinc-400 hover:text-white whitespace-nowrap"
        >
          ← Back to Outline
        </button>
      </div>

      <div className="w-full">
        <CanvasEditor
          initialContent={article.content}
          articleId={article.id}
          onSave={async (content: string) => {
            // Article is already saved, this is just for updates
            console.log("Updating article:", content);
          }}
        />
      </div>
    </div>
  );
}

