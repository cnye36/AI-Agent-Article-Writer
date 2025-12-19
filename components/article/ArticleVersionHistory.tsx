"use client";

import { formatRelativeTime } from "@/lib/utils";
import type { ArticleVersion } from "@/types";

interface ArticleVersionHistoryProps {
  versions: ArticleVersion[];
}

export function ArticleVersionHistory({
  versions,
}: ArticleVersionHistoryProps) {
  return (
    <section className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Version History</h2>
      {versions.length > 0 ? (
        <div className="space-y-2">
          {versions.slice(0, 5).map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700"
            >
              <div>
                <p className="text-sm text-slate-900 dark:text-white">
                  {version.change_summary || "No description"}
                </p>
                <p className="text-xs text-slate-600 dark:text-zinc-500">
                  {formatRelativeTime(version.created_at)} by{" "}
                  {version.edited_by}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-600 dark:text-zinc-500 text-sm">No version history</p>
      )}
    </section>
  );
}

