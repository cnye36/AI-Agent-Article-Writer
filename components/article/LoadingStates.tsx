"use client";

import { Article } from "@/types";
import { useRouter } from "next/navigation";

interface LoadingStatesProps {
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  article: Article | null;
}

export function LoadingStates({
  isLoading,
  isGenerating,
  error,
  article,
}: LoadingStatesProps) {
  const router = useRouter();

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

  if (error || !article) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-zinc-400 mb-6">
            {error || "The article you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => router.push("/dashboard?tab=library")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
          >
            Back to Articles
          </button>
        </div>
      </div>
    );
  }

  return null;
}

