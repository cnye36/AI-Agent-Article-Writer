"use client";

import Image from "next/image";
import { useEffect } from "react";

interface ImagePreviewModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImagePreviewModal({
  src,
  alt,
  onClose,
}: ImagePreviewModalProps) {
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700 text-white transition-colors"
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

        {/* Image container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {src.startsWith("data:") ? (
            // Use regular img tag for data URLs as Next.js Image can have issues
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <div className="relative w-full h-full max-w-full max-h-[90vh]">
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain rounded-lg shadow-2xl"
                unoptimized
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          )}
        </div>

        {/* Image info */}
        {alt && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-700 max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-sm text-zinc-300 truncate"
              title={alt}
            >
              {alt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


