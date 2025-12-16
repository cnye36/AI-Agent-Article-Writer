"use client";

import { useState, useEffect, useCallback } from "react";
import { getClient } from "@/lib/supabase/client";
import { cn, formatRelativeTime, getStatusConfig, truncate } from "@/lib/utils";
import type { Topic, Industry } from "@/types";

interface TopicFeedProps {
  onSelectTopic?: (topic: Topic) => void;
}

export function TopicFeed({ onSelectTopic }: TopicFeedProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    let query = supabase
      .from("topics")
      .select(`
        *,
        industries (
          id,
          name,
          slug
        )
      `)
      .order("relevance_score", { ascending: false })
      .limit(50);

    if (selectedIndustry) {
      query = query.eq("industry_id", selectedIndustry);
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching topics:", error);
    } else {
      setTopics(data || []);
    }

    setIsLoading(false);
  }, [supabase, selectedIndustry, statusFilter]);

  // Refresh topics from research agent
  const refreshTopics = useCallback(async () => {
    if (!selectedIndustry) {
      alert("Please select an industry first");
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
  }, [selectedIndustry, industries, fetchTopics]);

  // Update topic status
  const updateTopicStatus = useCallback(async (topicId: string, status: string) => {
    const { error } = await supabase
      .from("topics")
      .update({ status })
      .eq("id", topicId);

    if (!error) {
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, status: status as any } : t))
      );
    }
  }, [supabase]);

  // Delete topic
  const deleteTopic = useCallback(async (topicId: string) => {
    if (!confirm("Are you sure you want to permanently delete this topic?")) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/research?id=${topicId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTopics((prev) => prev.filter((t) => t.id !== topicId));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete topic");
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      alert("Failed to delete topic");
    }
  }, []);

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
          <p className="text-zinc-400">
            Discover trending topics and research opportunities
          </p>
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

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Industry Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Industry:</span>
          <select
            value={selectedIndustry || ""}
            onChange={(e) => setSelectedIndustry(e.target.value || null)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <span className="text-sm text-zinc-400">Status:</span>
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            {["pending", "approved", "rejected", "used"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors capitalize",
                  statusFilter === status
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Topic Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400 mb-4">No topics found</p>
          <p className="text-sm text-zinc-500">
            {selectedIndustry
              ? "Try refreshing to discover new topics"
              : "Select an industry to get started"}
          </p>
        </div>
      ) : (
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

function TopicCard({ topic, onSelect, onUpdateStatus, onDelete }: TopicCardProps) {
  const [showSources, setShowSources] = useState(false);
  const statusConfig = getStatusConfig(topic.status);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={cn(
            "px-2 py-0.5 text-xs rounded-full",
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500">
            {Math.round(topic.relevance_score * 100)}% relevant
          </span>
          <div
            className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden"
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
      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{topic.title}</h3>

      {/* Summary */}
      <p className="text-sm text-zinc-400 mb-3 line-clamp-3">
        {topic.summary || "No summary available"}
      </p>

      {/* Angle/Unique Perspective */}
      {topic.metadata?.angle && (
        <div className="bg-zinc-800/50 rounded-lg p-2 mb-3">
          <p className="text-xs text-zinc-500 mb-1">Unique angle:</p>
          <p className="text-sm text-zinc-300">{topic.metadata.angle}</p>
        </div>
      )}

      {/* Industry Tag */}
      {topic.industries && (
        <div className="mb-3">
          <span className="px-2 py-1 text-xs bg-zinc-800 rounded-full">
            {topic.industries.name}
          </span>
        </div>
      )}

      {/* Sources Toggle */}
      {topic.sources && topic.sources.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
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
                  className="block text-xs text-blue-400 hover:text-blue-300 truncate"
                >
                  {source.title || source.url}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-zinc-500 mb-4">
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
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              title="Reject"
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
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
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