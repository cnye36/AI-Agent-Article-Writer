"use client";

import { cn } from "@/lib/utils";
import {
  getDaysInMonth,
  isSameDay,
  isToday,
  isSameMonth,
  formatDateForInput,
  groupPublicationsByDate,
} from "@/lib/calendar-utils";
import { CalendarEvent } from "./CalendarEvent";
import type { CalendarPublication } from "@/types";

interface CalendarGridProps {
  currentDate: Date;
  publications: CalendarPublication[];
  onDayClick: (date: Date, publications: CalendarPublication[]) => void;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({ currentDate, publications, onDayClick }: CalendarGridProps) {
  const days = getDaysInMonth(currentDate);
  const publicationsByDate = groupPublicationsByDate(publications);

  return (
    <div className="bg-white dark:bg-zinc-950 flex-1 overflow-auto">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-950 z-10">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-semibold text-slate-700 dark:text-zinc-300 border-r border-slate-200 dark:border-zinc-800 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 auto-rows-fr" style={{ minHeight: "600px" }}>
        {days.map((day) => {
          const dateKey = formatDateForInput(day);
          const dayPublications = publicationsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-b border-slate-200 dark:border-zinc-800 p-2 min-h-[120px] relative",
                "last:border-r-0",
                !isCurrentMonth && "bg-slate-50 dark:bg-zinc-900/50",
                isCurrentMonth && "bg-white dark:bg-zinc-950",
                dayPublications.length > 0 && "cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/50"
              )}
              onClick={() => {
                if (dayPublications.length > 0) {
                  onDayClick(day, dayPublications);
                }
              }}
            >
              {/* Day number */}
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-2",
                  isTodayDay && "bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2",
                  !isTodayDay && isCurrentMonth && "text-slate-900 dark:text-white",
                  !isTodayDay && !isCurrentMonth && "text-slate-400 dark:text-zinc-600"
                )}
              >
                {day.getDate()}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayPublications.slice(0, 3).map((pub) => (
                  <CalendarEvent key={pub.id} publication={pub} compact />
                ))}
                {dayPublications.length > 3 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium px-1.5">
                    +{dayPublications.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
