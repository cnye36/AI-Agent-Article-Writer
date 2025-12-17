"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useArticleData } from "@/hooks/useArticleData";

/**
 * Route handler for /blog/[slug] - redirects to /article/[id] after looking up article by slug
 * This allows internal links using /blog/<slug> format to work within the app
 */
export default function BlogSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    // Fetch article by slug and redirect to the article page
    const fetchAndRedirect = async () => {
      try {
        const response = await fetch(`/api/articles?slug=${encodeURIComponent(slug)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.article && data.article.id) {
            router.replace(`/article/${data.article.id}`);
            return;
          }
        }
        // If article not found, redirect to dashboard
        router.replace("/dashboard?tab=library");
      } catch (error) {
        console.error("Error fetching article by slug:", error);
        router.replace("/dashboard?tab=library");
      }
    };

    if (slug) {
      fetchAndRedirect();
    }
  }, [slug, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <p className="text-zinc-400">Loading article...</p>
      </div>
    </div>
  );
}

