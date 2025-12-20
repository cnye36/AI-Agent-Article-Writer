"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "@/lib/calendar-utils";
import { CalendarControls } from "./CalendarControls";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarDayModal } from "./CalendarDayModal";
import type { CalendarPublication, CalendarViewMode, PublishingSite } from "@/types";

export function PublicationCalendar() {
  const router = useRouter();

  // State
  const [publications, setPublications] = useState<CalendarPublication[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [sites, setSites] = useState<PublishingSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [selectedDayPublications, setSelectedDayPublications] = useState<CalendarPublication[]>([]);

  // Fetch publishing sites on mount
  useEffect(() => {
    fetchSites();
  }, []);

  // Fetch publications when date range or filters change
  useEffect(() => {
    fetchPublications();
  }, [currentDate, viewMode, selectedSiteIds]);

  const fetchSites = async () => {
    try {
      const response = await fetch("/api/publishing-sites");
      const data = await response.json();
      if (data.sites) {
        setSites(data.sites);
      }
    } catch (err) {
      console.error("Error fetching sites:", err);
    }
  };

  const fetchPublications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate date range based on view mode
      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (viewMode === "week") {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      }

      // Build query params
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (selectedSiteIds.length > 0) {
        params.set("siteIds", selectedSiteIds.join(","));
      }

      const response = await fetch(`/api/publications/calendar?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch publications");
      }

      setPublications(data.publications || []);
    } catch (err) {
      console.error("Error fetching publications:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch publications");
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, viewMode, selectedSiteIds]);

  const handleDayClick = (date: Date, dayPublications: CalendarPublication[]) => {
    setSelectedDayDate(date);
    setSelectedDayPublications(dayPublications);
  };

  const handleEventClick = (publication: CalendarPublication) => {
    router.push(`/article/${publication.article_id}`);
  };

  const handleCloseModal = () => {
    setSelectedDayDate(null);
    setSelectedDayPublications([]);
  };

  // Filter publications for current view
  const getFilteredPublications = () => {
    if (viewMode === "day") {
      // For day view, only show publications on the selected day
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);
      return publications.filter((pub) => {
        const pubDate = new Date(pub.published_at);
        return pubDate >= dayStart && pubDate <= dayEnd;
      });
    }
    return publications;
  };

  const filteredPublications = getFilteredPublications();

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <CalendarControls
        currentDate={currentDate}
        viewMode={viewMode}
        selectedSiteIds={selectedSiteIds}
        sites={sites}
        onDateChange={setCurrentDate}
        onViewModeChange={setViewMode}
        onSiteFilterChange={setSelectedSiteIds}
      />

      {/* Loading/Error states */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-zinc-400">Loading publications...</p>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
          <div className="text-center max-w-md">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchPublications}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Calendar views */}
      {!isLoading && !error && (
        <>
          {viewMode === "month" && (
            <CalendarGrid
              currentDate={currentDate}
              publications={filteredPublications}
              onDayClick={handleDayClick}
            />
          )}

          {viewMode === "week" && (
            <CalendarWeekView
              currentDate={currentDate}
              publications={filteredPublications}
              onEventClick={handleEventClick}
            />
          )}

          {viewMode === "day" && (
            <CalendarDayView
              currentDate={currentDate}
              publications={filteredPublications}
            />
          )}

          {/* Empty state */}
          {filteredPublications.length === 0 && (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
              <div className="text-center max-w-md">
                <p className="text-slate-600 dark:text-zinc-400 mb-4">
                  No publications found for this period.
                </p>
                {selectedSiteIds.length > 0 && (
                  <button
                    onClick={() => setSelectedSiteIds([])}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear platform filter
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Day detail modal */}
      <CalendarDayModal
        isOpen={!!selectedDayDate}
        date={selectedDayDate}
        publications={selectedDayPublications}
        onClose={handleCloseModal}
        onEventClick={handleEventClick}
      />
    </div>
  );
}
