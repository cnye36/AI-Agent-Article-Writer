"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getClient } from "@/lib/supabase/client";
import {
  cn,
  formatDate,
  formatRelativeTime,
  getStatusConfig,
  getArticleTypeLabel,
  truncate,
  copyToClipboard,
  downloadAsFile,
} from "@/lib/utils";
import type { Article, Industry, ArticleType, ArticleStatus } from "@/types";

interface ArticleLibraryProps {
  onEditArticle?: (article: Article) => void;
}

export function ArticleLibrary({ onEditArticle }: ArticleLibraryProps) {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ArticleType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ArticleStatus | null>(null);
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const supabase = getClient();

  // Fetch industries
  const fetchIndustries = useCallback(async () => {
    const { data } = await supabase
      .from("industries")
      .select("*")
      .order("name");

    if (data) {
      setIndustries(data);
    }
  }, [supabase]);

  // Fetch articles
  const fetchArticles = useCallback(async (offset = 0) => {
    setIsLoading(true);

    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (selectedIndustry) params.set("industryId", selectedIndustry);
    if (selectedType) params.set("articleType", selectedType);
    if (selectedStatus) params.set("status", selectedStatus);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    params.set("limit", "20");
    params.set("offset", String(offset));

    try {
      const response = await fetch(`/api/articles?${params}`);
      const data = await response.json();

      if (offset === 0) {
        setArticles(data.articles || []);
      } else {
        setArticles((prev) => [...prev, ...(data.articles || [])]);
      }

      setPagination(data.pagination || {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedIndustry, selectedType, selectedStatus, sortBy, sortOrder]);

  // Delete article
  const deleteArticle = useCallback(async (articleId: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const response = await fetch(`/api/articles?id=${articleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== articleId));
        setSelectedArticles((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      }
    } catch (error) {
      console.error("Error deleting article:", error);
    }
  }, []);

  // Update article status
  const updateStatus = useCallback(async (articleId: string, status: ArticleStatus) => {
    try {
      const response = await fetch("/api/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, status }),
      });

      if (response.ok) {
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, status } : a))
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }, []);

  // Bulk actions
  const bulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedArticles.size} articles?`)) return;

    for (const id of selectedArticles) {
      await fetch(`/api/articles?id=${id}`, { method: "DELETE" });
    }

    setArticles((prev) => prev.filter((a) => !selectedArticles.has(a.id)));
    setSelectedArticles(new Set());
  }, [selectedArticles]);

  const bulkUpdateStatus = useCallback(async (status: ArticleStatus) => {
    for (const id of selectedArticles) {
      await fetch("/api/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    }

    setArticles((prev) =>
      prev.map((a) => (selectedArticles.has(a.id) ? { ...a, status } : a))
    );
    setSelectedArticles(new Set());
  }, [selectedArticles]);

  // Export article
  const exportArticle = useCallback((article: Article) => {
    downloadAsFile(
      article.content,
      `${article.slug}.md`,
      "text/markdown"
    );
  }, []);

  // Toggle article selection
  const toggleSelection = useCallback((articleId: string) => {
    setSelectedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  }, []);

  // Select all visible
  const selectAll = useCallback(() => {
    if (selectedArticles.size === articles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(articles.map((a) => a.id)));
    }
  }, [articles, selectedArticles.size]);

  // Initial fetch
  useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);

  useEffect(() => {
    fetchArticles(0);
  }, [fetchArticles]);

  // Load more
  const loadMore = useCallback(() => {
    if (pagination.hasMore && !isLoading) {
      fetchArticles(pagination.offset + pagination.limit);
    }
  }, [pagination, isLoading, fetchArticles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Article Library</h2>
          <p className="text-zinc-400">
            {pagination.total} article{pagination.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "grid" ? "bg-zinc-700" : "hover:bg-zinc-800"
            )}
            title="Grid view"
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "list" ? "bg-zinc-700" : "hover:bg-zinc-800"
            )}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Industry Filter */}
        <select
          value={selectedIndustry || ""}
          onChange={(e) => setSelectedIndustry(e.target.value || null)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Industries</option>
          {industries.map((industry) => (
            <option key={industry.id} value={industry.id}>
              {industry.name}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={selectedType || ""}
          onChange={(e) =>
            setSelectedType((e.target.value || null) as ArticleType | null)
          }
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {[
            "blog",
            "technical",
            "news",
            "opinion",
            "tutorial",
            "listicle",
            "affiliate",
          ].map((type) => (
            <option key={type} value={type}>
              {getArticleTypeLabel(type)}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus || ""}
          onChange={(e) =>
            setSelectedStatus((e.target.value || null) as ArticleStatus | null)
          }
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          {["draft", "review", "published"].map((status) => (
            <option key={status} value={status}>
              {getStatusConfig(status).label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split("-");
            setSortBy(by);
            setSortOrder(order as "asc" | "desc");
          }}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="updated_at-desc">Recently Updated</option>
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="word_count-desc">Longest First</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedArticles.size > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            {selectedArticles.size} selected
          </span>
          <button
            onClick={() => bulkUpdateStatus("published")}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 rounded-lg"
          >
            Publish
          </button>
          <button
            onClick={() => bulkUpdateStatus("draft")}
            className="px-3 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg"
          >
            Move to Draft
          </button>
          <button
            onClick={bulkDelete}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded-lg"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedArticles(new Set())}
            className="px-3 py-1 text-sm text-zinc-400 hover:text-white"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Articles */}
      {isLoading && articles.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400 mb-2">No articles found</p>
          <p className="text-sm text-zinc-500">
            Try adjusting your filters or create a new article
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isSelected={selectedArticles.has(article.id)}
              onToggleSelect={() => toggleSelection(article.id)}
              onEdit={() => onEditArticle?.(article)}
              onDelete={() => deleteArticle(article.id)}
              onUpdateStatus={updateStatus}
              onExport={() => exportArticle(article)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* List Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-zinc-500 border-b border-zinc-800">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedArticles.size === articles.length}
                onChange={selectAll}
                className="rounded bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Updated</div>
          </div>

          {/* List Items */}
          {articles.map((article) => (
            <ArticleListItem
              key={article.id}
              article={article}
              isSelected={selectedArticles.has(article.id)}
              onToggleSelect={() => toggleSelection(article.id)}
              onEdit={() => onEditArticle?.(article)}
              onDelete={() => deleteArticle(article.id)}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {pagination.hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}

// Article Card Component (Grid View)
interface ArticleCardProps {
  article: Article;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (id: string, status: ArticleStatus) => void;
  onExport: () => void;
}

function ArticleCard({
  article,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onUpdateStatus,
  onExport,
}: ArticleCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = getStatusConfig(article.status);

  return (
    <div
      className={cn(
        "bg-zinc-900 border rounded-xl p-4 transition-all",
        isSelected ? "border-blue-500" : "border-zinc-800 hover:border-zinc-700"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded bg-zinc-800 border-zinc-700"
          />
          <span className={cn("px-2 py-0.5 text-xs rounded-full", statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-zinc-800 rounded"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px] z-10">
              <button
                onClick={() => { onEdit(); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700"
              >
                Edit
              </button>
              <button
                onClick={() => { onExport(); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700"
              >
                Export
              </button>
              <button
                onClick={() => {
                  copyToClipboard(article.content);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700"
              >
                Copy
              </button>
              <hr className="my-1 border-zinc-700" />
              {article.status !== "published" && (
                <button
                  onClick={() => { onUpdateStatus(article.id, "published"); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700 text-green-400"
                >
                  Publish
                </button>
              )}
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700 text-red-400"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3
        className="font-semibold text-lg mb-2 line-clamp-2 cursor-pointer hover:text-blue-400"
        onClick={onEdit}
      >
        {article.title}
      </h3>

      {/* Excerpt */}
      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
        {article.excerpt || truncate(article.content, 100)}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
        <span>{getArticleTypeLabel(article.article_type)}</span>
        <span>•</span>
        <span>{article.word_count || 0} words</span>
        <span>•</span>
        <span>{article.reading_time || 1} min read</span>
      </div>

      {/* Industry */}
      {article.industries && (
        <div className="mb-3">
          <span className="px-2 py-1 text-xs bg-zinc-800 rounded-full">
            {article.industries.name}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Updated {formatRelativeTime(article.updated_at)}</span>
        {article.published_at && (
          <span className="text-green-500">
            Published {formatDate(article.published_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// Article List Item Component (List View)
interface ArticleListItemProps {
  article: Article;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ArticleListItem({
  article,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: ArticleListItemProps) {
  const statusConfig = getStatusConfig(article.status);

  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-colors",
        isSelected ? "bg-blue-900/20" : "hover:bg-zinc-900"
      )}
    >
      <div className="col-span-1 flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded bg-zinc-800 border-zinc-700"
        />
      </div>
      <div className="col-span-5">
        <p
          className="font-medium truncate cursor-pointer hover:text-blue-400"
          onClick={onEdit}
        >
          {article.title}
        </p>
        <p className="text-xs text-zinc-500 truncate">
          {article.excerpt || truncate(article.content, 60)}
        </p>
      </div>
      <div className="col-span-2 flex items-center">
        <span className={cn("px-2 py-0.5 text-xs rounded-full", statusConfig.color)}>
          {statusConfig.label}
        </span>
      </div>
      <div className="col-span-2 flex items-center text-sm text-zinc-400">
        {getArticleTypeLabel(article.article_type)}
      </div>
      <div className="col-span-2 flex items-center text-sm text-zinc-500">
        {formatRelativeTime(article.updated_at)}
      </div>
    </div>
  );
}