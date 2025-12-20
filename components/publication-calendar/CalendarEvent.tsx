"use client";

import { cn } from "@/lib/utils";
import type { CalendarPublication } from "@/types";

interface CalendarEventProps {
  publication: CalendarPublication;
  onClick?: () => void;
  compact?: boolean;
}

// Platform color scheme generator
const platformColors = [
  "bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-900 dark:text-blue-100",
  "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-900 dark:text-green-100",
  "bg-purple-100 dark:bg-purple-900/30 border-purple-500 text-purple-900 dark:text-purple-100",
  "bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-900 dark:text-orange-100",
  "bg-pink-100 dark:bg-pink-900/30 border-pink-500 text-pink-900 dark:text-pink-100",
  "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500 text-indigo-900 dark:text-indigo-100",
  "bg-teal-100 dark:bg-teal-900/30 border-teal-500 text-teal-900 dark:text-teal-100",
  "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-500 text-cyan-900 dark:text-cyan-100",
];

function getPlatformColor(siteId: string | null): string {
  // Default color for articles without a site
  if (!siteId || siteId === "no-site") {
    return "bg-slate-100 dark:bg-slate-800/50 border-slate-400 text-slate-700 dark:text-slate-300";
  }

  const hash = siteId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return platformColors[hash % platformColors.length];
}

export function CalendarEvent({ publication, onClick, compact = false }: CalendarEventProps) {
  const colorClass = getPlatformColor(publication.site_id || null);

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded border-l-2 transition-all",
        compact ? "text-xs p-1.5 mb-1" : "text-sm p-2.5 mb-2",
        onClick && "cursor-pointer hover:shadow-md",
        colorClass
      )}
      title={`${publication.article.title} - ${publication.site.name}`}
    >
      <div className={cn("font-medium truncate", compact && "text-xs")}>
        {publication.article.title}
      </div>
      <div className="text-xs opacity-75 truncate mt-0.5">
        {publication.site.name}
      </div>
    </div>
  );
}
