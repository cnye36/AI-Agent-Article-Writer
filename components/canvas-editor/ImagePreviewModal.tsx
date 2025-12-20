"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { downloadImage, generateFilename } from "@/lib/image-utils";

interface ImagePreviewModalProps {
  src: string;
  alt: string;
  onClose: () => void;
  prompt?: string;
  onEdit?: (prompt: string) => void;
  isEditing?: boolean;
}

export function ImagePreviewModal({
  src,
  alt,
  onClose,
  prompt,
  onEdit,
  isEditing: isEditingState = false,
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

  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const initialPrompt = prompt || alt;

  // Initialize edit prompt when entering edit mode is handled in the click handler

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onEdit && editPrompt.trim()) {
      onEdit(editPrompt);
      setIsEditing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
        {/* Action buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {/* Edit button - Only show if onEdit provided */}
          {onEdit && !isEditing && (
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 setEditPrompt(initialPrompt || "");
                 setIsEditing(true);
               }}
               className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700 text-white transition-colors flex items-center gap-2"
               aria-label="Edit image"
            >
               <span>✨ Edit</span>
            </button>
          )}

          {/* Download button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const filename = generateFilename(alt);
              downloadImage(src, filename);
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
          {isEditingState ? (
             <div className="flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>Generating new version...</p>
             </div>
          ) : src.startsWith("data:") ? (
            // Use regular img tag for data URLs as Next.js Image can have issues
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain rounded-lg shadow-2xl"
              unoptimized
              sizes="(max-width: 1280px) 100vw, 1280px"
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

        {/* Image info / Edit Form */}
        <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-700 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="flex gap-2 w-full">
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Describe your changes..."
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isEditingState}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </form>
            ) : (
                <p className="text-sm text-zinc-300 truncate text-center" title={alt}>
                  {alt}
                </p>
            )}
          </div>
      </div>
    </div>
  );
}





