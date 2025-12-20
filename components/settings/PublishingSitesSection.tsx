"use client";

import { useState, useEffect } from "react";
import type { PublishingSite } from "@/types";
import { PRECONFIGURED_PUBLISHING_SITES, SITE_CATEGORIES, type SiteCategory } from "@/lib/publishing-sites";

export function PublishingSitesSection() {
  const [sites, setSites] = useState<PublishingSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SiteCategory>("All");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSitePath, setNewSitePath] = useState("");

  // Fetch sites
  useEffect(() => {
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
  }, []);

  const handleAddSite = async () => {
    if (!newSiteName) return;

    // If no base_path provided, use a placeholder
    const basePath = newSitePath.trim() || "https://example.com";

    try {
      const res = await fetch("/api/publishing-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSiteName,
          base_path: basePath,
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

  const filteredPreconfiguredSites = selectedCategory === "All"
    ? PRECONFIGURED_PUBLISHING_SITES
    : PRECONFIGURED_PUBLISHING_SITES.filter((site) => site.category === selectedCategory);

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Delete this publishing site? This will also remove all publications to this site."))
      return;

    try {
      const res = await fetch(`/api/publishing-sites?id=${siteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSites(sites.filter((s) => s.id !== siteId));
      }
    } catch (error) {
      console.error("Error deleting site:", error);
    }
  };

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Publishing Sites
          </h3>
        </div>
        <p className="text-slate-600 dark:text-zinc-400 text-sm">Loading...</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Publishing Sites
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowQuickAdd(!showQuickAdd);
              setShowAddSite(false);
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {showQuickAdd ? "Cancel" : "Quick Add"}
          </button>
          <button
            onClick={() => {
              setShowAddSite(!showAddSite);
              setShowQuickAdd(false);
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {showAddSite ? "Cancel" : "+ Custom Site"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {showQuickAdd && (
          <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-lg space-y-4 border border-slate-200 dark:border-zinc-700">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Popular Publishing Sites
              </h4>
              
              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap mb-4">
                {SITE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === category
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
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
          </div>
        )}

        {showAddSite && (
          <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-lg space-y-3 border border-slate-200 dark:border-zinc-700">
            <input
              type="text"
              placeholder="Display name (e.g., My Personal Blog)"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Base URL (optional, e.g., https://example.com/blog)"
              value={newSitePath}
              onChange={(e) => setNewSitePath(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Display name is required. URL is optional but recommended for linking.
            </p>
            <button
              onClick={handleAddSite}
              disabled={!newSiteName.trim()}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium text-white"
            >
              Add Site
            </button>
          </div>
        )}

        {sites.length === 0 ? (
          <p className="text-slate-600 dark:text-zinc-500 text-sm">
            No publishing sites configured. Add one to track where articles are published.
          </p>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <div
                key={site.id}
                className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900 dark:text-white">
                    {site.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                    {site.base_path}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSite(site.id)}
                  className="text-slate-500 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 text-xs ml-2"
                  title="Delete site"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

