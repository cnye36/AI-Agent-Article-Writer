"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CanvasEditor } from "@/components/canvas-editor";
import {
  cn,
  formatDate,
  formatRelativeTime,
  getStatusConfig,
  getArticleTypeLabel,
  copyToClipboard,
  downloadAsFile,
} from "@/lib/utils";
import type { Article, ArticleVersion, ArticleLink, ArticleStatus } from "@/types";

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [links, setLinks] = useState<{ outgoing: ArticleLink[]; incoming: ArticleLink[] }>({
    outgoing: [],
    incoming: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "settings">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch article data
  const fetchArticle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/articles?id=${articleId}`);

      if (!response.ok) {
        throw new Error("Article not found");
      }

      const data = await response.json();
      setArticle(data.article);
      setVersions(data.versions || []);
      setLinks(data.links || { outgoing: [], incoming: [] });

      // Check if article is being generated
      // Only consider it generating if word_count is not set (only set at final save)
      // This is the most reliable indicator
      const hasNoWordCount =
        !data.article.word_count || data.article.word_count === 0;
      const isVeryRecent =
        new Date(data.article.created_at).getTime() >
        Date.now() - 5 * 60 * 1000; // Created within last 5 minutes

      // Only set generating if word_count is missing AND it's recent
      // This prevents infinite loops - once word_count is set, we stop
      setIsGenerating(hasNoWordCount && isVeryRecent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId, fetchArticle]);

  // NO STREAMING OR POLLING ON ARTICLE PAGE
  // The stream should complete in create-article-flow before navigation
  // If we're here and article is incomplete, it means something went wrong
  // Just fetch once to get final state, then stop
  useEffect(() => {
    if (isGenerating && articleId) {
      // Only fetch once after a delay to allow final save to complete
      const timeout = setTimeout(() => {
        fetchArticle();
        // After fetching, if still incomplete, stop trying (prevent infinite loop)
        setTimeout(() => {
          setIsGenerating(false);
        }, 2000);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isGenerating, articleId, fetchArticle]);

  // Save article content
  const handleSave = useCallback(
    async (content: string) => {
      if (!article) return;

      setIsSaving(true);

      try {
        const response = await fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: article.id,
            content,
            saveVersion: true,
            editedBy: "user",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setArticle(data.article);
        }
      } catch (err) {
        console.error("Failed to save:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [article]
  );

  // Update article metadata
  const handleUpdateMetadata = useCallback(
    async (updates: Partial<Article>) => {
      if (!article) return;

      try {
        const response = await fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: article.id,
            ...updates,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setArticle(data.article);
        }
      } catch (err) {
        console.error("Failed to update:", err);
      }
    },
    [article]
  );

  // Publish article
  const handlePublish = useCallback(async () => {
    await handleUpdateMetadata({ status: "published" });
  }, [handleUpdateMetadata]);

  // Delete article
  const handleDelete = useCallback(async () => {
    if (!article) return;
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const response = await fetch(`/api/articles?id=${article.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }, [article, router]);

  // Export article
  const handleExport = useCallback(
    (format: "md" | "html" | "txt") => {
      if (!article) return;

      let content = article.content;
      let mimeType = "text/plain";
      const extension = format;

      if (format === "html" && article.content_html) {
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1, h2, h3 { color: #1a1a1a; }
    p { line-height: 1.6; color: #333; }
    a { color: #0066cc; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${article.title}</h1>
  ${article.content_html}
</body>
</html>`;
        mimeType = "text/html";
      }

      downloadAsFile(content, `${article.slug}.${extension}`, mimeType);
    },
    [article]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading article...</p>
        </div>
      </div>
    );
  }

  // Generating state (article is being written)
  if (isGenerating && article) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Writing Your Article</h2>
          <p className="text-zinc-400 mb-4">
            Your article is being generated. This page will update automatically
            as content is written...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <div className="animate-pulse">●</div>
            <span>Streaming content in real-time</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-zinc-400 mb-6">{error || "The article you're looking for doesn't exist."}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(article.status);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-zinc-400 hover:text-white"
          >
            ← Back
          </button>
          <div>
            <h1 className="font-semibold truncate max-w-md">{article.title}</h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className={cn("px-2 py-0.5 rounded-full", statusConfig.color)}>
                {statusConfig.label}
              </span>
              <span>•</span>
              <span>{getArticleTypeLabel(article.article_type)}</span>
              <span>•</span>
              <span>{article.word_count || 0} words</span>
              <span>•</span>
              <span>Updated {formatRelativeTime(article.updated_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 mr-4">
            {(["edit", "preview", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                  activeTab === tab
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Actions */}
          {article.status !== "published" && (
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
            >
              Publish
            </button>
          )}

          <div className="relative group">
            <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
              Export ▾
            </button>
            <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 hidden group-hover:block min-w-[120px] z-10">
              <button
                onClick={() => handleExport("md")}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700"
              >
                Markdown
              </button>
              <button
                onClick={() => handleExport("html")}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700"
              >
                HTML
              </button>
              <button
                onClick={() => handleExport("txt")}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-700"
              >
                Plain Text
              </button>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(article.content)}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
            title="Copy to clipboard"
          >
            📋
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "edit" && (
          <CanvasEditor
            initialContent={article.content}
            articleId={article.id}
            articleType={article.article_type}
            onSave={handleSave}
            onPublish={handlePublish}
          />
        )}

        {activeTab === "preview" && (
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              <article className="prose prose-invert prose-lg">
                <h1>{article.title}</h1>
                <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8 not-prose">
                  <span>{formatDate(article.created_at)}</span>
                  <span>•</span>
                  <span>{article.reading_time || 1} min read</span>
                  {article.industries && (
                    <>
                      <span>•</span>
                      <span>{article.industries.name}</span>
                    </>
                  )}
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: article.content_html || article.content,
                  }}
                />
              </article>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Article Info */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Article Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={article.title}
                      onChange={(e) => handleUpdateMetadata({ title: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">/articles/</span>
                      <input
                        type="text"
                        value={article.slug}
                        readOnly
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Excerpt</label>
                    <textarea
                      value={article.excerpt || ""}
                      onChange={(e) => handleUpdateMetadata({ excerpt: e.target.value })}
                      placeholder="Brief description for SEO and previews..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Status</label>
                    <select
                      value={article.status}
                      onChange={(e) => handleUpdateMetadata({ status: e.target.value as ArticleStatus })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
                    >
                      <option value="draft">Draft</option>
                      <option value="review">In Review</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* SEO */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">SEO Keywords</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {article.seo_keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-zinc-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {keyword}
                      <button
                        onClick={() => {
                          const newKeywords = article.seo_keywords.filter((_, i) => i !== index);
                          handleUpdateMetadata({ seo_keywords: newKeywords });
                        }}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add keyword and press Enter..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      const keyword = input.value.trim();
                      if (keyword && !article.seo_keywords.includes(keyword)) {
                        handleUpdateMetadata({
                          seo_keywords: [...article.seo_keywords, keyword],
                        });
                        input.value = "";
                      }
                    }
                  }}
                />
              </section>

              {/* Publishing */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Publishing</h2>
                <div className="space-y-4">
                  {article.published_at && (
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Published</label>
                      <p>{formatDate(article.published_at, { dateStyle: "full", timeStyle: "short" })}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Published To</label>
                    <div className="flex flex-wrap gap-2">
                      {["blog", "medium", "reddit", "linkedin"].map((platform) => (
                        <button
                          key={platform}
                          onClick={() => {
                            const current = article.published_to || [];
                            const newList = current.includes(platform)
                              ? current.filter((p) => p !== platform)
                              : [...current, platform];
                            handleUpdateMetadata({ published_to: newList });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm capitalize transition-colors",
                            article.published_to?.includes(platform)
                              ? "bg-blue-600"
                              : "bg-zinc-800 hover:bg-zinc-700"
                          )}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Internal Links */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Internal Links</h2>
                
                {links.outgoing.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm text-zinc-400 mb-2">Outgoing ({links.outgoing.length})</h3>
                    <div className="space-y-2">
                      {links.outgoing.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-blue-400">&quot;{link.anchor_text}&quot;</span>
                          <span className="text-zinc-500">→</span>
                          <span>{link.target_article?.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {links.incoming.length > 0 && (
                  <div>
                    <h3 className="text-sm text-zinc-400 mb-2">Incoming ({links.incoming.length})</h3>
                    <div className="space-y-2">
                      {links.incoming.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span>{link.source_article?.title}</span>
                          <span className="text-zinc-500">→</span>
                          <span className="text-blue-400">&quot;{link.anchor_text}&quot;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {links.outgoing.length === 0 && links.incoming.length === 0 && (
                  <p className="text-zinc-500 text-sm">No internal links yet</p>
                )}
              </section>

              {/* Version History */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Version History</h2>
                {versions.length > 0 ? (
                  <div className="space-y-2">
                    {versions.slice(0, 5).map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm">{version.change_summary || "No description"}</p>
                          <p className="text-xs text-zinc-500">
                            {formatRelativeTime(version.created_at)} by {version.edited_by}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No version history</p>
                )}
              </section>

              {/* Danger Zone */}
              <section className="bg-red-900/20 border border-red-800/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Once you delete an article, there is no going back. Please be certain.
                </p>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium"
                >
                  Delete Article
                </button>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}