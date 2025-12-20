"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Lightbulb, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Topic {
  id: string;
  title: string;
  summary: string;
  relevance_score: number;
  created_at: string;
  industry?: {
    name: string;
  };
}

export function TopicHighlights() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopics() {
      try {
        setLoading(true);
        const response = await fetch(
          "/api/agents/research?status=pending&limit=5"
        );
        const data = await response.json();

        if (data.success) {
          // Sort by relevance score and take top 3
          const sortedTopics = (data.data || [])
            .sort((a: Topic, b: Topic) => b.relevance_score - a.relevance_score)
            .slice(0, 3);
          setTopics(sortedTopics);
        }
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Top Topics to Review
        </h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-full mb-2" />
              <div className="h-2 bg-slate-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Top Topics to Review
        </h2>
        <Lightbulb className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
      </div>

      {topics.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-zinc-400 mb-2">
            No pending topics
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            Discover new topics to see them here
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex-1">
                    {topic.title}
                  </h3>
                  <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-green-50 dark:bg-green-950/30 rounded">
                    <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      {Math.round(topic.relevance_score * 100)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 mb-2">
                  {topic.summary}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-zinc-500">
                    {formatRelativeTime(new Date(topic.created_at))}
                  </span>
                  {topic.industry && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded">
                      {topic.industry.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard?tab=topics"
            className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            View all topics
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  );
}
