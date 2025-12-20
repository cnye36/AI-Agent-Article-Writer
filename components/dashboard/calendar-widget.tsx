"use client";

import { useEffect, useState } from "react";
import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Publication {
  id: string;
  published_at: string;
  article?: {
    id: string;
    title: string;
  };
  site?: {
    id: string;
    name: string;
  };
}

export function CalendarWidget() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublications() {
      try {
        setLoading(true);

        // Get publications for the next 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const response = await fetch(
          `/api/publications/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        const data = await response.json();

        if (data.publications) {
          setPublications(data.publications.slice(0, 5)); // Show only next 5
        }
      } catch (error) {
        console.error("Error fetching publications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPublications();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Upcoming Publications
          </h2>
          <Calendar className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-1/2" />
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
          Upcoming Publications
        </h2>
        <Calendar className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
      </div>

      {publications.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-zinc-400 mb-2">
            No upcoming publications
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            Schedule articles to see them here
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex-shrink-0 text-center">
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {new Date(pub.published_at).getDate()}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-zinc-500">
                    {new Date(pub.published_at).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {pub.article?.title || "Untitled"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">
                    {pub.site?.name || "Unknown site"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard?tab=published"
            className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            View full calendar
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  );
}
