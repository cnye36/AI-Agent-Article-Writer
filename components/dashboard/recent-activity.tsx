"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { FileEdit, Lightbulb, Globe, Eye } from "lucide-react";
import Link from "next/link";
import { Article, Topic, ArticlePublication } from "@/types";

interface Activity {
  id: string;
  type: "article" | "topic" | "publication";
  title: string;
  description: string;
  timestamp: string;
  href?: string;
}

interface RecentActivityProps {
  limit?: number;
}

export function RecentActivity({ limit = 10 }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true);

        // Fetch articles, topics, and publications in parallel
        const [articlesRes, topicsRes, publicationsRes] = await Promise.all([
          fetch("/api/articles?limit=5"),
          fetch("/api/agents/research?limit=5"),
          fetch("/api/publications/calendar"),
        ]);

        const articlesData = await articlesRes.json();
        const topicsData = await topicsRes.json();
        const publicationsData = await publicationsRes.json();

        const allActivities: Activity[] = [];

        // Process articles
        if (articlesData.articles) {
          articlesData.articles.forEach((article: Article) => {
            allActivities.push({
              id: `article-${article.id}`,
              type: "article",
              title: article.title || "Untitled Article",
              description: `Updated article • ${article.status}`,
              timestamp: article.updated_at,
              href: `/article/${article.id}`,
            });
          });
        }

        // Process topics
        if (topicsData.topics) {
          topicsData.topics.forEach((topic: Topic) => {
            allActivities.push({
              id: `topic-${topic.id}`,
              type: "topic",
              title: topic.title,
              description: `Discovered topic • ${topic.status}`,
              timestamp: topic.discovered_at,
            });
          });
        }

        // Process publications
        if (publicationsData.publications) {
          publicationsData.publications.slice(0, 3).forEach((pub: ArticlePublication) => {
            allActivities.push({
              id: `publication-${pub.id}`,
              type: "publication",
              title: pub.article?.title || "Article",
              description: `Published to ${pub.site?.name || "site"}`,
              timestamp: pub.published_at,
            });
          });
        }

        // Sort by timestamp and limit
        const sortedActivities = allActivities
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, limit);

        setActivities(sortedActivities);
      } catch (error) {
        console.error("Error fetching activity:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [limit]);

  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "article":
        return <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "topic":
        return <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case "publication":
        return <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8">
          <Eye className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-zinc-400">
            No recent activity
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
            Start creating articles to see your activity here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Recent Activity
      </h2>
      <div className="space-y-4">
        {activities.map((activity) => {
          const content = (
            <div className="flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 p-3 -m-3 rounded-lg transition-colors">
              <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg flex-shrink-0">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                  {activity.description}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                  {formatRelativeTime(new Date(activity.timestamp))}
                </p>
              </div>
            </div>
          );

          return activity.href ? (
            <Link key={activity.id} href={activity.href}>
              {content}
            </Link>
          ) : (
            <div key={activity.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
