"use client";

import { useState, useEffect, useCallback } from "react";
import { getClient } from "@/lib/supabase/client";
import { cn, formatRelativeTime, getStatusConfig } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Topic, Industry } from "@/types";

interface TopicStatusFilter {
  value: string;
  label: string;
}

interface TopicFeedProps {
  onSelectTopic?: (topic: Topic) => void;
}

const TOPIC_STATUS_FILTERS: TopicStatusFilter[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Ready" },
  { value: "rejected", label: "Archived" },
  { value: "used", label: "Used" },
];

export function TopicFeed({ onSelectTopic }: TopicFeedProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<
    "relevance_score" | "discovered_at" | "title"
  >("relevance_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const supabase = getClient();

  // Fetch industries
  const fetchIndustries = useCallback(async () => {
    const { data } = await supabase
      .from("industries")
      .select("*")
      .order("name");

    if (data) {
      setIndustries(data);
    }
  }, [supabase]);

  // Fetch topics
  const fetchTopics = useCallback(async () => {
    setIsLoading(true);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("topics").select(
      `
        *,
        industries (
          id,
          name,
          slug
        )
      `,
      { count: "exact" }
    );

    if (selectedIndustry) {
      query = query.eq("industry_id", selectedIndustry);
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      // Match on title or summary
      query = query.or(
        `title.ilike.%${trimmedQuery}%,summary.ilike.%${trimmedQuery}%`
      );
    }

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching topics:", error);
    } else {
      setTopics(data || []);
      setTotal(count || 0);
    }

    setIsLoading(false);
  }, [
    supabase,
    selectedIndustry,
    statusFilter,
    searchQuery,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  // Refresh topics from research agent
  const refreshTopics = useCallback(async () => {
    if (!selectedIndustry) {
      showToast("Please select an industry first", "warning");
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch("/api/agents/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: industries.find((i) => i.id === selectedIndustry)?.slug,
          maxTopics: 5,
        }),
      });

      if (response.ok) {
        await fetchTopics();
      }
    } catch (error) {
      console.error("Error refreshing topics:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedIndustry, industries, fetchTopics, showToast]);

  // Update topic status
  const updateTopicStatus = useCallback(
    async (topicId: string, status: string) => {
      const { error } = await supabase
        .from("topics")
        .update({ status })
        .eq("id", topicId);

      if (!error) {
        setTopics((prev) =>
          prev.map((t) =>
            t.id === topicId ? { ...t, status: status as Topic["status"] } : t
          )
        );
      }
    },
    [supabase]
  );

  // Delete topic (single)
  const deleteTopic = useCallback(
    async (topicId: string) => {
      const confirmed = await confirm({
        message: "Are you sure you want to permanently delete this topic?",
        variant: "danger",
        confirmText: "Delete",
      });
      if (!confirmed) return;

      try {
        const response = await fetch(`/api/agents/research?id=${topicId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setTopics((prev) => prev.filter((t) => t.id !== topicId));
        } else {
          const data = await response.json();
          showToast(data.error || "Failed to delete topic", "error");
        }
      } catch (error) {
        console.error("Error deleting topic:", error);
        showToast("Failed to delete topic", "error");
      }
    },
    [showToast, confirm]
  );

  // Selection helpers
  const toggleSelection = useCallback((topicId: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTopics((prev) => {
      if (prev.size === topics.length) {
        return new Set();
      }
      return new Set(topics.map((t) => t.id));
    });
  }, [topics]);

  const clearSelection = useCallback(() => {
    setSelectedTopics(new Set());
  }, []);

  const bulkArchive = useCallback(async () => {
    if (selectedTopics.size === 0) return;

    const confirmed = await confirm({
      message: `Archive ${selectedTopics.size} topic${
        selectedTopics.size === 1 ? "" : "s"
      }?`,
      variant: "default",
      confirmText: "Archive",
    });
    if (!confirmed) return;

    const ids = Array.from(selectedTopics);
    await Promise.all(ids.map((id) => updateTopicStatus(id, "rejected")));
    setSelectedTopics(new Set());
  }, [selectedTopics, updateTopicStatus, confirm]);

  const bulkDelete = useCallback(async () => {
    if (selectedTopics.size === 0) return;

    const confirmed = await confirm({
      message: `Permanently delete ${selectedTopics.size} topic${
        selectedTopics.size === 1 ? "" : "s"
      }? This cannot be undone.`,
      variant: "danger",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    const ids = Array.from(selectedTopics);
    const deletedIds = new Set<string>();

    for (const id of ids) {
      try {
        const response = await fetch(`/api/agents/research?id=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          deletedIds.add(id);
        } else {
          try {
            const data = await response.json();
            console.error("Failed to delete topic", id, data);
          } catch {
            console.error("Failed to delete topic", id);
          }
        }
      } catch (error) {
        console.error("Error deleting topic", id, error);
      }
    }

    if (deletedIds.size > 0) {
      setTopics((prev) => prev.filter((t) => !deletedIds.has(t.id)));
    }

    setSelectedTopics(new Set());

    if (deletedIds.size !== ids.length) {
      showToast(
        "Some topics could not be deleted. They may have associated outlines or other dependencies.",
        "warning"
      );
    }
  }, [selectedTopics, confirm, showToast]);

  // Initial fetch
  useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Topic Feed</h2>
          <p className="text-slate-600 dark:text-zinc-400">
            Discover trending topics and research opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md text-sm transition-colors",
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 shadow-sm"
                  : "hover:bg-slate-50 dark:hover:bg-zinc-800"
              )}
              title="Grid view"
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md text-sm transition-colors",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 shadow-sm"
                  : "hover:bg-slate-50 dark:hover:bg-zinc-800"
              )}
              title="List view"
            >
              ☰
            </button>
          </div>
          <button
            onClick={refreshTopics}
            disabled={isRefreshing || !selectedIndustry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <span className="animate-spin">⟳</span>
                Researching...
              </>
            ) : (
              <>
                <span>🔍</span>
                Find New Topics
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search topics..."
            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Industry Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-zinc-400">
            Industry:
          </span>
          <select
            value={selectedIndustry || ""}
            onChange={(e) => {
              setSelectedIndustry(e.target.value || null);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Industries</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-zinc-400">
            Status:
          </span>
          <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 rounded-lg p-1">
            {TOPIC_STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors capitalize",
                  statusFilter === value
                    ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-700/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort & Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-zinc-400">
              Sort by:
            </span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-");
                setSortBy(by as typeof sortBy);
                setSortOrder(order as typeof sortOrder);
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="relevance_score-desc">Most Relevant</option>
              <option value="discovered_at-desc">Newest First</option>
              <option value="discovered_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-zinc-400">
              Per page:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-zinc-400">
          {(() => {
            const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
            const to = total === 0 ? 0 : Math.min(page * pageSize, total);
            const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
            return (
              <>
                <span>
                  Showing {from}-{to} of {total || 0}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-zinc-700 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-white"
                  >
                    Prev
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) =>
                        total === 0 ? p : Math.min(totalPages, p + 1)
                      )
                    }
                    disabled={total === 0 || page >= totalPages}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-zinc-700 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-white"
                  >
                    Next
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTopics.size > 0 && (
        <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-zinc-400">
            {selectedTopics.size} selected
          </span>
          <button
            onClick={bulkArchive}
            className="px-3 py-1 text-sm bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 rounded-lg text-slate-900 dark:text-white"
          >
            Archive
          </button>
          <button
            onClick={bulkDelete}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded-lg text-white"
          >
            Delete
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1 text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Topics */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-zinc-400 mb-4">
            No topics found
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            {selectedIndustry
              ? "Try refreshing to discover new topics"
              : "Select an industry to get started"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onSelect={onSelectTopic}
              onUpdateStatus={updateTopicStatus}
              onDelete={deleteTopic}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* List Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-zinc-500 border-b border-zinc-800">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={
                  selectedTopics.size > 0 &&
                  selectedTopics.size === topics.length
                }
                onChange={selectAll}
                className="rounded bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Industry</div>
            <div className="col-span-2 flex justify-end">Discovered</div>
          </div>

          {/* List Items */}
          {topics.map((topic) => (
            <TopicListItem
              key={topic.id}
              topic={topic}
              isSelected={selectedTopics.has(topic.id)}
              onToggleSelect={() => toggleSelection(topic.id)}
              onSelect={onSelectTopic}
              onArchive={() => updateTopicStatus(topic.id, "rejected")}
              onDelete={() => deleteTopic(topic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Topic Card Component
interface TopicCardProps {
  topic: Topic;
  onSelect?: (topic: Topic) => void;
  onUpdateStatus: (topicId: string, status: string) => void;
  onDelete: (topicId: string) => void;
}

function TopicCard({
  topic,
  onSelect,
  onUpdateStatus,
  onDelete,
}: TopicCardProps) {
  const [showSources, setShowSources] = useState(false);
  const statusConfig = getStatusConfig(topic.status);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-zinc-700 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-none transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={cn("px-2 py-0.5 text-xs rounded-full", statusConfig.color)}
        >
          {statusConfig.label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 dark:text-zinc-500">
            {Math.round(topic.relevance_score * 100)}% relevant
          </span>
          <div
            className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden"
            title={`Relevance: ${Math.round(topic.relevance_score * 100)}%`}
          >
            <div
              className="h-full bg-blue-500"
              style={{ width: `${topic.relevance_score * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-slate-900 dark:text-white">{topic.title}</h3>

      {/* Summary */}
      <p className="text-sm text-slate-600 dark:text-zinc-400 mb-3 line-clamp-3">
        {topic.summary || "No summary available"}
      </p>

      {/* Angle/Unique Perspective */}
      {topic.metadata?.angle && (
        <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-lg p-2 mb-3 border border-slate-200 dark:border-transparent">
          <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">Unique angle:</p>
          <p className="text-sm text-slate-700 dark:text-zinc-300">{topic.metadata.angle}</p>
        </div>
      )}

      {/* Industry Tag */}
      {topic.industries && (
        <div className="mb-3">
          <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-700 dark:text-zinc-300">
            {topic.industries.name}
          </span>
        </div>
      )}

      {/* Sources Toggle */}
      {topic.sources && topic.sources.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-xs text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 flex items-center gap-1"
          >
            <span>{showSources ? "▼" : "▶"}</span>
            {topic.sources.length} source{topic.sources.length !== 1 ? "s" : ""}
          </button>

          {showSources && (
            <div className="mt-2 space-y-2">
              {topic.sources.slice(0, 3).map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 truncate"
                >
                  {source.title || source.url}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-slate-500 dark:text-zinc-500 mb-4">
        Discovered {formatRelativeTime(topic.discovered_at)}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {topic.status === "pending" && (
          <>
            <button
              onClick={() => onSelect?.(topic)}
              disabled={!onSelect}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Topic
            </button>
            <button
              onClick={() => onUpdateStatus(topic.id, "rejected")}
              className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-sm transition-colors text-slate-700 dark:text-white"
              title="Archive"
            >
              ✕
            </button>
            <button
              onClick={() => onDelete(topic.id)}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors"
              title="Delete permanently"
            >
              🗑️
            </button>
          </>
        )}
        {topic.status === "approved" && (
          <button
            onClick={() => onSelect?.(topic)}
            disabled={!onSelect}
            className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue Writing
          </button>
        )}
        {topic.status === "rejected" && (
          <>
            <button
              onClick={() => onUpdateStatus(topic.id, "pending")}
              className="flex-1 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-sm transition-colors text-slate-900 dark:text-white"
            >
              Restore
            </button>
            <button
              onClick={() => onDelete(topic.id)}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors"
              title="Delete permanently"
            >
              🗑️
            </button>
          </>
        )}
        {topic.status === "used" && (
          <>
            <span className="flex-1 py-2 text-center text-sm text-zinc-500">
              Already used
            </span>
            <button
              onClick={() => onDelete(topic.id)}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors"
              title="Delete permanently"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface TopicListItemProps {
  topic: Topic;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSelect?: (topic: Topic) => void;
  onArchive: () => void;
  onDelete: () => void;
}

function TopicListItem({
  topic,
  isSelected,
  onToggleSelect,
  onSelect,
  onArchive,
  onDelete,
}: TopicListItemProps) {
  const statusConfig = getStatusConfig(topic.status);

  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-colors",
        isSelected ? "bg-blue-900/20" : "hover:bg-zinc-900"
      )}
    >
      <div className="col-span-1 flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded bg-zinc-800 border-zinc-700"
        />
      </div>
      <div className="col-span-5">
        <p
          className="font-medium truncate cursor-pointer hover:text-blue-400"
          onClick={() => onSelect?.(topic)}
        >
          {topic.title}
        </p>
        <p className="text-xs text-zinc-500 truncate">
          {topic.summary || "No summary available"}
        </p>
      </div>
      <div className="col-span-2 flex items-center">
        <span
          className={cn("px-2 py-0.5 text-xs rounded-full", statusConfig.color)}
        >
          {statusConfig.label}
        </span>
      </div>
      <div className="col-span-2 flex items-center text-sm text-zinc-400">
        {topic.industries?.name || "—"}
      </div>
      <div className="col-span-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{formatRelativeTime(topic.discovered_at)}</span>
        <div className="flex items-center gap-2">
          {topic.status === "pending" && (
            <button
              onClick={() => onSelect?.(topic)}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              Use
            </button>
          )}
          {(topic.status === "pending" || topic.status === "rejected") && (
            <button
              onClick={onArchive}
              className="text-zinc-400 hover:text-zinc-200 text-xs"
              title="Archive"
            >
              Archive
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-400 text-xs"
            title="Delete permanently"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}