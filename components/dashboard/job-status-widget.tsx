"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Job {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  created_at: string;
  completed_at?: string;
}

export function JobStatusWidget() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        const response = await fetch("/api/jobs");
        const data = await response.json();

        if (data.success && data.jobs) {
          // Filter to show only active/pending jobs, or recent completed/failed
          const activeJobs = data.jobs.filter(
            (job: Job) => job.status === "running" || job.status === "pending"
          );
          const recentCompleted = data.jobs
            .filter(
              (job: Job) => job.status === "completed" || job.status === "failed"
            )
            .slice(0, 2);

          setJobs([...activeJobs, ...recentCompleted].slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();

    // Poll for updates every 5 seconds if there are active jobs
    const interval = setInterval(() => {
      if (jobs.some((job) => job.status === "running" || job.status === "pending")) {
        fetchJobs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs]);

  const getStatusIcon = (status: Job["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    }
  };

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "running":
        return "text-blue-600 dark:text-blue-400";
      case "pending":
        return "text-yellow-600 dark:text-yellow-400";
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
    }
  };

  const formatJobType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Job Queue
        </h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-2 bg-slate-200 dark:bg-zinc-800 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Job Queue
      </h2>

      {jobs.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-zinc-400">No active jobs</p>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
            All tasks are complete
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatJobType(job.type)}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium ${getStatusColor(job.status)}`}
                >
                  {job.status}
                </span>
              </div>

              {job.status === "running" && job.progress !== undefined && (
                <div className="mb-2">
                  <div className="h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                    {job.progress}% complete
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-zinc-500">
                {job.status === "completed" || job.status === "failed"
                  ? `Finished ${formatRelativeTime(new Date(job.completed_at!))}`
                  : `Started ${formatRelativeTime(new Date(job.created_at))}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
