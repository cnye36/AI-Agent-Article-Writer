"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { StreamingProgress, StreamingContent } from "@/hooks/use-streaming-writer";
import type { Article } from "@/types";

interface StreamingContentStageProps {
  progress: StreamingProgress | null;
  content: StreamingContent;
  article: Article | null;
  error: string | null;
  onCancel: () => void;
}

export function StreamingContentStage({
  progress,
  content,
  article,
  error,
  onCancel,
}: StreamingContentStageProps) {
  const router = useRouter();

  // Redirect to editor when complete
  useEffect(() => {
    if (article && article.id && progress?.stage === "complete") {
      // Small delay to show completion message
      const timer = setTimeout(() => {
        router.push(`/article/${article.id}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [article, progress, router]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-6 bg-red-500/10 border border-red-500/50 rounded-xl">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Error</h3>
          <p className="text-zinc-300">{error}</p>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const fullArticle = `# ${content.hook ? "Article" : ""}\n\n${content.hook}\n\n${content.sections.join("\n\n")}\n\n${content.conclusion}`;
  const hasContent = content.hook || content.sections.length > 0 || content.conclusion;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">
              {progress?.stage === "complete"
                ? "✅ Article Complete!"
                : "✍️ Writing Article..."}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                {progress?.progress || 0}%
              </span>
              {progress?.stage !== "complete" && (
                <button
                  onClick={onCancel}
                  className="px-3 py-1 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${progress?.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Current Stage Message */}
        {progress && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="animate-pulse">
                {progress.stage === "complete" ? "✅" : "✍️"}
              </div>
              <div className="flex-1">
                <p className="text-blue-400 font-medium">{progress.message}</p>
                {progress.stage === "section" && progress.section && progress.total && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Section {progress.section} of {progress.total}
                    {progress.sectionTitle && `: ${progress.sectionTitle}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Content Preview */}
      {hasContent && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-400">Live Preview</h3>
            <div className="text-sm text-zinc-500">
              {fullArticle.split(/\s+/).filter((w) => w.length > 0).length} words
            </div>
          </div>

          <div className="prose prose-invert max-w-none bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
            {/* Hook */}
            {content.hook && (
              <div className="mb-6">
                <div className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
                  {content.hook}
                  {progress?.stage === "hook" && (
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                  )}
                </div>
              </div>
            )}

            {/* Sections */}
            {content.sections.map((section, index) => (
              <div key={index} className="mb-6">
                <div className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
                  {section}
                  {progress?.stage === "section" &&
                    content.currentSection === index && (
                      <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                    )}
                </div>
              </div>
            ))}

            {/* Conclusion */}
            {content.conclusion && (
              <div className="mb-6">
                <div className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
                  {content.conclusion}
                  {progress?.stage === "conclusion" && (
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                  )}
                </div>
              </div>
            )}

            {/* Empty state while waiting */}
            {!hasContent && (
              <div className="text-center py-12 text-zinc-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Preparing to write...</p>
              </div>
            )}
          </div>

          {/* Completion Actions */}
          {progress?.stage === "complete" && article && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-medium mb-2">
                Article saved successfully!
              </p>
              <p className="text-sm text-zinc-400">
                Redirecting to editor...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
