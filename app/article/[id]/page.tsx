"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CanvasEditor } from "@/components/canvas-editor";
import { downloadAsFile, removeFirstH1FromMarkdown } from "@/lib/utils";
import { generateFrontmatter } from "@/lib/frontmatter";
import { useArticleData } from "@/hooks/useArticleData";
import { ArticleHeader } from "@/components/article/ArticleHeader";
import { ArticleSettings } from "@/components/article/ArticleSettings";
import { LoadingStates } from "@/components/article/LoadingStates";
import { PublishModal } from "@/components/article/PublishModal";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard-header";
import type { Article, ArticleImage } from "@/types";

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { user } = useAuth();

  const {
    article,
    versions,
    links,
    images,
    isLoading,
    error,
    isGenerating,
    setArticle,
    setImages,
    normalizeImages,
  } = useArticleData({ articleId });

  const [activeTab, setActiveTab] = useState<"edit" | "settings">("edit");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ArticleImage | null>(null);
  const [imageModel, setImageModel] = useState<"gpt-image-1.5" | "gpt-image-1-mini">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("imageModel");
      if (saved === "gpt-image-1.5" || saved === "gpt-image-1-mini") {
        return saved;
      }
    }
    return "gpt-image-1.5";
  });
  const [imageQuality, setImageQuality] = useState<"low" | "medium" | "high">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("imageQuality");
      if (saved === "low" || saved === "medium" || saved === "high") {
        return saved;
      }
    }
    return "medium";
  });
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Wrapper to ensure state updates and log changes
  const handleImageModelChange = useCallback((model: "gpt-image-1.5" | "gpt-image-1-mini") => {
    // Also save to localStorage when changed
    if (typeof window !== "undefined") {
      localStorage.setItem("imageModel", model);
    }
    console.log("🔄 [ArticlePage] handleImageModelChange called with:", model);
    console.log("🔄 [ArticlePage] Current imageModel before update:", imageModel);
    setImageModel(model);
    // Log after a brief delay to see if state updated
    setTimeout(() => {
      console.log("🔄 [ArticlePage] State should now be:", model);
    }, 0);
  }, [imageModel]);

  // Debug: Log when imageModel changes
  useEffect(() => {
    console.log("🔄 [ArticlePage] imageModel state changed to:", imageModel);
  }, [imageModel]);

  // Save article content
  const handleSave = useCallback(
    async (content: string) => {
      if (!article) return;

      try {
        const response = await fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: article.id,
            content,
            saveVersion: true,
            editedBy: "user",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setArticle(data.article);
        }
      } catch (err) {
        console.error("Failed to save:", err);
      }
    },
    [article, setArticle]
  );

  // Update article metadata
  const handleUpdateMetadata = useCallback(
    async (updates: Partial<Article>) => {
      if (!article) return;

      try {
        const response = await fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: article.id,
            ...updates,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setArticle(data.article);
        }
      } catch (err) {
        console.error("Failed to update:", err);
      }
    },
    [article, setArticle]
  );

  // Set default cover image from last created cover image if article doesn't have one
  useEffect(() => {
    if (article && images.length > 0 && !article.cover_image) {
      const lastCoverImage = images.find((img) => img.is_cover);
      if (lastCoverImage) {
        handleUpdateMetadata({ cover_image: lastCoverImage.url });
      } else {
        // If no cover image marked, use the most recent image
        const mostRecent = images[0];
        handleUpdateMetadata({ cover_image: mostRecent.url });
      }
    }
  }, [article, images, handleUpdateMetadata]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedImage) {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [selectedImage]);

  // Show publish modal
  const handlePublish = useCallback(() => {
    setShowPublishModal(true);
  }, []);

  // Handle actual publishing to multiple sites
  const handlePublishToSites = useCallback(
    async (siteIds: string[], slugs: Record<string, string>) => {
      if (!article) return;

      // Publish to each selected site
      const publishPromises = siteIds.map(async (siteId) => {
        const res = await fetch("/api/articles/publications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: article.id,
            siteId,
            slug: slugs[siteId].trim(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to publish to site ${siteId}`);
        }

        return res.json();
      });

      await Promise.all(publishPromises);

      // Update article status to published if not already
      if (article.status !== "published") {
        await handleUpdateMetadata({ status: "published" });
      }
    },
    [article, handleUpdateMetadata]
  );

  // Delete article
  const handleDelete = useCallback(async () => {
    if (!article) return;
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const response = await fetch(`/api/articles?id=${article.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard?tab=library");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }, [article, router]);

  // Export article
  const handleExport = useCallback(
    async (format: "md" | "pdf" | "txt") => {
      if (!article) return;

      if (format === "pdf") {
        // Generate PDF using browser print API
        // Remove first h1 from content since we're adding the title separately
        const contentWithoutH1 = removeFirstH1FromMarkdown(article.content);
        const htmlContent = article.content_html || contentWithoutH1;
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
    }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem; 
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1 { color: #1a1a1a; font-size: 2em; margin-top: 0; }
    h2 { color: #1a1a1a; font-size: 1.5em; margin-top: 1.5em; }
    h3 { color: #1a1a1a; font-size: 1.25em; margin-top: 1.25em; }
    p { line-height: 1.6; color: #333; margin: 1em 0; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { 
      background: #f4f4f4; 
      padding: 0.2em 0.4em; 
      border-radius: 3px; 
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre { 
      background: #f4f4f4; 
      padding: 1rem; 
      overflow-x: auto; 
      border-radius: 4px;
      line-height: 1.4;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
    }
    ul, ol { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.5em 0; }
  </style>
</head>
<body>
  <h1>${article.title}</h1>
  ${htmlContent}
</body>
</html>`;

        // Create a temporary window for printing
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          alert("Please allow popups to export as PDF");
          return;
        }

        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
        return;
      }

      // Markdown or plain text export
      // Remove first h1 heading since frontmatter contains the title
      let content = removeFirstH1FromMarkdown(article.content);

      // For markdown export, prepend frontmatter if available
      if (format === "md") {
        const coverImage =
          images.find((img) => img.is_cover) || images[0] || null;
        const frontmatterOverrides = article.metadata?.frontmatter;
        const frontmatter = generateFrontmatter(
          article,
          frontmatterOverrides,
          coverImage
        );
        content = frontmatter + "\n" + content;
      }

      const mimeType = format === "md" ? "text/markdown" : "text/plain";
      const extension = format === "md" ? "md" : "txt";

      downloadAsFile(content, `${article.slug}.${extension}`, mimeType);
    },
    [article, images]
  );

  const handleGenerateCoverImage = async (params?: {
    model?: "gpt-image-1.5" | "gpt-image-1-mini";
    quality?: "low" | "medium" | "high";
  }) => {
    if (!article) return;

    // Use model/quality from params if provided, otherwise use the shared state
    // Since we now have a single shared state, params should match the state, but we'll use params if explicitly provided
    const model = params?.model || imageModel;
    const quality = params?.quality || imageQuality;

    console.log("🖼️ [Cover Image] handleGenerateCoverImage called");
    console.log("🖼️ [Cover Image] params received:", params);
    console.log("🖼️ [Cover Image] page imageModel state:", imageModel);
    console.log("🖼️ [Cover Image] Using model:", model, "quality:", quality);

    setIsGeneratingImage(true);
    try {
      const requestBody = {
        articleTitle: article.title,
        sectionContent: article.excerpt || article.content.substring(0, 1000),
        context: `Article Industry: ${
          article.industries?.name || "General"
        }. Article Type: ${article.article_type}`,
        articleId: article.id,
        isCover: true,
        model: model,
        quality: quality,
      };

      console.log("🖼️ [Cover Image] Request body:", JSON.stringify(requestBody, null, 2));
      console.log("🖼️ [Cover Image] Sending model:", requestBody.model);

      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Failed to generate image");

      const data = await response.json();

      if (data.record) {
        // Unset is_cover on all existing images, then add the new one with is_cover: true
        setImages((prev) => {
          const updated = prev.map((img) => ({ ...img, is_cover: false }));
          // Ensure the new cover image has is_cover: true
          const newCoverImage = { ...data.record, is_cover: true };
          return [newCoverImage, ...updated];
        });

        // Update article state locally
        setArticle((prev) =>
          prev ? { ...prev, cover_image: data.record.url } : null
        );
      } else if (data.image) {
        // Fallback for non-db save (shouldn't happen with updated API)
        const imageSrc = data.image.startsWith("data:")
          ? data.image
          : `data:image/png;base64,${data.image}`;

        await handleUpdateMetadata({ cover_image: imageSrc });
      }

      // Don't call fetchArticle() - we've updated state directly
      // This prevents page reload and preserves UI state
    } catch (e) {
      console.error("Failed to generate cover:", e);
      alert("Failed to generate cover image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSetCoverImage = async (imageIdOrUrl: string) => {
    if (!article) return;

    // Check if it's an ID or URL
    const image = images.find(
      (img) => img.id === imageIdOrUrl || img.url === imageIdOrUrl
    );
    if (!image) return;

    // Update cover image in article
    await handleUpdateMetadata({ cover_image: image.url });

    // Update is_cover flag in database for all images
    try {
      const response = await fetch("/api/articles/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          imageId: image.id,
          isCover: true,
        }),
      });

      if (response.ok) {
        // Update images state directly - unset is_cover on all, then set on selected
        setImages((prev) => {
          const updated = prev.map((img) => ({
            ...img,
            is_cover: img.id === image.id,
          }));
          // Also update article cover_image to match
          setArticle((prev) =>
            prev ? { ...prev, cover_image: image.url } : null
          );
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to update cover image flag:", err);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!article) return;

    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    // Confirm deletion
    if (!confirm("Are you sure you want to delete this image? This will remove it from the library and any instances in the article.")) {
      return;
    }

    try {
      // Delete from database
      const response = await fetch(`/api/articles/images?id=${imageId}&articleId=${article.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete image");
      }

      // Remove from UI
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      // If it was the cover image, clear it from article
      if (article.cover_image === image.url) {
        await handleUpdateMetadata({ cover_image: null });
      }

      // Refresh images list
      const refreshResponse = await fetch(`/api/articles?id=${article.id}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        if (data.images && Array.isArray(data.images)) {
          const normalizedImages = normalizeImages(
            data.images,
            data.article?.cover_image
          );
          setImages(normalizedImages);
        }
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
      alert("Failed to delete image. Please try again.");
    }
  };

  const handleImageNavigate = (image: ArticleImage) => {
    setSelectedImage(image);
  };

  const handleEditImage = async (
    imageId: string,
    newImageData: string,
    newPrompt: string
  ) => {
    try {
      setIsGeneratingImage(true);
      // Update image in database
      const response = await fetch(`/api/articles/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId,
          articleId: article?.id,
          imageData: newImageData,
          prompt: newPrompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update image");
      }

      // Refresh images list
      const refreshResponse = await fetch(`/api/articles?id=${article?.id}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        if (data.images && Array.isArray(data.images)) {
          const normalizedImages = normalizeImages(
            data.images,
            data.article?.cover_image
          );
          setImages(normalizedImages);
          // Update selected image if it's the one being edited
          const updatedImage = normalizedImages.find(
            (img) => img.id === imageId
          );
          if (updatedImage) {
            setSelectedImage(updatedImage);
          }
        }
      }
    } catch (err) {
      console.error("Failed to edit image:", err);
      alert("Failed to edit image. Please try again.");
      throw err;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Check loading states first
  const loadingState = (
    <LoadingStates
      isLoading={isLoading}
      isGenerating={isGenerating}
      error={error}
      article={article}
    />
  );

  if (isLoading || isGenerating || error || !article) {
    return loadingState;
  }

  return (
    <>
      <div className="h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col">
        <DashboardHeader />

        {/* Article Header */}
        <ArticleHeader
          article={article}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPublish={handlePublish}
          onExport={handleExport}
        />

        {/* Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === "edit" && (
            <CanvasEditor
              initialContent={article.content}
              articleId={article.id}
              articleType={article.article_type}
              articleTitle={article.title}
              onSave={handleSave}
              onPublish={async () => {}}
              onGenerateCoverImage={handleGenerateCoverImage}
              isGeneratingCoverImage={isGeneratingImage}
              images={images}
              onSetCoverImage={handleSetCoverImage}
              onDeleteImage={handleDeleteImage}
              imageModel={imageModel}
              imageQuality={imageQuality}
              onImageModelChange={handleImageModelChange}
              onImageQualityChange={setImageQuality}
              onImagesChange={async () => {
                // Refresh images without full page reload
                const response = await fetch(`/api/articles?id=${article?.id}`);
                if (response.ok) {
                  const data = await response.json();
                  // Images are at top level of response, not nested in article
                  if (data.images && Array.isArray(data.images)) {
                    // Normalize images to ensure only one cover image
                    const normalizedImages = normalizeImages(
                      data.images,
                      data.article?.cover_image
                    );
                    setImages(normalizedImages);
                  }
                }
              }}
              onGenerateCoverImageComplete={async () => {
                // Refresh images after cover image generation completes
                const response = await fetch(`/api/articles?id=${article.id}`);
                if (response.ok) {
                  const data = await response.json();
                  // Images are at top level of response, not nested in article
                  if (data.images && Array.isArray(data.images)) {
                    const normalizedImages = normalizeImages(
                      data.images,
                      data.article?.cover_image
                    );
                    setImages(normalizedImages);
                  }
                }
              }}
            />
          )}

          {activeTab === "settings" && (
            <ArticleSettings
              article={article}
              images={images}
              versions={versions}
              links={links}
              isGeneratingImage={isGeneratingImage}
              selectedImage={selectedImage}
              onUpdate={handleUpdateMetadata}
              onGenerateCoverImage={handleGenerateCoverImage}
              onSetCoverImage={handleSetCoverImage}
              onDeleteImage={handleDeleteImage}
              onImageClick={setSelectedImage}
              onImageClose={() => setSelectedImage(null)}
              onImageNavigate={handleImageNavigate}
              onEditImage={handleEditImage}
              onDelete={handleDelete}
              imageModel={imageModel}
              imageQuality={imageQuality}
              onImageModelChange={handleImageModelChange}
              onImageQualityChange={setImageQuality}
            />
          )}
        </main>
      </div>

      {/* Publish Modal */}
      {article && (
        <PublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          article={article}
          onPublish={handlePublishToSites}
        />
      )}
    </>
  );
}
