"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

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
    <div className="mt-6 pt-6 border-t border-zinc-800">
      <h4 className="text-sm font-medium text-white mb-3">Image Library</h4>
      <p className="text-xs text-zinc-500 mb-3">
        Click to view larger, drag to insert, or right-click to set as cover
      </p>
      <div className="grid grid-cols-2 gap-2">
        {images.map((img) => (
          <div
            key={img.id}
            className={cn(
              "relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:border-zinc-600 transition-colors bg-zinc-900 group",
              img.is_cover
                ? "border-blue-500 ring-1 ring-blue-500"
                : "border-zinc-800"
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
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={img.url}
                alt={img.prompt || "Generated"}
                fill
                className="object-cover"
                unoptimized
              />
            )}
            {img.is_cover && (
              <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm z-10">
                Cover
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="text-xs text-white bg-black/60 px-2 py-1 rounded">
                Click to view • Right-click for cover
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



