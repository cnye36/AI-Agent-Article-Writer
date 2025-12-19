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
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Article, ArticleImage } from "@/types";

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { user, signOut } = useAuth();

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

  // Publish article
  const handlePublish = useCallback(async () => {
    await handleUpdateMetadata({ status: "published" });
  }, [handleUpdateMetadata]);

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

  const handleGenerateCoverImage = async () => {
    if (!article) return;

    setIsGeneratingImage(true);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleTitle: article.title,
          sectionContent: article.excerpt || article.content.substring(0, 1000),
          context: `Article Industry: ${
            article.industries?.name || "General"
          }. Article Type: ${article.article_type}`,
          articleId: article.id,
          isCover: true,
        }),
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
    // Just UI removal for now, would need API endpoint for true delete
    // But we can at least remove it from view
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleImageNavigate = (image: ArticleImage) => {
    setSelectedImage(image);
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
        {/* Main Dashboard Header */}
        <header className="border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 py-4 bg-white dark:bg-zinc-950">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-xl font-bold">Content Studio</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <nav className="flex gap-1 bg-slate-100 dark:bg-zinc-900 rounded-lg p-1 w-full sm:w-auto">
                {["create", "topics", "library"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => router.push(`/dashboard?tab=${tab}`)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      false // Current tab is always false since we're not on dashboard
                        ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                {user && (
                  <>
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 truncate">
                      {user.email}
                    </span>
                    <button
                      onClick={signOut}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white rounded-lg transition-colors whitespace-nowrap border border-slate-200 dark:border-transparent"
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

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
              onPublish={handlePublish}
              onGenerateCoverImage={handleGenerateCoverImage}
              isGeneratingCoverImage={isGeneratingImage}
              images={images}
              onSetCoverImage={handleSetCoverImage}
              onImagesChange={async () => {
                // Refresh images without full page reload
                const response = await fetch(`/api/articles?id=${article.id}`);
                if (response.ok) {
                  const data = await response.json();
                  if (data.article?.images) {
                    // Normalize images to ensure only one cover image
                    const normalizedImages = normalizeImages(
                      data.article.images,
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
                  if (data.article?.images) {
                    const normalizedImages = normalizeImages(
                      data.article.images,
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
              onDelete={handleDelete}
            />
          )}
        </main>
      </div>
    </>
  );
}
