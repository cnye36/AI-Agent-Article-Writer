import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET, PATCH, PUT } from "./route";
import { NextRequest } from "next/server";
import { mockSupabaseClient } from "@/tests/mocks/supabase";

// Mock the outline agent
vi.mock("@/agents/outline-agent", () => ({
  createOutlineAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      outline: {
        title: "Test Article Title",
        hook: "Test hook content",
        sections: [
          {
            heading: "Introduction",
            keyPoints: ["Point 1", "Point 2"],
            wordTarget: 300,
          },
          {
            heading: "Main Content",
            keyPoints: ["Point 3", "Point 4"],
            wordTarget: 500,
          },
        ],
        conclusion: {
          summary: "Test summary",
          callToAction: "Test CTA",
        },
        seoKeywords: ["test", "article"],
      },
    }),
  })),
}));

describe("Outline API - POST /api/agents/outline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    // Mock unauthenticated state
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest("http://localhost:3000/api/agents/outline", {
      method: "POST",
      body: JSON.stringify({
        topicId: "test-topic-id",
        articleType: "blog",
        targetLength: "medium",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if request body is invalid", async () => {
    // Mock authenticated state
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/agents/outline", {
      method: "POST",
      body: JSON.stringify({
        // Missing required fields
        articleType: "blog",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should return 404 if topic is not found", async () => {
    // Mock authenticated state
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    // Mock topic not found
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Topic not found" },
          }),
        }),
      }),
    });
    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/agents/outline", {
      method: "POST",
      body: JSON.stringify({
        topicId: "non-existent-topic-id",
        articleType: "blog",
        targetLength: "medium",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Topic not found");
  });

  it("should successfully generate an outline", async () => {
    // Mock authenticated state
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    // Mock topic found
    const mockTopicSelect = vi.fn().mockResolvedValue({
      data: {
        id: "test-topic-id",
        title: "Test Topic",
        summary: "Test summary",
        sources: [{ url: "https://example.com", title: "Source 1" }],
        industry_id: "test-industry-id",
      },
      error: null,
    });

    // Mock outline insert
    const mockOutlineInsert = vi.fn().mockResolvedValue({
      data: {
        id: "test-outline-id",
        topic_id: "test-topic-id",
        structure: {
          title: "Test Article Title",
          hook: "Test hook",
          sections: [],
          conclusion: {},
          seoKeywords: [],
        },
        article_type: "blog",
        target_length: "medium",
        tone: "professional",
        approved: false,
        created_at: new Date().toISOString(),
      },
      error: null,
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === "topics") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockTopicSelect,
            }),
          }),
        };
      }
      if (table === "outlines") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockOutlineInsert,
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

    const request = new NextRequest("http://localhost:3000/api/agents/outline", {
      method: "POST",
      body: JSON.stringify({
        topicId: "test-topic-id",
        articleType: "blog",
        targetLength: "medium",
        tone: "professional",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.outline).toBeDefined();
    expect(data.outline.id).toBe("test-outline-id");
  });
});

describe("Outline API - GET /api/agents/outline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/agents/outline?id=test-outline-id"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
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

    const request = new NextRequest(
      "http://localhost:3000/api/agents/outline?id=non-existent-outline-id"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Outline not found");
  });

  it("should successfully retrieve an outline", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockOutline = {
      id: "test-outline-id",
      topic_id: "test-topic-id",
      structure: {
        title: "Test Article Title",
        hook: "Test hook",
        sections: [],
        conclusion: {},
        seoKeywords: [],
      },
      article_type: "blog",
      target_length: "medium",
      tone: "professional",
      approved: false,
      created_at: new Date().toISOString(),
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

    const request = new NextRequest(
      "http://localhost:3000/api/agents/outline?id=test-outline-id"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.outline).toEqual(mockOutline);
  });
});

describe("Outline API - PATCH /api/agents/outline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest("http://localhost:3000/api/agents/outline", {
      method: "PATCH",
      body: JSON.stringify({
        outlineId: "test-outline-id",
        approved: true,
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should successfully approve an outline", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockUpdate = vi.fn().mockResolvedValue({
      data: {
        id: "test-outline-id",
        approved: true,
      },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockUpdate,
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/agents/outline", {
      method: "PATCH",
      body: JSON.stringify({
        outlineId: "test-outline-id",
        approved: true,
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.outline.approved).toBe(true);
  });
});
