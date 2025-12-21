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
  imageModel?: "gpt-image-1.5" | "gpt-image-1-mini";
  imageQuality?: "low" | "medium" | "high";
  onImageModelChange?: (model: "gpt-image-1.5" | "gpt-image-1-mini") => void;
  onImageQualityChange?: (quality: "low" | "medium" | "high") => void;
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
  imageModel = "gpt-image-1-mini",
  imageQuality = "high",
  onImageModelChange,
  onImageQualityChange,
}: ArticleAssetsSectionProps) {
  // Debug: Log when component renders
  console.log("📸 [ArticleAssets] Component rendered");
  console.log("📸 [ArticleAssets] imageModel prop:", imageModel);
  console.log("📸 [ArticleAssets] onImageModelChange prop:", onImageModelChange ? "EXISTS" : "UNDEFINED");
  return (
    <section className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Assets</h2>
      <div>
        <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-2">Cover Image</label>
        
        {/* Image Generation Settings */}
        <div className="mb-4 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-200 dark:border-zinc-800">
          <p className="text-xs text-slate-600 dark:text-zinc-500 mb-3">Image Generation Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-700 dark:text-zinc-400 mb-1.5 block">
                Model
              </label>
              <select
                value={imageModel}
                onChange={(e) => {
                  console.log("📸 [ArticleAssets] SELECT onChange FIRED!");
                  console.log("📸 [ArticleAssets] Event target value:", e.target.value);
                  const newModel = e.target.value as "gpt-image-1.5" | "gpt-image-1-mini";
                  console.log("📸 [ArticleAssets] Model dropdown changed to:", newModel);
                  console.log("📸 [ArticleAssets] Current imageModel prop:", imageModel);
                  console.log("📸 [ArticleAssets] onImageModelChange type:", typeof onImageModelChange);
                  console.log("📸 [ArticleAssets] Calling onImageModelChange with:", newModel);
                  if (onImageModelChange) {
                    onImageModelChange(newModel);
                    console.log("📸 [ArticleAssets] onImageModelChange called successfully");
                  } else {
                    console.error("📸 [ArticleAssets] ERROR: onImageModelChange is undefined!");
                  }
                }}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-blue-500/50 outline-none"
              >
                <option value="gpt-image-1.5">GPT Image 1.5</option>
                <option value="gpt-image-1-mini">GPT Image 1 Mini</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-700 dark:text-zinc-400 mb-1.5 block">
                Quality
              </label>
              <select
                value={imageQuality}
                onChange={(e) => onImageQualityChange?.(e.target.value as "low" | "medium" | "high")}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-blue-500/50 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {article.cover_image ? (
          <div 
            className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-slate-300 dark:border-zinc-700 mb-3 group cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Find the cover image in the images array and open it in the lightbox
              const coverImage = images.find(img => img.url === article.cover_image || img.is_cover);
              if (coverImage) {
                onImageClick(coverImage);
              } else if (article.cover_image) {
                // Fallback: create a temporary image object if not found in array
                onImageClick({
                  id: 'cover-temp',
                  article_id: article.id,
                  url: article.cover_image,
                  prompt: null,
                  is_cover: true,
                  created_at: new Date().toISOString(),
                });
              }
            }}
          >
            <Image
              src={article.cover_image}
              alt="Cover"
              fill
              className="object-cover pointer-events-none"
              unoptimized
            />
            <div 
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Find the cover image in the images array and open it in the lightbox
                  const coverImage = images.find(img => img.url === article.cover_image || img.is_cover);
                  if (coverImage) {
                    onImageClick(coverImage);
                  } else if (article.cover_image) {
                    // Fallback: create a temporary image object if not found in array
                    onImageClick({
                      id: 'cover-temp',
                      article_id: article.id,
                      url: article.cover_image,
                      prompt: null,
                      is_cover: true,
                      created_at: new Date().toISOString(),
                    });
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-xs text-slate-900 dark:text-white"
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
          <div className="w-full max-w-md aspect-video bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-300 dark:border-zinc-800 border-dashed flex items-center justify-center text-slate-500 dark:text-zinc-500 text-sm mb-3">
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
          className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50 text-slate-900 dark:text-white"
        >
          {isGeneratingImage ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 dark:border-zinc-400 border-t-transparent" />
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

