import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { mockSupabaseClient } from "@/tests/mocks/supabase";

// Mock the writer agent
vi.mock("@/agents/writer-agent", () => ({
  createWriterAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      fullArticle: `# Test Article

This is a test article with multiple sections.

## Section 1

Content for section 1.

## Section 2

Content for section 2.

## Conclusion

Concluding thoughts.`,
      sections: ["Section 1 content", "Section 2 content"],
    }),
  })),
}));

// Mock job queue
vi.mock("@/lib/job-queue", () => ({
  JobQueue: {
    createJob: vi.fn().mockResolvedValue({
      id: "test-job-id",
      type: "write_article",
      status: "pending",
      input: {},
      output: null,
      error: null,
      progress: null,
      user_id: "test-user-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    }),
  },
}));

// Mock article writer worker
vi.mock("@/lib/workers/article-writer-worker", () => ({
  processArticleWritingJob: vi.fn().mockResolvedValue(undefined),
}));

describe("Writer API - POST /api/agents/writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest("http://localhost:3000/api/agents/writer", {
      method: "POST",
      body: JSON.stringify({
        outlineId: "test-outline-id",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if request body is invalid", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/agents/writer", {
      method: "POST",
      body: JSON.stringify({
        // Missing required outlineId
        customInstructions: "Make it awesome",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should return 404 if outline is not found", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Outline not found" },
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/agents/writer", {
      method: "POST",
      body: JSON.stringify({
        outlineId: "non-existent-outline-id",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Outline not found");
  });

  it("should return 400 if outline is not approved", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "test-outline-id",
              approved: false, // Not approved
              topics: {
                id: "test-topic-id",
                industry_id: "test-industry-id",
                sources: [],
              },
              structure: {},
            },
            error: null,
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/agents/writer", {
      method: "POST",
      body: JSON.stringify({
        outlineId: "test-outline-id",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Outline must be approved before writing");
  });

  it("should create a background job when useBackgroundJob is true", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockOutline = {
      id: "test-outline-id",
      approved: true,
      topics: {
        id: "test-topic-id",
        industry_id: "test-industry-id",
        sources: [{ url: "https://example.com", title: "Source 1" }],
        industries: {
          id: "test-industry-id",
          name: "Tech",
          slug: "tech",
        },
      },
      structure: {
        title: "Test Article",
        hook: "Test hook",
        sections: [],
        conclusion: {},
        seoKeywords: [],
      },
      article_type: "blog",
      tone: "professional",
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockOutline,
            error: null,
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/agents/writer", {
      method: "POST",
      body: JSON.stringify({
        outlineId: "test-outline-id",
        useBackgroundJob: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobId).toBe("test-job-id");
    expect(data.message).toContain("Article generation started");
  });

  it("should successfully generate an article synchronously", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockOutline = {
      id: "test-outline-id",
      approved: true,
      topics: {
        id: "test-topic-id",
        title: "Test Topic",
        industry_id: "test-industry-id",
        sources: [{ url: "https://example.com", title: "Source 1" }],
        industries: {
          id: "test-industry-id",
          name: "Tech",
          slug: "tech",
        },
      },
      structure: {
        title: "Test Article Title",
        hook: "Test hook",
        sections: [
          {
            heading: "Section 1",
            keyPoints: ["Point 1"],
            wordTarget: 300,
          },
        ],
        conclusion: {
          summary: "Test summary",
          callToAction: "Test CTA",
        },
        seoKeywords: ["test", "article"],
      },
      article_type: "blog",
      tone: "professional",
    };

    const mockArticle = {
      id: "test-article-id",
      outline_id: "test-outline-id",
      title: "Test Article Title",
      slug: "test-article-title",
      content: "# Test Article\n\nContent here",
      content_html: "<h1>Test Article</h1><p>Content here</p>",
      excerpt: "Test excerpt",
      industry_id: "test-industry-id",
      article_type: "blog",
      status: "draft",
      word_count: 100,
      reading_time: 1,
      seo_keywords: ["test", "article"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: null,
      published_to: [],
    };

    let fromCallCount = 0;
    const mockFrom = vi.fn((table: string) => {
      fromCallCount++;

      if (table === "outlines") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockOutline,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "articles") {
        if (fromCallCount === 2) {
          // First call - select related articles
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        } else {
          // Second call - insert new article
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockArticle,
                  error: null,
                }),
              }),
            }),
          };
        }
      }

      if (table === "article_links" || table === "article_versions") {
        return {
          insert: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }

      if (table === "topics") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: { status: "used" },
              error: null,
            }),
          }),
        };
      }

      return {};
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/agents/writer", {
      method: "POST",
      body: JSON.stringify({
        outlineId: "test-outline-id",
        useBackgroundJob: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article).toBeDefined();
    expect(data.article.id).toBe("test-article-id");
    expect(data.saved).toBe(true);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.wordCount).toBeGreaterThan(0);
  });

  it("should handle article save failure gracefully", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockOutline = {
      id: "test-outline-id",
      approved: true,
      topics: {
        id: "test-topic-id",
        industry_id: "test-industry-id",
        sources: [],
        industries: {
          id: "test-industry-id",
        },
      },
      structure: {
        title: "Test Article",
        hook: "Test hook",
        sections: [],
        conclusion: {},
        seoKeywords: [],
      },
      article_type: "blog",
      tone: "professional",
    };

    const mockFrom = vi.fn((table: string) => {
      if (table === "outlines") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockOutline,
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
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          }),
        };
      }

      return {};
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/agents/writer", {
      method: "POST",
      body: JSON.stringify({
        outlineId: "test-outline-id",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.saved).toBe(false);
    expect(data.article.id).toContain("temp-");
    expect(data.error).toBeDefined();
  });
});
