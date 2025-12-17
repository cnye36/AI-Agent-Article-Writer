"use client";

import Image from "next/image";
import { useEffect } from "react";
import { downloadImage, generateFilename } from "@/lib/image-utils";

interface ImageItem {
  id: string;
  url: string;
  prompt: string | null;
  is_cover?: boolean;
}

interface ImageLightboxProps {
  selectedImage: ImageItem;
  images: ImageItem[];
  onClose: () => void;
  onSetCoverImage?: (imageId: string) => void;
  onNavigate?: (image: ImageItem) => void;
}

export function ImageLightbox({
  selectedImage,
  images,
  onClose,
  onSetCoverImage,
  onNavigate,
}: ImageLightboxProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
        {/* Action buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {/* Download button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const filename = generateFilename(
                selectedImage.prompt,
                selectedImage.id
              );
              downloadImage(selectedImage.url, filename);
            }}
            className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700 text-white transition-colors"
            aria-label="Download image"
            title="Download image"
          >
            <svg
              className="w-6 h-6"
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
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700 text-white transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Image container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {selectedImage.url.startsWith("data:") ? (
            // Use regular img tag for data URLs as Next.js Image can have issues
            <img
              src={selectedImage.url}
              alt={selectedImage.prompt || "Generated Image"}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <div className="relative w-full h-full max-w-full max-h-[90vh]">
              <Image
                src={selectedImage.url}
                alt={selectedImage.prompt || "Generated Image"}
                fill
                className="object-contain rounded-lg shadow-2xl"
                unoptimized
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          )}
        </div>

        {/* Image info */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-700 max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {selectedImage.prompt && (
                <p
                  className="text-sm text-zinc-300 truncate"
                  title={selectedImage.prompt}
                >
                  {selectedImage.prompt}
                </p>
              )}
              {selectedImage.is_cover && (
                <span className="inline-block mt-1 text-xs text-blue-400 bg-blue-600/20 px-2 py-0.5 rounded">
                  Cover Image
                </span>
              )}
            </div>
            {onSetCoverImage && !selectedImage.is_cover && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetCoverImage(selectedImage.id);
                  onClose();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium text-white transition-colors whitespace-nowrap"
              >
                Set as Cover
              </button>
            )}
          </div>
        </div>

        {/* Navigation arrows (if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigate) {
                  const currentIndex = images.findIndex(
                    (img) => img.id === selectedImage.id
                  );
                  const prevIndex =
                    currentIndex > 0 ? currentIndex - 1 : images.length - 1;
                  onNavigate(images[prevIndex]);
                }
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700 text-white transition-colors"
              aria-label="Previous image"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigate) {
                  const currentIndex = images.findIndex(
                    (img) => img.id === selectedImage.id
                  );
                  const nextIndex =
                    currentIndex < images.length - 1 ? currentIndex + 1 : 0;
                  onNavigate(images[nextIndex]);
                }
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700 text-white transition-colors"
              aria-label="Next image"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

