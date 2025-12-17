// app/dashboard/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopicFeed } from "@/components/topic-feed";
import { ArticleLibrary } from "@/components/article-library";
import { CreateArticleFlow } from "@/components/create-article-flow";
import { useAuth } from "@/hooks/use-auth";
import type { Topic } from "@/types";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  // Initialize activeTab from URL parameter
  const getInitialTab = (): "create" | "topics" | "library" => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["create", "topics", "library"].includes(tabParam)) {
      return tabParam as "create" | "topics" | "library";
    }
    return "create";
  };

  const [activeTab, setActiveTab] = useState<"create" | "topics" | "library">(
    getInitialTab()
  );
  const [selectedTopicFromFeed, setSelectedTopicFromFeed] =
    useState<Topic | null>(null);

  // Handle tab query parameter changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["create", "topics", "library"].includes(tabParam)) {
      setTimeout(() => {
        setActiveTab(tabParam as "create" | "topics" | "library");
      }, 0);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: "create" | "topics" | "library") => {
    setActiveTab(tab);
    router.push(`/dashboard?tab=${tab}`);
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopicFromFeed(topic);
    setActiveTab("create");
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Content Studio</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <nav className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-full sm:w-auto">
              {["create", "topics", "library"].map((tab) => (
                <button
                  key={tab}
                  onClick={() =>
                    handleTabChange(tab as "create" | "topics" | "library")
                  }
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-zinc-400 truncate">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6">
        {activeTab === "create" && (
          <CreateArticleFlow
            initialTopic={selectedTopicFromFeed}
            onTopicProcessed={() => setSelectedTopicFromFeed(null)}
            onBackToTopicsFeed={() => setActiveTab("topics")}
          />
        )}
        {activeTab === "topics" && (
          <TopicFeed onSelectTopic={handleTopicSelect} />
        )}
        {activeTab === "library" && (
          <ArticleLibrary
            onEditArticle={(article) => router.push(`/article/${article.id}`)}
          />
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
