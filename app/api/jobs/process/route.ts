import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JobQueue } from "@/lib/job-queue";
import { processArticleWritingJob } from "@/lib/workers/article-writer-worker";

/**
 * POST /api/jobs/process - Trigger background job processing
 * This endpoint processes pending jobs in the background
 *
 * In production, this would be triggered by:
 * - A cron job (every minute)
 * - A message queue (Redis, RabbitMQ)
 * - A serverless function trigger
 * - Vercel Cron Jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron or authenticated user
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
      // Also allow authenticated users to trigger manually
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized - Invalid cron secret or authentication" },
          { status: 401 }
        );
      }
    }

    const supabase = await createClient();

    // Get pending jobs
    const pendingJobs = await JobQueue.getPendingJobs(5); // Process up to 5 jobs

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending jobs to process",
        processed: 0,
      });
    }

    // Process jobs based on their type
    const results = await Promise.allSettled(
      pendingJobs.map(async (job) => {
        try {
          switch (job.type) {
            case "write_article":
              await processArticleWritingJob(job.id);
              return { jobId: job.id, status: "completed" };

            case "generate_outline":
              // TODO: Implement outline generation worker
              throw new Error("Outline generation not yet implemented");

            case "research_topics":
              // TODO: Implement research worker
              throw new Error("Research not yet implemented");

            default:
              throw new Error(`Unknown job type: ${job.type}`);
          }
        } catch (error) {
          console.error(`Failed to process job ${job.id}:`, error);
          return {
            jobId: job.id,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const processed = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: pendingJobs.length,
      results: results.map((r, i) => ({
        jobId: pendingJobs[i].id,
        status: r.status,
        value: r.status === "fulfilled" ? r.value : undefined,
        reason: r.status === "rejected" ? r.reason : undefined,
      })),
    });
  } catch (error) {
    console.error("Error processing jobs:", error);
    return NextResponse.json(
      {
        error: "Failed to process jobs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/process - Get processing status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get job statistics
    const pendingJobs = await JobQueue.getPendingJobs(100);
    const runningJobs = await JobQueue.getUserJobs(user.id, {
      status: "running",
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      stats: {
        pending: pendingJobs.length,
        running: runningJobs.length,
      },
    });
  } catch (error) {
    console.error("Error getting processing status:", error);
    return NextResponse.json(
      {
        error: "Failed to get processing status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
