"use client";

import { useState, useEffect } from "react";
import type { LinkOpportunity } from "@/types";
import { insertLinksIntoContent } from "@/lib/ai/intelligent-linking-utils";
import { Check, X, ExternalLink, Sparkles } from "lucide-react";

interface LinkReviewStageProps {
  suggestions: LinkOpportunity[];
  originalContent: string;
  onApply: (selectedIds: string[]) => Promise<void>;
  onSkip: () => void;
}

export function LinkReviewStage({
  suggestions,
  originalContent,
  onApply,
  onSkip,
}: LinkReviewStageProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(suggestions.map((s) => s.id))
  ); // All selected by default
  const [previewContent, setPreviewContent] = useState(originalContent);
  const [isApplying, setIsApplying] = useState(false);

  // Update preview when selection changes
  useEffect(() => {
    const selectedSuggestions = suggestions.filter((s) =>
      selectedIds.has(s.id)
    );
    if (selectedSuggestions.length === 0) {
      setPreviewContent(originalContent);
    } else {
      const { modifiedContent } = insertLinksIntoContent(
        originalContent,
        selectedSuggestions
      );
      setPreviewContent(modifiedContent);
    }
  }, [selectedIds, suggestions, originalContent]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(Array.from(selectedIds));
    } finally {
      setIsApplying(false);
    }
  };

  const getAnchorTextPreview = (suggestion: LinkOpportunity) => {
    const lowerContent = originalContent.toLowerCase();
    const lowerAnchor = suggestion.anchorText.toLowerCase();
    const index = lowerContent.indexOf(lowerAnchor);

    if (index === -1) return null;

    // Get surrounding context
    const start = Math.max(0, index - 30);
    const end = Math.min(originalContent.length, index + suggestion.anchorText.length + 30);
    const before = originalContent.substring(start, index);
    const anchor = originalContent.substring(index, index + suggestion.anchorText.length);
    const after = originalContent.substring(index + suggestion.anchorText.length, end);

    return { before, anchor, after };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 dark:bg-blue-500 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              Intelligent Link Suggestions
            </h2>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              We found {suggestions.length} linking opportunities to help improve SEO and reader engagement.
              Review and select which links to add to your article.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
              >
                Deselect All
              </button>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {selectedIds.size} of {suggestions.length} selected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => {
          const isSelected = selectedIds.has(suggestion.id);
          const preview = getAnchorTextPreview(suggestion);

          return (
            <div
              key={suggestion.id}
              className={`border rounded-lg p-5 transition-all ${
                isSelected
                  ? "bg-white dark:bg-zinc-900 border-blue-500 shadow-md"
                  : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelection(suggestion.id)}
                  className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 hover:border-blue-500"
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-500 dark:text-zinc-500">
                        Link #{index + 1}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded">
                        {Math.round(suggestion.relevanceScore * 100)}% relevant
                      </span>
                    </div>
                  </div>

                  {/* Target Article */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {suggestion.targetArticleTitle}
                      </span>
                    </div>
                    <a
                      href={suggestion.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {suggestion.canonicalUrl}
                    </a>
                  </div>

                  {/* Anchor Text Preview */}
                  {preview && (
                    <div className="bg-slate-100 dark:bg-zinc-800 rounded p-3 mb-3">
                      <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mb-2">
                        Anchor Text in Context:
                      </p>
                      <p className="text-sm text-slate-700 dark:text-zinc-300">
                        ...{preview.before}
                        <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1 rounded">
                          {preview.anchor}
                        </span>
                        {preview.after}...
                      </p>
                    </div>
                  )}

                  {/* Reason */}
                  <p className="text-sm text-slate-600 dark:text-zinc-400 italic">
                    "{suggestion.reason}"
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
        <button
          onClick={onSkip}
          disabled={isApplying}
          className="px-6 py-3 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors disabled:opacity-50"
        >
          Skip Linking
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-zinc-400">
            {selectedIds.size === 0 && "No links selected"}
            {selectedIds.size === 1 && "1 link will be added"}
            {selectedIds.size > 1 && `${selectedIds.size} links will be added`}
          </span>
          <button
            onClick={handleApply}
            disabled={isApplying || selectedIds.size === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Applying Links...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Apply Selected Links
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
