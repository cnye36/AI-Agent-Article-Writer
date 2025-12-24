"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import type { Topic } from "@/types";

interface TopicsStageProps {
  topics: Topic[];
  isLoading: boolean;
  onSelect: (topic: Topic) => void;
  onBack: () => void;
  onSaveSelected?: (savedTopics: Topic[]) => void;
  researchMetadata?: {
    duplicatesFiltered?: number;
    duplicates?: Array<{
      title: string;
      similarTo?: string;
      similarity?: number;
    }>;
  } | null;
}

export function TopicsStage({
  topics,
  isLoading,
  onSelect,
  onBack,
  onSaveSelected,
  researchMetadata,
}: TopicsStageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [topicBeingUsed, setTopicBeingUsed] = useState<string | null>(null);
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Save a single topic for later (without using it)
  const handleSaveForLater = useCallback(
    async (topic: Topic, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent triggering the card click

      if (isLoading || !topic.id || savingTopicId) {
        return;
      }

      setSavingTopicId(topic.id);
      setIsSaving(true);

      try {
        const response = await fetch("/api/agents/research/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicIds: [topic.id],
            topics: topics,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to save topic");
        }

        const data = await response.json();

        // Notify parent of saved topics
        if (onSaveSelected && data.topics) {
          onSaveSelected(data.topics);
        }

        // Show success message
        // Topic will remain visible but now has a real ID
      } catch (error) {
        console.error("Error saving topic:", error);
        showToast(
          error instanceof Error ? error.message : "Failed to save topic",
          "error"
        );
      } finally {
        setIsSaving(false);
        setSavingTopicId(null);
      }
    },
    [topics, onSaveSelected, isLoading, savingTopicId]
  );

  // Use topic immediately (save it if needed, then proceed)
  const handleUseTopic = useCallback(
    async (topic: Topic) => {
      if (isLoading || !topic.id || topicBeingUsed) {
        return;
      }

      setTopicBeingUsed(topic.id);

      try {
        // If topic has temp ID, save it first
        if (topic.id.startsWith("temp-")) {
          const response = await fetch("/api/agents/research/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topicIds: [topic.id],
              topics: topics,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to save topic");
          }

          const data = await response.json();
          if (!data.topics || data.topics.length === 0) {
            throw new Error("No topic returned after saving");
          }

          // Use the saved topic (with real ID) for outline generation
          const savedTopic = data.topics[0];

          // Update topics list
          if (onSaveSelected) {
            onSaveSelected(data.topics);
          }

          // Proceed with outline generation using the saved topic
          // Note: onSelect will handle the loading state, so we don't clear topicBeingUsed here
          onSelect(savedTopic);
        } else {
          // Topic is already saved, use it directly
          onSelect(topic);
        }
      } catch (error) {
        console.error("Error using topic:", error);
        showToast(
          error instanceof Error ? error.message : "Failed to use topic",
          "error"
        );
        setTopicBeingUsed(null);
      }
    },
    [topics, onSelect, onSaveSelected, isLoading, topicBeingUsed, showToast]
  );
  // Show loading state only when initially loading topics (not when selecting one)
  if (isLoading && topics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-zinc-400">
          Discovering topics...
        </p>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-zinc-400 mb-4">
          No topics found. Try different keywords or industry.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-slate-900 dark:text-white"
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
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Choose a Topic to Write Now
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
        >
          ← Back
        </button>
      </div>

      {/* Helper text */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>Click on a topic</strong> to start writing now, or click{" "}
          <strong>&quot;Save for Later&quot;</strong> to save it without using
          it.
        </p>
      </div>

      {/* Duplicates Filtered Notification */}
      {hasDuplicatesFiltered && researchMetadata && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-lg">ℹ️</span>
            <div>
              <p className="text-blue-400 font-semibold text-sm mb-1">
                {researchMetadata.duplicatesFiltered} duplicate topic
                {(researchMetadata.duplicatesFiltered || 0) > 1 ? "s" : ""}{" "}
                filtered
              </p>
              <p className="text-blue-700 dark:text-zinc-400 text-xs mb-2">
                We automatically removed topics that are very similar ({">"}90%)
                to existing articles to prevent duplicate content.
              </p>
              {researchMetadata.duplicates &&
                researchMetadata.duplicates.length > 0 && (
                  <details className="text-xs text-blue-600 dark:text-zinc-500 mt-2">
                    <summary className="cursor-pointer hover:text-blue-800 dark:hover:text-zinc-400">
                      Show filtered topics
                    </summary>
                    <ul className="mt-2 space-y-1 ml-4">
                      {researchMetadata.duplicates.map((dup, idx) => (
                        <li key={idx}>
                          &quot;{dup.title}&quot; -{" "}
                          {dup.similarity
                            ? Math.round(dup.similarity * 100)
                            : "?"}
                          % similar to &quot;{dup.similarTo}&quot;
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
          const isBeingUsed = topicBeingUsed === topic.id;
          const isSavingThis = savingTopicId === topic.id;
          const isSaved = !topic.id?.startsWith("temp-");

          const handleCardClick = () => {
            if (!isLoading && !topicBeingUsed && !savingTopicId) {
              handleUseTopic(topic);
            }
          };

          const similarTopics = topic.metadata?.similarTopics || [];
          const hasSimilarTopics = similarTopics.length > 0;
          const highestSimilarity = hasSimilarTopics
            ? similarTopics[0].similarity
            : 0;

          return (
            <div
              key={topic.id || `topic-${topic.title}`}
              onClick={handleCardClick}
              className={`p-6 rounded-xl border text-left transition-all cursor-pointer ${
                isBeingUsed
                  ? "border-blue-500 bg-blue-100 dark:bg-blue-500/20"
                  : hasSimilarTopics
                  ? "border-yellow-500/50 dark:border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-zinc-900/50 bg-white dark:bg-zinc-900/30"
                  : "border-slate-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-zinc-900/50 bg-white dark:bg-zinc-900/30"
              }`}
            >
              {/* Title and summary */}
              <div className="mb-3">
                <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">
                  {topic.title}
                </h3>
                {topic.summary && (
                  <p className="text-slate-600 dark:text-zinc-400 text-sm mb-3">
                    {topic.summary}
                  </p>
                )}

                {/* Category Badge (if available) */}
                {topic.metadata?.category && (
                  <div className="mb-3">
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium capitalize">
                      {topic.metadata.category.replace(/-/g, " ")}
                    </span>
                  </div>
                )}

                {/* Rationale (if available - prompt mode only) */}
                {topic.metadata?.rationale && (
                  <div className="mb-3 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                    <p className="text-green-800 dark:text-green-300 text-xs font-semibold mb-1">
                      💡 Why this topic:
                    </p>
                    <p className="text-green-700 dark:text-green-400 text-xs">
                      {topic.metadata.rationale}
                    </p>
                  </div>
                )}
              </div>

              {/* Similar Topics Warning */}
              {hasSimilarTopics && (
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-700 dark:text-yellow-400 text-xs font-semibold mb-1">
                    ⚠️ Similar to existing topics (
                    {Math.round(highestSimilarity * 100)}% match)
                  </p>
                  <div className="text-yellow-600 dark:text-zinc-400 text-xs space-y-1">
                    {similarTopics.slice(0, 2).map((similar) => (
                      <div key={similar.id}>
                        • &quot;{similar.title}&quot; (
                        {Math.round(similar.similarity * 100)}%)
                      </div>
                    ))}
                    {similarTopics.length > 2 && (
                      <div className="text-yellow-600 dark:text-zinc-500">
                        +{similarTopics.length - 2} more similar topic
                        {similarTopics.length - 2 > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-500">
                  <span>
                    Relevance: {Math.round((topic.relevance_score || 0) * 100)}%
                  </span>
                  {topic.sources && topic.sources.length > 0 && (
                    <span>{topic.sources.length} sources</span>
                  )}
                  {isSaved && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✓ Saved
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleSaveForLater(topic, e)}
                  disabled={
                    isLoading || !!topicBeingUsed || isSavingThis || isSaved
                  }
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingThis
                    ? "Saving..."
                    : isSaved
                    ? "Saved"
                    : "Save for Later"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

