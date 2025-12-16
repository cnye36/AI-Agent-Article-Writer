import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST, PUT, DELETE } from "./route";
import { NextRequest } from "next/server";
import { mockSupabaseClient } from "@/tests/mocks/supabase";

describe("Articles API - GET /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest("http://localhost:3000/api/articles");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should retrieve a single article by ID", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockArticle = {
      id: "test-article-id",
      title: "Test Article",
      slug: "test-article",
      content: "Test content",
      status: "draft",
      created_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockArticle,
            error: null,
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest(
      "http://localhost:3000/api/articles?id=test-article-id"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article).toEqual(mockArticle);
  });

  it("should list all articles with pagination", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockArticles = [
      {
        id: "article-1",
        title: "Article 1",
        status: "draft",
        created_at: new Date().toISOString(),
      },
      {
        id: "article-2",
        title: "Article 2",
        status: "published",
        created_at: new Date().toISOString(),
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockArticles,
            error: null,
            count: 2,
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest(
      "http://localhost:3000/api/articles?limit=20&offset=0"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.articles).toHaveLength(2);
    expect(data.pagination).toBeDefined();
  });

  it("should search articles by query string", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockArticles = [
      {
        id: "article-1",
        title: "JavaScript Tutorial",
        content: "Learn JavaScript",
        status: "published",
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        textSearch: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockArticles,
              error: null,
              count: 1,
            }),
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest(
      "http://localhost:3000/api/articles?query=JavaScript"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.articles).toHaveLength(1);
    expect(data.articles[0].title).toContain("JavaScript");
  });
});

describe("Articles API - POST /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest("http://localhost:3000/api/articles", {
      method: "POST",
      body: JSON.stringify({
        title: "New Article",
        content: "Content here",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should create a new article", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const newArticle = {
      id: "new-article-id",
      title: "New Article",
      slug: "new-article",
      content: "Content here",
      industry_id: "test-industry-id",
      article_type: "blog",
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: newArticle,
            error: null,
          }),
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/articles", {
      method: "POST",
      body: JSON.stringify({
        title: "New Article",
        content: "Content here",
        industryId: "test-industry-id",
        articleType: "blog",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article).toEqual(newArticle);
  });
});

describe("Articles API - PUT /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest("http://localhost:3000/api/articles", {
      method: "PUT",
      body: JSON.stringify({
        id: "test-article-id",
        title: "Updated Title",
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should update an existing article", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const updatedArticle = {
      id: "test-article-id",
      title: "Updated Title",
      content: "Updated content",
      status: "review",
      updated_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn((table: string) => {
      if (table === "articles") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedArticle,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "article_versions") {
        return {
          insert: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        };
      }
      return {};
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/articles", {
      method: "PUT",
      body: JSON.stringify({
        id: "test-article-id",
        title: "Updated Title",
        content: "Updated content",
        status: "review",
        saveVersion: true,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article.title).toBe("Updated Title");
  });

  it("should create a version when saveVersion is true", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const versionInsertMock = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === "articles") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "test-article-id", content: "New content" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "article_versions") {
        return {
          insert: versionInsertMock,
        };
      }
      return {};
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest("http://localhost:3000/api/articles", {
      method: "PUT",
      body: JSON.stringify({
        id: "test-article-id",
        content: "New content",
        saveVersion: true,
      }),
    });

    await PUT(request);

    expect(versionInsertMock).toHaveBeenCalled();
  });
});

describe("Articles API - DELETE /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/articles?id=test-article-id",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should delete an article", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest(
      "http://localhost:3000/api/articles?id=test-article-id",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Article deleted successfully");
  });

  it("should handle delete errors gracefully", async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Failed to delete" },
        }),
      }),
    });

    mockSupabaseClient.from = mockFrom;

    const request = new NextRequest(
      "http://localhost:3000/api/articles?id=test-article-id",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete article");
  });
});
