import { createClient } from "@/lib/supabase/server";
import type { Job, JobType, JobStatus, JobProgress, JobError } from "@/types";

export class JobQueue {
  /**
   * Create a new job and save it to the database
   */
  static async createJob<TInput = any>(
    type: JobType,
    input: TInput,
    userId: string
  ): Promise<Job> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        type,
        status: "pending",
        input,
        user_id: userId,
        output: null,
        error: null,
        progress: null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create job: ${error?.message || "Unknown error"}`);
    }

    return data as Job;
  }

  /**
   * Get a job by ID
   */
  static async getJob(jobId: string): Promise<Job | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Job;
  }

  /**
   * Update job status
   */
  static async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates?: {
      output?: any;
      error?: JobError;
      progress?: JobProgress;
    }
  ): Promise<void> {
    const supabase = await createClient();

    const updateData: any = { status };

    if (status === "running" && !updates) {
      updateData.started_at = new Date().toISOString();
    }

    if (status === "completed" || status === "failed") {
      updateData.completed_at = new Date().toISOString();
    }

    if (updates?.output !== undefined) {
      updateData.output = updates.output;
    }

    if (updates?.error !== undefined) {
      updateData.error = updates.error;
    }

    if (updates?.progress !== undefined) {
      updateData.progress = updates.progress;
    }

    const { error } = await supabase
      .from("jobs")
      .update(updateData)
      .eq("id", jobId);

    if (error) {
      console.error(`Failed to update job ${jobId}:`, error);
      throw new Error(`Failed to update job: ${error.message}`);
    }
  }

  /**
   * Update job progress
   */
  static async updateJobProgress(
    jobId: string,
    progress: JobProgress
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("jobs")
      .update({ progress })
      .eq("id", jobId);

    if (error) {
      console.error(`Failed to update job progress ${jobId}:`, error);
    }
  }

  /**
   * Mark job as completed with output
   */
  static async completeJob<TOutput = any>(
    jobId: string,
    output: TOutput
  ): Promise<void> {
    await this.updateJobStatus(jobId, "completed", { output });
  }

  /**
   * Mark job as failed with error
   */
  static async failJob(jobId: string, error: JobError): Promise<void> {
    await this.updateJobStatus(jobId, "failed", { error });
  }

  /**
   * Cancel a job
   */
  static async cancelJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, "cancelled");
  }

  /**
   * Get all jobs for a user
   */
  static async getUserJobs(
    userId: string,
    options?: {
      status?: JobStatus;
      type?: JobType;
      limit?: number;
      offset?: number;
    }
  ): Promise<Job[]> {
    const supabase = await createClient();

    let query = supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.type) {
      query = query.eq("type", options.type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch user jobs:", error);
      return [];
    }

    return (data as Job[]) || [];
  }

  /**
   * Get pending jobs for processing
   */
  static async getPendingJobs(limit: number = 10): Promise<Job[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch pending jobs:", error);
      return [];
    }

    return (data as Job[]) || [];
  }

  /**
   * Clean up old completed/failed jobs
   */
  static async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const supabase = await createClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error, count } = await supabase
      .from("jobs")
      .delete()
      .in("status", ["completed", "failed", "cancelled"])
      .lt("completed_at", cutoffDate.toISOString());

    if (error) {
      console.error("Failed to cleanup old jobs:", error);
      return 0;
    }

    return count || 0;
  }
}
