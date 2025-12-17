"use client";

import { useState, useEffect } from "react";
import { cn, formatDate } from "@/lib/utils";
import type { Article, PublishingSite, ArticlePublication } from "@/types";

interface ArticlePublishingSectionProps {
  article: Article;
  onUpdate: (updates: Partial<Article>) => void;
}

export function ArticlePublishingSection({
  article,
  onUpdate,
}: ArticlePublishingSectionProps) {
  const [sites, setSites] = useState<PublishingSite[]>([]);
  const [publications, setPublications] = useState<ArticlePublication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSitePath, setNewSitePath] = useState("");
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [publishingToSite, setPublishingToSite] = useState<string | null>(null);
  const [publicationSlug, setPublicationSlug] = useState("");

  // Fetch sites and publications
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch sites
        const sitesRes = await fetch("/api/publishing-sites");
        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          setSites(sitesData.sites || []);
        }

        // Fetch publications for this article
        const pubsRes = await fetch(
          `/api/articles/publications?articleId=${article.id}`
        );
        if (pubsRes.ok) {
          const pubsData = await pubsRes.json();
          setPublications(pubsData.publications || []);
        }
      } catch (error) {
        console.error("Error fetching publishing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [article.id]);

  const handleAddSite = async () => {
    if (!newSiteName || !newSitePath) return;

    try {
      const res = await fetch("/api/publishing-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSiteName,
          base_path: newSitePath,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSites([...sites, data.site]);
        setNewSiteName("");
        setNewSitePath("");
        setShowAddSite(false);
      }
    } catch (error) {
      console.error("Error adding site:", error);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Delete this publishing site? This will also remove all publications to this site."))
      return;

    try {
      const res = await fetch(`/api/publishing-sites?id=${siteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSites(sites.filter((s) => s.id !== siteId));
        setPublications(publications.filter((p) => p.site_id !== siteId));
      }
    } catch (error) {
      console.error("Error deleting site:", error);
    }
  };

  const handlePublishToSite = async (siteId: string) => {
    if (!publicationSlug.trim()) {
      alert("Please enter a slug");
      return;
    }

    try {
      const res = await fetch("/api/articles/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          siteId,
          slug: publicationSlug.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPublications([...publications, data.publication]);
        setPublishingToSite(null);
        setPublicationSlug("");
        // Update article published_at if not set
        if (!article.published_at) {
          onUpdate({ published_at: new Date().toISOString() });
        }
      }
    } catch (error) {
      console.error("Error publishing article:", error);
    }
  };

  const handleUnpublish = async (publicationId: string) => {
    if (!confirm("Remove this publication?")) return;

    try {
      const res = await fetch(`/api/articles/publications?id=${publicationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPublications(publications.filter((p) => p.id !== publicationId));
      }
    } catch (error) {
      console.error("Error unpublishing:", error);
    }
  };

  const getPublicationForSite = (siteId: string) => {
    return publications.find((p) => p.site_id === siteId);
  };

  if (isLoading) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Publishing</h2>
        <p className="text-zinc-400 text-sm">Loading...</p>
      </section>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Publishing</h2>
      <div className="space-y-6">
        {article.published_at && (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Published
            </label>
            <p>
              {formatDate(article.published_at, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}

        {/* Publishing Sites Management */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm text-zinc-400">Publishing Sites</label>
            <button
              onClick={() => setShowAddSite(!showAddSite)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showAddSite ? "Cancel" : "+ Add Site"}
            </button>
          </div>

          {showAddSite && (
            <div className="mb-4 p-3 bg-zinc-800 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Site name (e.g., Main Blog)"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Base path (e.g., https://example.com/blog)"
                value={newSitePath}
                onChange={(e) => setNewSitePath(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddSite}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
              >
                Add Site
              </button>
            </div>
          )}

          <div className="space-y-2">
            {sites.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                No publishing sites configured. Add one to track where articles are published.
              </p>
            ) : (
              sites.map((site) => {
                const publication = getPublicationForSite(site.id);
                const isPublishing = publishingToSite === site.id;

                return (
                  <div
                    key={site.id}
                    className="p-3 bg-zinc-800 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{site.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {site.base_path}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="text-zinc-500 hover:text-red-400 text-xs"
                        title="Delete site"
                      >
                        ✕
                      </button>
                    </div>

                    {publication ? (
                      <div className="mt-2 pt-2 border-t border-zinc-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-zinc-400">Published</div>
                            <div className="text-sm mt-0.5">
                              <a
                                href={publication.canonical_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                              >
                                {publication.canonical_url}
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnpublish(publication.id)}
                            className="text-xs text-zinc-500 hover:text-red-400"
                          >
                            Unpublish
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        {isPublishing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Article slug (e.g., my-article-title)"
                              value={publicationSlug}
                              onChange={(e) => setPublicationSlug(e.target.value)}
                              className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePublishToSite(site.id);
                                } else if (e.key === "Escape") {
                                  setPublishingToSite(null);
                                  setPublicationSlug("");
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePublishToSite(site.id)}
                                className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                              >
                                Publish
                              </button>
                              <button
                                onClick={() => {
                                  setPublishingToSite(null);
                                  setPublicationSlug("");
                                }}
                                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="text-xs text-zinc-500">
                              Will be published at: {site.base_path}/{publicationSlug || "slug"}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setPublishingToSite(site.id);
                              setPublicationSlug(article.slug); // Pre-fill with article slug
                            }}
                            className="w-full px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-center"
                          >
                            Mark as Published
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

