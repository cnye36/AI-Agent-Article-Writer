"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Article, ArticleImage } from "@/types";

interface ImageLibraryProps {
  images: ArticleImage[];
  article: Article;
  onImageClick: (image: ArticleImage) => void;
  onSetCoverImage: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
}

export function ImageLibrary({
  images,
  article,
  onImageClick,
  onSetCoverImage,
  onDeleteImage,
}: ImageLibraryProps) {
  if (images.length === 0) return null;

  return (
    <div className="mb-4">
      <label className="block text-xs text-slate-600 dark:text-zinc-500 mb-2">Image Library</label>
      <p className="text-xs text-slate-600 dark:text-zinc-400 mb-2">
        Click to view larger, right-click to set as cover
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((img) => (
          <div
            key={img.id}
            className={cn(
              "relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors group bg-slate-100 dark:bg-zinc-900",
              article.cover_image === img.url
                ? "border-blue-500 dark:border-blue-500 ring-1 ring-blue-500"
                : "border-slate-300 dark:border-zinc-800"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onImageClick(img);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onSetCoverImage(img.id);
            }}
          >
            <Image
              src={img.url}
              alt="Generated"
              fill
              className="object-cover pointer-events-none"
              unoptimized
            />
            {article.cover_image === img.url && (
              <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm z-10">
                Cover
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(img);
                }}
                className="p-1.5 bg-slate-800/90 dark:bg-zinc-800/90 hover:bg-slate-700 dark:hover:bg-zinc-700 rounded text-white text-xs"
                title="View larger"
              >
                🔍
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Remove this image from library?")) {
                    onDeleteImage(img.id);
                  }
                }}
                className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded text-white text-xs"
                title="Remove from library"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

