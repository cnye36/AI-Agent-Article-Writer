import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JobQueue } from "@/lib/job-queue";
import type { JobType, JobStatus } from "@/types";

// Force dynamic rendering - this route uses cookies for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs - List user's jobs
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as JobStatus | null;
    const type = searchParams.get("type") as JobType | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const jobs = await JobQueue.getUserJobs(user.id, {
      status: status || undefined,
      type: type || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        limit,
        offset,
        hasMore: jobs.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch jobs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
