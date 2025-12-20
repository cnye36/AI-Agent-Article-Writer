"use client";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMonthName, formatDateForInput } from "@/lib/calendar-utils";
import type { CalendarViewMode, PublishingSite } from "@/types";

interface CalendarControlsProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  selectedSiteIds: string[];
  sites: PublishingSite[];
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onSiteFilterChange: (siteIds: string[]) => void;
}

export function CalendarControls({
  currentDate,
  viewMode,
  selectedSiteIds,
  sites,
  onDateChange,
  onViewModeChange,
  onSiteFilterChange,
}: CalendarControlsProps) {
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      onDateChange(newDate);
    }
  };

  const handleSiteFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selected: string[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected && options[i].value) {
        selected.push(options[i].value);
      }
    }
    onSiteFilterChange(selected);
  };

  const getDisplayText = () => {
    if (viewMode === "month") {
      return `${getMonthName(currentDate)} ${currentDate.getFullYear()}`;
    } else if (viewMode === "week") {
      return `Week of ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4">
      <div className="flex flex-col gap-4">
        {/* Top row: Navigation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
            </button>

            <div className="relative">
              <input
                type="date"
                value={formatDateForInput(currentDate)}
                onChange={handleDateInputChange}
                className="w-40 px-3 py-2 pl-10 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            </div>

            <button
              onClick={handleNext}
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
            </button>

            <span className="text-lg font-semibold text-slate-900 dark:text-white ml-2">
              {getDisplayText()}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-slate-100 dark:bg-zinc-900 rounded-lg p-1">
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  viewMode === mode
                    ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800"
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom row: Platform filter */}
        {sites.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              Filter by platform:
            </label>
            <select
              multiple={false}
              value={selectedSiteIds.length === 1 ? selectedSiteIds[0] : ""}
              onChange={(e) => {
                const value = e.target.value;
                onSiteFilterChange(value ? [value] : []);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Platforms</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            {selectedSiteIds.length > 0 && (
              <button
                onClick={() => onSiteFilterChange([])}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
