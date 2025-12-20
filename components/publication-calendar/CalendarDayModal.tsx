"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CalendarEvent } from "./CalendarEvent";
import type { CalendarPublication } from "@/types";

interface CalendarDayModalProps {
  isOpen: boolean;
  date: Date | null;
  publications: CalendarPublication[];
  onClose: () => void;
  onEventClick?: (publication: CalendarPublication) => void;
}

export function CalendarDayModal({
  isOpen,
  date,
  publications,
  onClose,
  onEventClick,
}: CalendarDayModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !date) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Publications on {formatDate(date, { month: "long", day: "numeric", year: "numeric" })}
            </h3>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
              {publications.length} {publications.length === 1 ? "publication" : "publications"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {publications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-zinc-400">
                No publications on this date
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {publications.map((pub) => (
                <div
                  key={pub.id}
                  className="border border-slate-200 dark:border-zinc-800 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                    {pub.article.title}
                  </h4>
                  {pub.article.excerpt && (
                    <p className="text-sm text-slate-600 dark:text-zinc-400 mb-3 line-clamp-2">
                      {pub.article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-blue-600 text-white">
                        {pub.site.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-500">
                        {new Date(pub.published_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pub.canonical_url && (
                        <a
                          href={pub.canonical_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View Article →
                        </a>
                      )}
                      {onEventClick && (
                        <button
                          onClick={() => onEventClick(pub)}
                          className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
