import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSupabaseClient } from "@/tests/mocks/supabase";

describe("Article Generation Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup authenticated state
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });
  });

  it("should complete full article generation pipeline", async () => {
    // Step 1: Research topics
    const mockTopics = [
      {
        id: "topic-1",
        title: "AI in Healthcare",
        summary: "How AI is transforming healthcare",
        industry_id: "tech-industry-id",
        sources: [
          { url: "https://example.com/ai-healthcare", title: "AI Healthcare" },
        ],
        relevance_score: 0.95,
        status: "pending",
        discovered_at: new Date().toISOString(),
      },
    ];

    const { POST: researchPost } = await import(
      "@/app/api/agents/research/route"
    );
    const researchRequest = {
      json: async () => ({
        industry: "tech",
        keywords: ["artificial intelligence", "healthcare"],
        maxTopics: 5,
      }),
    } as any;

    const researchResponse = await researchPost(researchRequest);
    const researchData = await researchResponse.json();
    expect(researchData.success).toBe(true);
    expect(researchData.topics).toBeDefined();

    // Step 2: Select a topic and generate outline
    const selectedTopic = mockTopics[0];

    const mockFrom = vi.fn((table: string) => {
      if (table === "topics") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: selectedTopic,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "outlines") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "outline-1",
                  topic_id: "topic-1",
                  structure: {
                    title: "AI in Healthcare: Transforming Medical Diagnosis",
                    hook: "Artificial intelligence is revolutionizing healthcare",
                    sections: [
                      {
                        heading: "Introduction to AI in Medicine",
                        keyPoints: [
                          "Current state of AI in healthcare",
                          "Benefits and challenges",
                        ],
                        wordTarget: 400,
                      },
                      {
                        heading: "AI Applications in Diagnosis",
                        keyPoints: [
                          "Image recognition",
                          "Pattern detection",
                        ],
                        wordTarget: 500,
                      },
                    ],
                    conclusion: {
                      summary: "AI is transforming healthcare delivery",
                      callToAction: "Stay informed about AI developments",
                    },
                    seoKeywords: ["AI", "healthcare", "medical diagnosis"],
                  },
                  article_type: "technical",
                  target_length: "long",
                  tone: "professional",
                  approved: false,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "articles") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      return {};
    });

    mockSupabaseClient.from = mockFrom;

    const { POST: outlinePost } = await import(
      "@/app/api/agents/outline/route"
    );
    const outlineRequest = {
      json: async () => ({
        topicId: "topic-1",
        articleType: "technical",
        targetLength: "long",
        tone: "professional",
      }),
    } as any;

    const outlineResponse = await outlinePost(outlineRequest);
    const outlineData = await outlineResponse.json();

    expect(outlineData.success).toBe(true);
    expect(outlineData.outline).toBeDefined();
    expect(outlineData.outline.structure.sections).toHaveLength(2);

    // Step 3: Approve outline
    const approveFrom = vi.fn((table: string) => {
      if (table === "outlines") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...outlineData.outline, approved: true },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockSupabaseClient.from = approveFrom;

    const { PATCH: outlinePatch } = await import(
      "@/app/api/agents/outline/route"
    );
    const approveRequest = {
      json: async () => ({
        outlineId: outlineData.outline.id,
        approved: true,
      }),
    } as any;

    const approveResponse = await outlinePatch(approveRequest);
    const approveData = await approveResponse.json();

    expect(approveData.success).toBe(true);
    expect(approveData.outline.approved).toBe(true);

    // Step 4: Generate article using background job
    const mockJob = {
      id: "job-123",
      type: "write_article",
      status: "pending",
      input: {
        outlineId: outlineData.outline.id,
      },
      output: null,
      error: null,
      progress: null,
      user_id: "test-user-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };

    const writerFrom = vi.fn((table: string) => {
      if (table === "outlines") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...outlineData.outline,
                  approved: true,
                  topics: {
                    id: "topic-1",
                    industry_id: "tech-industry-id",
                    sources: [],
                    industries: {
                      id: "tech-industry-id",
                      name: "Tech",
                      slug: "tech",
                    },
                  },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "jobs") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockJob,
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockSupabaseClient.from = writerFrom;

    const { POST: writerPost } = await import(
      "@/app/api/agents/writer/route"
    );
    const writerRequest = {
      json: async () => ({
        outlineId: outlineData.outline.id,
        useBackgroundJob: true,
      }),
    } as any;

    const writerResponse = await writerPost(writerRequest);
    const writerData = await writerResponse.json();

    expect(writerData.success).toBe(true);
    expect(writerData.jobId).toBe("job-123");
    expect(writerData.message).toContain("Article generation started");

    // Step 5: Poll job status
    const jobFrom = vi.fn((table: string) => {
      if (table === "jobs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...mockJob,
                  status: "completed",
                  output: {
                    articleId: "article-123",
                    article: {
                      id: "article-123",
                      title: "AI in Healthcare: Transforming Medical Diagnosis",
                      content: "# AI in Healthcare...",
                      status: "draft",
                    },
                    metadata: {
                      wordCount: 1500,
                      readingTime: 8,
                      sectionsWritten: 2,
                    },
                  },
                  progress: {
                    current: 100,
                    total: 100,
                    message: "Article completed successfully!",
                  },
                  completed_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockSupabaseClient.from = jobFrom;

    const { GET: jobGet } = await import("@/app/api/jobs/[id]/route");
    const jobRequest = {
      url: `http://localhost:3000/api/jobs/${mockJob.id}`,
    } as any;
    const jobParams = Promise.resolve({ id: mockJob.id });

    const jobResponse = await jobGet(jobRequest, { params: jobParams });
    const jobData = await jobResponse.json();

    expect(jobData.success).toBe(true);
    expect(jobData.job.status).toBe("completed");
    expect(jobData.job.output.articleId).toBe("article-123");
    expect(jobData.job.output.metadata.wordCount).toBe(1500);
  });

  it("should handle errors gracefully throughout the pipeline", async () => {
    // Test research failure
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    });

    const { POST: researchPost } = await import(
      "@/app/api/agents/research/route"
    );
    const researchRequest = {
      json: async () => ({
        industry: "tech",
      }),
    } as any;

    const researchResponse = await researchPost(researchRequest);

    expect(researchResponse.status).toBeGreaterThanOrEqual(400);
  });

  it("should support cancelling a job", async () => {
    const mockJob = {
      id: "job-to-cancel",
      type: "write_article",
      status: "running",
      user_id: "test-user-id",
    };

    const jobFrom = vi.fn((table: string) => {
      if (table === "jobs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockJob,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: { ...mockJob, status: "cancelled" },
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    mockSupabaseClient.from = jobFrom;

    const { PATCH: jobPatch } = await import("@/app/api/jobs/[id]/route");
    const cancelRequest = {
      json: async () => ({ action: "cancel" }),
    } as any;
    const params = Promise.resolve({ id: "job-to-cancel" });

    const cancelResponse = await jobPatch(cancelRequest, { params });
    const cancelData = await cancelResponse.json();

    expect(cancelData.success).toBe(true);
    expect(cancelData.message).toContain("cancelled");
  });
});
