"use client";

import { cn } from "@/lib/utils";
import {
  getWeekDays,
  getShortDayName,
  isToday,
  formatDateForInput,
  groupPublicationsByDate,
} from "@/lib/calendar-utils";
import { CalendarEvent } from "./CalendarEvent";
import type { CalendarPublication } from "@/types";

interface CalendarWeekViewProps {
  currentDate: Date;
  publications: CalendarPublication[];
  onEventClick?: (publication: CalendarPublication) => void;
}

export function CalendarWeekView({
  currentDate,
  publications,
  onEventClick,
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const publicationsByDate = groupPublicationsByDate(publications);

  return (
    <div className="bg-white dark:bg-zinc-950 flex-1 overflow-auto">
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-zinc-800" style={{ minHeight: "600px" }}>
        {weekDays.map((day) => {
          const dateKey = formatDateForInput(day);
          const dayPublications = publicationsByDate[dateKey] || [];
          const isTodayDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className="bg-white dark:bg-zinc-950 flex flex-col"
            >
              {/* Day header */}
              <div className={cn(
                "p-3 border-b border-slate-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-950 z-10",
                isTodayDay && "bg-blue-50 dark:bg-blue-900/20"
              )}>
                <div className="text-center">
                  <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium mb-1">
                    {getShortDayName(day)}
                  </div>
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold",
                      isTodayDay
                        ? "bg-blue-600 text-white"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {day.getDate()}
                  </div>
                </div>
              </div>

              {/* Events */}
              <div className="p-2 space-y-2 overflow-y-auto">
                {dayPublications.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 dark:text-zinc-600">
                    No publications
                  </div>
                ) : (
                  dayPublications.map((pub) => (
                    <div key={pub.id}>
                      <CalendarEvent
                        publication={pub}
                        onClick={() => onEventClick?.(pub)}
                      />
                      {pub.article.excerpt && (
                        <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 px-1.5 line-clamp-2">
                          {pub.article.excerpt}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
