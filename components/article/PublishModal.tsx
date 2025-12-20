"use client";

import { useState, useEffect } from "react";
import { X, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Article, PublishingSite } from "@/types";
import { PRECONFIGURED_PUBLISHING_SITES, SITE_CATEGORIES, type SiteCategory } from "@/lib/publishing-sites";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  onPublish: (siteIds: string[], slugs: Record<string, string>) => Promise<void>;
}

export function PublishModal({
  isOpen,
  onClose,
  article,
  onPublish,
}: PublishModalProps) {
  const router = useRouter();
  const [sites, setSites] = useState<PublishingSite[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SiteCategory>("All");

  // Fetch sites
  useEffect(() => {
    if (!isOpen) return;

    const fetchSites = async () => {
      setIsLoading(true);
      try {
        const sitesRes = await fetch("/api/publishing-sites");
        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          setSites(sitesData.sites || []);
        }
      } catch (error) {
        console.error("Error fetching publishing sites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSites();
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedSiteIds([]);
      setSlugs({});
    }
  }, [isOpen]);

  // Pre-fill slug with article slug when site is selected
  useEffect(() => {
    selectedSiteIds.forEach((siteId) => {
      if (!slugs[siteId] && article.slug) {
        setSlugs((prev) => ({ ...prev, [siteId]: article.slug }));
      }
    });
  }, [selectedSiteIds, article.slug, slugs]);

  const handleToggleSite = (siteId: string) => {
    if (selectedSiteIds.includes(siteId)) {
      setSelectedSiteIds(selectedSiteIds.filter((id) => id !== siteId));
      setSlugs((prev) => {
        const newSlugs = { ...prev };
        delete newSlugs[siteId];
        return newSlugs;
      });
    } else {
      setSelectedSiteIds([...selectedSiteIds, siteId]);
    }
  };

  const handleSlugChange = (siteId: string, slug: string) => {
    setSlugs((prev) => ({ ...prev, [siteId]: slug }));
  };

  const handleQuickAddSite = async (preconfiguredSite: typeof PRECONFIGURED_PUBLISHING_SITES[0]) => {
    try {
      const res = await fetch("/api/publishing-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preconfiguredSite.name,
          base_path: preconfiguredSite.base_path,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSites([...sites, data.site]);
        setShowQuickAdd(false);
      }
    } catch (error) {
      console.error("Error adding site:", error);
    }
  };

  const handlePublishClick = async () => {
    if (selectedSiteIds.length === 0) {
      alert("Please select at least one publishing site");
      return;
    }

    // Use article slug as fallback if slug not provided
    const finalSlugs: Record<string, string> = {};
    selectedSiteIds.forEach((siteId) => {
      finalSlugs[siteId] = slugs[siteId]?.trim() || article.slug || "";
    });

    setIsPublishing(true);
    try {
      await onPublish(selectedSiteIds, finalSlugs);
      onClose();
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish article. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredPreconfiguredSites = selectedCategory === "All"
    ? PRECONFIGURED_PUBLISHING_SITES
    : PRECONFIGURED_PUBLISHING_SITES.filter((site) => site.category === selectedCategory);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Publish Article
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-slate-600 dark:text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <p className="text-slate-600 dark:text-zinc-400 text-sm">Loading sites...</p>
          ) : sites.length === 0 ? (
            <div className="space-y-6">
              <div className="text-center py-4">
                <p className="text-slate-600 dark:text-zinc-400 text-sm mb-2">
                  No publishing sites configured.
                </p>
                <p className="text-slate-500 dark:text-zinc-500 text-xs mb-6">
                  Set up at least one publishing site to publish your article.
                </p>
              </div>

              {!showQuickAdd ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowQuickAdd(true)}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Quick Add from Popular Sites
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      router.push("/dashboard?tab=overview");
                      // Open settings modal - you may need to adjust this based on your settings modal implementation
                      setTimeout(() => {
                        const settingsButton = document.querySelector('[data-settings-trigger]');
                        if (settingsButton) {
                          (settingsButton as HTMLElement).click();
                        }
                      }, 100);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Go to Settings
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Popular Publishing Sites
                    </h3>
                    <button
                      onClick={() => setShowQuickAdd(false)}
                      className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Category Filter */}
                  <div className="flex gap-2 flex-wrap">
                    {SITE_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedCategory === category
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* Pre-configured Sites Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {filteredPreconfiguredSites.map((site) => {
                      const alreadyAdded = sites.some((s) => s.name === site.name);
                      return (
                        <button
                          key={`${site.name}-${site.base_path}`}
                          onClick={() => !alreadyAdded && handleQuickAddSite(site)}
                          disabled={alreadyAdded}
                          className={`p-3 text-left border rounded-lg transition-colors ${
                            alreadyAdded
                              ? "border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 opacity-50 cursor-not-allowed"
                              : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                          }`}
                        >
                          <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">
                            {site.name}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-400 mb-1">
                            {site.base_path}
                          </div>
                          {site.description && (
                            <div className="text-xs text-slate-500 dark:text-zinc-500">
                              {site.description}
                            </div>
                          )}
                          {alreadyAdded && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✓ Already added
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                Select one or more publishing sites and enter the slug for each:
              </p>

              <div className="space-y-3">
                {sites.map((site) => {
                  const isSelected = selectedSiteIds.includes(site.id);
                  const slug = slugs[site.id] || "";

                  return (
                    <div
                      key={site.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        isSelected
                          ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                          : "border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSite(site.id)}
                          className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">
                            {site.name}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-400 mb-3">
                            {site.base_path}
                          </div>
                          {isSelected && (
                            <div className="space-y-2">
                              <div>
                                <input
                                  type="text"
                                  placeholder="Article slug (optional, recommended)"
                                  value={slug}
                                  onChange={(e) => handleSlugChange(site.id, e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus={isSelected && !slug}
                                />
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                                  Leave empty to use article slug: {article.slug || "article-slug"}
                                </p>
                              </div>
                              <div className="text-xs text-slate-600 dark:text-zinc-500">
                                Will be published at: {site.base_path}/{slug || article.slug || "slug"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublishClick}
            disabled={isPublishing || selectedSiteIds.length === 0 || sites.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isPublishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

