"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { downloadImage, generateFilename } from "@/lib/image-utils";
import type { Article, ArticleImage } from "@/types";

interface ImageLightboxProps {
  selectedImage: ArticleImage;
  images: ArticleImage[];
  article: Article;
  onClose: () => void;
  onSetCoverImage: (imageId: string) => void;
  onNavigate: (image: ArticleImage) => void;
  onEditImage?: (imageId: string, newImageData: string, newPrompt: string) => Promise<void>;
  articleId: string;
  imageModel?: "gpt-image-1.5" | "gpt-image-1-mini";
  imageQuality?: "low" | "medium" | "high";
  isGeneratingImage?: boolean;
}

export function ImageLightbox({
  selectedImage,
  images,
  article,
  onClose,
  onSetCoverImage,
  onNavigate,
  onEditImage,
  articleId,
  imageModel = "gpt-image-1.5",
  imageQuality = "medium",
  isGeneratingImage = false,
}: ImageLightboxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const currentIndex = images.findIndex((img) => img.id === selectedImage.id);
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
  const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;

  // Initialize edit prompt when entering edit mode
  const handleEditClick = () => {
    setEditPrompt(selectedImage.prompt || "");
    setIsEditing(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onEditImage || !editPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editPrompt,
          originalPrompt: selectedImage.prompt || "A generic image",
          model: imageModel,
          quality: imageQuality,
        }),
      });

      if (!response.ok) throw new Error("Failed to edit image");

      const data = await response.json();
      if (data.image && onEditImage) {
        const imageSrc = data.image.startsWith("data:")
          ? data.image
          : `data:image/png;base64,${data.image}`;
        
        await onEditImage(selectedImage.id, imageSrc, data.prompt);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to edit image:", error);
      // Error handling is done by parent component via toast
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Escape key to close modal and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center">
        {/* Action buttons */}
        <div className="absolute top-4 right-4 z-[110] flex gap-2 items-start">
          {/* Edit button - Always show if onEditImage provided */}
          {onEditImage && !isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleEditClick();
              }}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg border-2 border-blue-400 text-white transition-colors flex items-center gap-2 font-semibold shadow-xl relative z-[120] min-w-[120px]"
              aria-label="Edit image"
              title="Edit this image with AI"
              style={{ display: "flex" }}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="whitespace-nowrap">Edit Image</span>
            </button>
          )}

          {/* Download button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const filename = generateFilename(
                selectedImage.prompt || selectedImage.id,
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
          className="relative w-full h-full flex items-center justify-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full h-full max-w-full max-h-full min-h-0 flex items-center justify-center">
            {isGeneratingImage || isGenerating ? (
              <div className="flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>Generating new version...</p>
              </div>
            ) : selectedImage.url.startsWith("data:") ? (
              // Use regular img tag for data URLs as Next.js Image can have issues
              <Image
                src={selectedImage.url}
                alt={selectedImage.prompt || "Generated Image"}
                fill
                className="object-contain rounded-lg shadow-2xl"
                unoptimized
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.prompt || "Generated Image"}
                  fill
                  className="object-contain rounded-lg shadow-2xl"
                  unoptimized
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  priority
                />
              </div>
            )}
          </div>
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
                disabled={isGenerating || isGeneratingImage}
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
                {article.cover_image === selectedImage.url && (
                  <span className="inline-block mt-1 text-xs text-blue-400 bg-blue-600/20 px-2 py-0.5 rounded">
                    Cover Image
                  </span>
                )}
              </div>
              {/* Show "Set as Cover" button for ANY image that isn't already the cover */}
              {article.cover_image !== selectedImage.url ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(
                      "🖼️ [ImageLightbox] Setting image as cover:",
                      selectedImage.id
                    );
                    onSetCoverImage(selectedImage.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium text-white transition-colors whitespace-nowrap"
                  title="Set this image as the article cover image"
                >
                  Set as Cover
                </button>
              ) : (
                <span className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-xs font-medium whitespace-nowrap border border-green-600/30">
                  ✓ Cover Image
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(images[prevIndex]);
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
                onNavigate(images[nextIndex]);
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

  // Render modal using portal to document body to ensure it's always on top
  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(modalContent, document.body);
}

