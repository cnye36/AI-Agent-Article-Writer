"use client";

import { useState, useEffect } from "react";
import type { Outline, OutlineSection } from "@/types";

interface OutlineStageProps {
  outline: Outline | null;
  isLoading: boolean;
  onApprove: () => void;
  onBack: () => void;
  onSelectDifferentTopic?: () => void;
  onOutlineUpdate?: (updatedOutline: Outline) => void;
  onDelete?: () => void;
}

export function OutlineStage({
  outline,
  isLoading,
  onApprove,
  onBack,
  onSelectDifferentTopic,
  onOutlineUpdate,
  onDelete,
}: OutlineStageProps) {
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(
    null
  );
  const [editPrompt, setEditPrompt] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [localOutline, setLocalOutline] = useState<Outline | null>(outline);

  // Update local outline when prop changes
  useEffect(() => {
    setLocalOutline(outline);
  }, [outline]);

  // Poll for outline updates if it's being generated
  useEffect(() => {
    if (!outline?.id || !isLoading) return;

    // Check if outline is still being generated
    const isGenerating =
      outline.structure?.title === "Generating..." ||
      !outline.structure?.sections ||
      outline.structure.sections.length === 0 ||
      !outline.structure.conclusion?.summary;

    if (!isGenerating) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/agents/outline?id=${outline.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.outline) {
            setLocalOutline(data.outline);
            if (onOutlineUpdate) {
              onOutlineUpdate(data.outline);
            }
          }
        }
      } catch (error) {
        console.error("Error polling outline:", error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [outline?.id, isLoading, onOutlineUpdate]);

  if (isLoading && !localOutline) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-zinc-400">Creating outline...</p>
      </div>
    );
  }

  if (!localOutline || !localOutline.structure) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4">No outline available.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { structure } = localOutline;

  // Check if outline is still being generated
  const isGenerating =
    structure?.title === "Generating..." ||
    !structure?.sections ||
    structure.sections.length === 0 ||
    !structure.conclusion?.summary;

  const handleSectionEdit = async (sectionIndex: number) => {
    if (!editPrompt.trim() || !localOutline) return;

    setIsRewriting(true);
    try {
      const response = await fetch("/api/agents/outline/edit-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlineId: localOutline.id,
          sectionIndex,
          instruction: editPrompt,
          currentSection: structure.sections[sectionIndex],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rewrite section");
      }

      const data = await response.json();

      // Update local outline
      const updatedStructure = {
        ...structure,
        sections: structure.sections.map((section, idx) =>
          idx === sectionIndex ? data.updatedSection : section
        ),
      };

      const updatedOutline = {
        ...localOutline,
        structure: updatedStructure,
      };

      setLocalOutline(updatedOutline);
      setEditingSectionIndex(null);
      setEditPrompt("");

      // Notify parent if callback provided
      if (onOutlineUpdate) {
        onOutlineUpdate(updatedOutline);
      }
    } catch (error) {
      console.error("Failed to rewrite section:", error);
      alert("Failed to rewrite section. Please try again.");
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Article Outline</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-zinc-400 hover:text-white"
        >
          ← Back
        </button>
      </div>

      {/* Show generating indicator */}
      {isGenerating && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="animate-pulse">✍️</div>
            <div className="flex-1">
              <p className="text-blue-400 font-medium">Generating outline...</p>
              <p className="text-xs text-zinc-500 mt-1">
                Sections will appear as they&apos;re created
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <h3 className="text-2xl font-bold mb-4">
          {structure.title === "Generating..." ? (
            <div className="h-8 bg-zinc-800 rounded animate-pulse" />
          ) : (
            structure.title
          )}
        </h3>
        <div className="text-zinc-300 mb-6">
          {!structure.hook || structure.hook === "" ? (
            <div className="space-y-2">
              <div className="h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
            </div>
          ) : (
            structure.hook
          )}
        </div>

        <div className="space-y-6">
          {structure.sections && structure.sections.length > 0 ? (
            structure.sections.map((section, index) => (
              <div
                key={index}
                className="border-l-2 border-blue-500 pl-4 relative group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">
                      {section.heading}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400 mb-2">
                      {section.keyPoints.map((point, i) => (
                        <li key={i} className="text-sm">
                          {point}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-zinc-500">
                      Target: ~{section.wordTarget} words
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingSectionIndex(
                        editingSectionIndex === index ? null : index
                      )
                    }
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white"
                    title="Edit this section"
                  >
                    ✏️ Edit
                  </button>
                </div>

                {/* Edit Input */}
                {editingSectionIndex === index && (
                  <div className="mt-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <label className="block text-sm text-zinc-400 mb-2">
                      What do you want to change?
                    </label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="E.g., 'Make this section more technical' or 'Add more examples'"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSectionEdit(index)}
                        disabled={!editPrompt.trim() || isRewriting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRewriting ? "Rewriting..." : "Submit"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSectionIndex(null);
                          setEditPrompt("");
                        }}
                        disabled={isRewriting}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            // Skeleton loaders for sections while generating
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-l-2 border-zinc-700 pl-4">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-6 bg-zinc-800 rounded w-1/3" />
                    <div className="h-4 bg-zinc-800 rounded w-full" />
                    <div className="h-4 bg-zinc-800 rounded w-5/6" />
                    <div className="h-3 bg-zinc-800 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <h4 className="font-semibold mb-2">Conclusion</h4>
          {!structure.conclusion?.summary ||
          structure.conclusion.summary === "" ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-full" />
              <div className="h-4 bg-zinc-800 rounded w-4/5" />
            </div>
          ) : (
            <>
              <p className="text-zinc-300 mb-2">
                {structure.conclusion.summary}
              </p>
              <p className="text-zinc-400 text-sm">
                {structure.conclusion.callToAction}
              </p>
            </>
          )}
        </div>

        {structure.seoKeywords && structure.seoKeywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {structure.seoKeywords.map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl"
        >
          ← Back to Topics
        </button>
        {onSelectDifferentTopic && (
          <button
            onClick={onSelectDifferentTopic}
            className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl"
          >
            Choose Different Topic
          </button>
        )}
        {onDelete && (
          <button
            onClick={async () => {
              if (
                !confirm(
                  "Are you sure you want to permanently delete this outline?"
                )
              ) {
                return;
              }
              try {
                const response = await fetch(
                  `/api/agents/outline?id=${localOutline?.id}`,
                  {
                    method: "DELETE",
                  }
                );
                if (response.ok) {
                  onDelete();
                } else {
                  const data = await response.json();
                  alert(data.error || "Failed to delete outline");
                }
              } catch (error) {
                console.error("Error deleting outline:", error);
                alert("Failed to delete outline");
              }
            }}
            className="px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium"
          >
            Delete Outline
          </button>
        )}
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium"
        >
          Approve & Write Article →
        </button>
      </div>
    </div>
  );
}

