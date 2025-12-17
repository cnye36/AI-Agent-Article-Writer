"use client";

import Image from "next/image";
import type { Article, ArticleImage } from "@/types";
import { ImageLibrary } from "./ImageLibrary";

interface ArticleAssetsSectionProps {
  article: Article;
  images: ArticleImage[];
  isGeneratingImage: boolean;
  onUpdate: (updates: Partial<Article>) => void;
  onGenerateCoverImage: () => void;
  onSetCoverImage: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
  onImageClick: (image: ArticleImage) => void;
}

export function ArticleAssetsSection({
  article,
  images,
  isGeneratingImage,
  onUpdate,
  onGenerateCoverImage,
  onSetCoverImage,
  onDeleteImage,
  onImageClick,
}: ArticleAssetsSectionProps) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Assets</h2>
      <div>
        <label className="block text-sm text-zinc-400 mb-2">Cover Image</label>
        {article.cover_image ? (
          <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-zinc-700 mb-3 group">
            <Image
              src={article.cover_image}
              alt="Cover"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => window.open(article.cover_image!, "_blank")}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-white"
              >
                View
              </button>
              <button
                onClick={() => {
                  if (confirm("Remove cover image?"))
                    onUpdate({ cover_image: null });
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
              >
                Remove
              </button>
              <button
                onClick={onGenerateCoverImage}
                disabled={isGeneratingImage}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>Regenerate</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md aspect-video bg-zinc-800/50 rounded-lg border border-zinc-800 border-dashed flex items-center justify-center text-zinc-500 text-sm mb-3">
            No cover image selected
          </div>
        )}

        <ImageLibrary
          images={images}
          article={article}
          onImageClick={onImageClick}
          onSetCoverImage={onSetCoverImage}
          onDeleteImage={onDeleteImage}
        />

        <button
          onClick={onGenerateCoverImage}
          disabled={isGeneratingImage}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {isGeneratingImage ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-400 border-t-transparent" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Generate with AI</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}

