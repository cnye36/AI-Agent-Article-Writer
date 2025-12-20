"use client";

import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { CalendarPublication } from "@/types";

interface CalendarDayViewProps {
  currentDate: Date;
  publications: CalendarPublication[];
}

export function CalendarDayView({ currentDate, publications }: CalendarDayViewProps) {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-zinc-950 flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          {formatDate(currentDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </h2>

        {publications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-zinc-400">
              No publications on this date
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Cover image if available */}
                  {pub.article.cover_image && (
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800">
                      <img
                        src={pub.article.cover_image}
                        alt={pub.article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {pub.article.title}
                    </h3>

                    {pub.article.excerpt && (
                      <p className="text-sm text-slate-600 dark:text-zinc-400 mb-3 line-clamp-3">
                        {pub.article.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white">
                          {pub.site.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-zinc-500">
                          Published at {new Date(pub.published_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {pub.article.article_type && (
                          <span className="text-xs text-slate-500 dark:text-zinc-500 capitalize">
                            {pub.article.article_type}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {pub.canonical_url && (
                          <a
                            href={pub.canonical_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Article →
                          </a>
                        )}
                        <button
                          onClick={() => router.push(`/article/${pub.article_id}`)}
                          className="text-sm px-3 py-1.5 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 rounded-lg text-slate-900 dark:text-white transition-colors"
                        >
                          Edit Article
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
