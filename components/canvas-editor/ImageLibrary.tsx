"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { downloadImage, generateFilename } from "@/lib/image-utils";

interface ImageItem {
  id: string;
  url: string;
  prompt: string | null;
  is_cover?: boolean;
}

interface ImageLibraryProps {
  images: ImageItem[];
  onImageClick: (image: ImageItem) => void;
  onSetCoverImage: (imageId: string) => void;
}

export function ImageLibrary({
  images,
  onImageClick,
  onSetCoverImage,
}: ImageLibraryProps) {
  if (images.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800 image-library-container">
      <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Image Library</h4>
      <p className="text-xs text-slate-600 dark:text-zinc-500 mb-3">
        Click to view • Hover to download • Drag to insert • Right-click to set as cover
      </p>
      <div 
        className="grid grid-cols-2 gap-2 image-library"
        onDragOver={(e) => {
          e.preventDefault();
          const fromCanvas = e.dataTransfer.getData("image/from-canvas");
          if (fromCanvas === "true") {
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          // Drop handling is done in the canvas editor's global drop handler
        }}
      >
        {images.map((img) => (
          <div
            key={img.id}
            className={cn(
              "relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:border-blue-400 dark:hover:border-zinc-600 transition-colors bg-slate-100 dark:bg-zinc-900 group",
              img.is_cover
                ? "border-blue-500 dark:border-blue-500 ring-1 ring-blue-500"
                : "border-slate-300 dark:border-zinc-800"
            )}
            draggable="true"
            onDragStart={(e) => {
              // Set multiple data formats for better compatibility
              e.dataTransfer.setData(
                "text/html",
                `<img src="${img.url}" alt="${
                  img.prompt || "Generated Image"
                }" />`
              );
              e.dataTransfer.setData("image/url", img.url);
              e.dataTransfer.setData(
                "image/alt",
                img.prompt || "Generated Image"
              );
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={(e) => {
              // Left click to view in modal
              e.preventDefault();
              e.stopPropagation();
              console.log("🖼️ [ImageLibrary] Image clicked, opening lightbox:", img.id);
              onImageClick(img);
            }}
            onContextMenu={(e) => {
              // Right click to set as cover
              e.preventDefault();
              onSetCoverImage(img.id);
            }}
          >
            {img.url.startsWith("data:") ? (
              <img
                src={img.url}
                alt={img.prompt || "Generated"}
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <Image
                src={img.url}
                alt={img.prompt || "Generated"}
                fill
                className="object-cover pointer-events-none"
                unoptimized
              />
            )}
            {img.is_cover && (
              <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm z-10">
                Cover
              </div>
            )}

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/60 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <div className="text-xs text-white bg-black/60 px-2 py-1 rounded">
                Click to view • Right-click for cover
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log("🖼️ [ImageLibrary] View button clicked, opening lightbox:", img.id);
                  onImageClick(img);
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium text-white transition-colors flex items-center gap-1"
                title="View larger"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                View
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const filename = generateFilename(img.prompt, img.id);
                  downloadImage(img.url, filename);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium text-white transition-colors flex items-center gap-1"
                title="Download image"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}





