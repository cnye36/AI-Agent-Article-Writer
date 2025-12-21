"use client";

import { FileText, Lightbulb, CheckCircle } from "lucide-react";

interface StatsCardsProps {
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

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
}

function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-zinc-500">
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={`text-xs mt-2 ${
                trend.positive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StatsCards({ articles, topics }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard
        title="Total Articles"
        value={articles.total}
        subtitle={`${articles.draft} drafts, ${articles.published} published`}
        icon={
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        }
      />

      <StatCard
        title="Topics Discovered"
        value={topics.total}
        subtitle={`${topics.pending} pending approval`}
        icon={
          <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        }
      />

      <StatCard
        title="Total Word Count"
        value={articles.totalWords.toLocaleString()}
        subtitle={`Across ${articles.total} articles`}
        icon={
          <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        }
      />
    </div>
  );
}
