import { useState, useEffect, useCallback, useRef } from "react";
import type { Job, WriteArticleJobOutput } from "@/types";

interface UseJobPollingOptions {
  jobId: string | null;
  enabled?: boolean;
  pollInterval?: number;
  onComplete?: (output: any) => void;
  onError?: (error: any) => void;
}

interface UseJobPollingReturn {
  job: Job | null;
  isLoading: boolean;
  error: string | null;
  progress: number;
  progressMessage: string;
  cancel: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to poll for job status updates
 */
export function useJobPolling({
  jobId,
  enabled = true,
  pollInterval = 2000, // Poll every 2 seconds
  onComplete,
  onError,
}: UseJobPollingOptions): UseJobPollingReturn {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch job");
      }

      const data = await response.json();
      const fetchedJob = data.job as Job;

      setJob(fetchedJob);
      setError(null);

      // Stop polling if job is in a terminal state
      if (["completed", "failed", "cancelled"].includes(fetchedJob.status)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Call completion/error callbacks
        if (fetchedJob.status === "completed" && onCompleteRef.current) {
          onCompleteRef.current(fetchedJob.output);
        } else if (fetchedJob.status === "failed" && onErrorRef.current) {
          onErrorRef.current(fetchedJob.error);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching job:", err);

      // Stop polling on error
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [jobId]);

  const cancel = useCallback(async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cancel" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel job");
      }

      await fetchJob();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error cancelling job:", err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, fetchJob]);

  // Start/stop polling based on jobId and enabled
  useEffect(() => {
    if (!jobId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchJob();

    // Set up polling interval
    intervalRef.current = setInterval(fetchJob, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, enabled, pollInterval, fetchJob]);

  // Calculate progress percentage
  const progress = job?.progress
    ? Math.round((job.progress.current / job.progress.total) * 100)
    : 0;

  const progressMessage = job?.progress?.message || "Processing...";

  return {
    job,
    isLoading,
    error,
    progress,
    progressMessage,
    cancel,
    refetch: fetchJob,
  };
}

/**
 * Hook to fetch all jobs for the current user
 */
export function useJobs(options?: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.status) params.append("status", options.status);
      if (options?.type) params.append("type", options.type);
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());

      const response = await fetch(`/api/jobs?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch jobs");
      }

      const data = await response.json();
      setJobs(data.jobs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching jobs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    refetch: fetchJobs,
  };
}
