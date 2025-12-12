"use client";

import type { Topic } from "@/types";

interface TopicsStageProps {
  topics: Topic[];
  isLoading: boolean;
  onSelect: (topic: Topic) => void;
  onBack: () => void;
  researchMetadata?: {
    duplicatesFiltered?: number;
    duplicates?: Array<{
      title: string;
      similarTo?: string;
      similarity?: number;
    }>;
  } | null;
}

export function TopicsStage({ topics, isLoading, onSelect, onBack, researchMetadata }: TopicsStageProps) {
  // Show loading state only when initially loading topics (not when selecting one)
  if (isLoading && topics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-zinc-400">Discovering topics...</p>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4">No topics found. Try different keywords or industry.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const hasDuplicatesFiltered = (researchMetadata?.duplicatesFiltered || 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Select a Topic</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-zinc-400 hover:text-white"
        >
          ← Back
        </button>
      </div>

      {/* Duplicates Filtered Notification */}
      {hasDuplicatesFiltered && researchMetadata && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-lg">ℹ️</span>
            <div>
              <p className="text-blue-400 font-semibold text-sm mb-1">
                {researchMetadata.duplicatesFiltered} duplicate topic{(researchMetadata.duplicatesFiltered || 0) > 1 ? 's' : ''} filtered
              </p>
              <p className="text-zinc-400 text-xs mb-2">
                We automatically removed topics that are very similar ({'>'}90%) to existing articles to prevent duplicate content.
              </p>
              {researchMetadata.duplicates && researchMetadata.duplicates.length > 0 && (
                <details className="text-xs text-zinc-500 mt-2">
                  <summary className="cursor-pointer hover:text-zinc-400">Show filtered topics</summary>
                  <ul className="mt-2 space-y-1 ml-4">
                    {researchMetadata.duplicates.map((dup, idx) => (
                      <li key={idx}>
                        "{dup.title}" - {dup.similarity ? Math.round(dup.similarity * 100) : '?'}% similar to "{dup.similarTo}"
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {topics.map((topic) => {
          const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Topic button clicked:", topic);
            console.log("Topic ID:", topic.id);
            console.log("isLoading:", isLoading);
            console.log("onSelect function:", onSelect);
            
            if (isLoading) {
              console.warn("Already loading, ignoring click");
              return;
            }
            
            if (!topic) {
              console.error("Topic is null or undefined");
              return;
            }
            
            if (!topic.id) {
              console.error("Topic missing ID:", topic);
              alert("This topic is missing an ID and cannot be selected. Please try finding topics again.");
              return;
            }
            
            console.log("Calling onSelect with topic:", topic);
            try {
              onSelect(topic);
            } catch (error) {
              console.error("Error calling onSelect:", error);
            }
          };

          const hasId = !!topic.id;
          const canSelect = hasId && !isLoading;

          const similarTopics = topic.metadata?.similarTopics || [];
          const hasSimilarTopics = similarTopics.length > 0;
          const highestSimilarity = hasSimilarTopics ? similarTopics[0].similarity : 0;

          return (
            <button
              key={topic.id || `topic-${topic.title}`}
              onClick={handleClick}
              className={`p-6 rounded-xl border text-left transition-all ${
                canSelect
                  ? hasSimilarTopics
                    ? "border-yellow-500/30 hover:border-yellow-500 hover:bg-zinc-900/50 cursor-pointer"
                    : "border-zinc-800 hover:border-blue-500 hover:bg-zinc-900/50 cursor-pointer"
                  : "border-zinc-800 opacity-50 cursor-not-allowed"
              }`}
            >
              <h3 className="font-semibold text-lg mb-2">{topic.title}</h3>
              {topic.summary && (
                <p className="text-zinc-400 text-sm mb-3">{topic.summary}</p>
              )}

              {/* Similar Topics Warning */}
              {hasSimilarTopics && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-xs font-semibold mb-1">
                    ⚠️ Similar to existing topics ({Math.round(highestSimilarity * 100)}% match)
                  </p>
                  <div className="text-zinc-400 text-xs space-y-1">
                    {similarTopics.slice(0, 2).map((similar) => (
                      <div key={similar.id}>
                        • "{similar.title}" ({Math.round(similar.similarity * 100)}%)
                      </div>
                    ))}
                    {similarTopics.length > 2 && (
                      <div className="text-zinc-500">
                        +{similarTopics.length - 2} more similar topic{similarTopics.length - 2 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Relevance: {Math.round((topic.relevance_score || 0) * 100)}%</span>
                {topic.sources && topic.sources.length > 0 && (
                  <span>{topic.sources.length} sources</span>
                )}
                {hasId && <span className="text-green-400">✓ Has ID</span>}
              </div>
              {!hasId && (
                <p className="text-red-400 text-xs mt-2">⚠️ Topic missing ID - cannot be selected</p>
              )}
              {isLoading && (
                <p className="text-blue-400 text-xs mt-2">⏳ Loading...</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

