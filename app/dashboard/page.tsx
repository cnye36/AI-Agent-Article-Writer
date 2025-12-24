// app/dashboard/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopicFeed } from "@/components/topic-feed";
import { ArticleLibrary } from "@/components/article-library";
import { CreateArticleFlow } from "@/components/create-article-flow";
import { PublicationCalendar } from "@/components/publication-calendar";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { useAuth } from "@/hooks/use-auth";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { DashboardHeader } from "@/components/dashboard-header";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import type { Topic } from "@/types";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  // Initialize activeTab from URL parameter
  const getInitialTab = ():
    | "overview"
    | "create"
    | "topics"
    | "library"
    | "published" => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["overview", "create", "topics", "library", "published"].includes(
        tabParam
      )
    ) {
      return tabParam as
        | "overview"
        | "create"
        | "topics"
        | "library"
        | "published";
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<
    "overview" | "create" | "topics" | "library" | "published"
  >(getInitialTab());
  const [selectedTopicFromFeed, setSelectedTopicFromFeed] =
    useState<Topic | null>(null);

  // Handle tab query parameter changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["overview", "create", "topics", "library", "published"].includes(
        tabParam
      )
    ) {
      setTimeout(() => {
        setActiveTab(
          tabParam as "overview" | "create" | "topics" | "library" | "published"
        );
      }, 0);
    }
  }, [searchParams]);

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopicFromFeed(topic);
    setActiveTab("create");
  };

  // Check onboarding status when user loads
  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) return;

      try {
        const res = await fetch("/api/user/preferences");
        const data = await res.json();

        // Show onboarding if not completed
        setShowOnboarding(!data.hasCompletedOnboarding);
      } catch (error) {
        console.error("Error checking onboarding:", error);
        // Default to not showing onboarding on error
        setShowOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    if (user && !loading) {
      checkOnboardingStatus();
    }
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  // Handle onboarding completion
  const handleOnboardingComplete = async (
    answers: Record<string, string | string[]>,
    industry: string,
    subcategories: string[]
  ) => {
    try {
      // Extract custom keywords from the onboarding flow if they were added
      const customKeywordsString = (answers["custom-keywords"] as string) || "";
      const customKeywords = customKeywordsString
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingAnswers: answers,
          primaryIndustry: industry,
          selectedSubcategories: subcategories,
          customKeywords,
        }),
      });

      // Hide onboarding and show dashboard
      setShowOnboarding(false);
      router.refresh(); // Reload to apply personalization
    } catch (error) {
      console.error("Error saving onboarding:", error);
      // Still hide onboarding on error to not block user
      setShowOnboarding(false);
    }
  };

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  // Show onboarding flow if user hasn't completed it
  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <DashboardHeader activeTab={activeTab} />

      {/* Content */}
      <main
        className={
          activeTab === "published"
            ? "flex flex-col flex-1 overflow-hidden"
            : "p-4 sm:p-6"
        }
      >
        {activeTab === "overview" && <DashboardOverview />}
        {activeTab === "create" && (
          <CreateArticleFlow
            initialTopic={selectedTopicFromFeed}
            onTopicProcessed={() => setSelectedTopicFromFeed(null)}
            onBackToTopicsFeed={() => setActiveTab("topics")}
            userPreferences={preferences || undefined}
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
        {activeTab === "published" && <PublicationCalendar />}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
