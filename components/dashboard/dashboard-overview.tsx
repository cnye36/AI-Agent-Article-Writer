"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "./stats-cards";
import { RecentActivity } from "./recent-activity";
import { CalendarWidget } from "./calendar-widget";
import { TopicHighlights } from "./topic-highlights";
import { PlusCircle, Search, FileText, Calendar } from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  articles: {
    total: number;
    draft: number;
    review: number;
    published: number;
    totalWords: number;
  };
  topics: {
    total: number;
    pending: number;
    approved: number;
    used: number;
  };
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch("/api/stats/overview");
        const data = await response.json();

        if (data.success) {
          setStats({
            articles: data.data.articles,
            topics: data.data.topics,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-24 mb-4" />
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-16 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-32" />
            </div>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 animate-pulse"
            >
              <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>

        {/* Widgets Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 animate-pulse"
            >
              <div className="h-6 bg-slate-200 dark:bg-zinc-800 rounded w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j}>
                    <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-zinc-400">
          Failed to load dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards
        articles={stats.articles}
        topics={stats.topics}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard?tab=create"
          className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors group"
        >
          <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Create Article
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Start a new article
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard?tab=topics"
          className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors group"
        >
          <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
            <Search className="w-5 h-5 text-slate-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Browse Topics
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {stats.topics.pending} pending
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard?tab=library"
          className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors group"
        >
          <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
            <FileText className="w-5 h-5 text-slate-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Article Library
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {stats.articles.total} articles
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard?tab=published"
          className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors group"
        >
          <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
            <Calendar className="w-5 h-5 text-slate-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Publications
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              View calendar
            </p>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Spans 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <RecentActivity limit={8} />
          <TopicHighlights />
        </div>

        {/* Right Column - Spans 1 column on large screens */}
        <div className="space-y-6">
          <CalendarWidget />
        </div>
      </div>
    </div>
  );
}
