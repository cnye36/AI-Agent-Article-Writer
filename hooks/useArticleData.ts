import { useState, useEffect, useCallback } from "react";
import type {
  Article,
  ArticleVersion,
  ArticleLink,
  ArticleImage,
} from "@/types";

interface UseArticleDataProps {
  articleId: string;
}

interface UseArticleDataReturn {
  article: Article | null;
  versions: ArticleVersion[];
  links: {
    outgoing: ArticleLink[];
    incoming: ArticleLink[];
  };
  images: ArticleImage[];
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
  setArticle: React.Dispatch<React.SetStateAction<Article | null>>;
  setImages: React.Dispatch<React.SetStateAction<ArticleImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  fetchArticle: () => Promise<void>;
  normalizeImages: (
    images: ArticleImage[],
    coverImageUrl?: string | null
  ) => ArticleImage[];
}

export function useArticleData({
  articleId,
}: UseArticleDataProps): UseArticleDataReturn {
  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [links, setLinks] = useState<{
    outgoing: ArticleLink[];
    incoming: ArticleLink[];
  }>({
    outgoing: [],
    incoming: [],
  });
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Normalize images to ensure only one cover image
  const normalizeImages = useCallback(
    (images: ArticleImage[], coverImageUrl?: string | null): ArticleImage[] => {
      if (!images || images.length === 0) return images;

      // If article has a cover_image URL, use that to determine the cover
      if (coverImageUrl) {
        return images.map((img) => ({
          ...img,
          is_cover: img.url === coverImageUrl,
        }));
      }

      // Otherwise, use the most recently created image with is_cover: true
      const coverImages = images.filter((img) => img.is_cover);
      if (coverImages.length === 0) return images;

      // Sort by created_at descending and take the first one
      const sortedCovers = [...coverImages].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latestCover = sortedCovers[0];

      // Set only the latest cover image as cover, unset all others
      return images.map((img) => ({
        ...img,
        is_cover: img.id === latestCover.id,
      }));
    },
    []
  );

  // Fetch article data
  const fetchArticle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/articles?id=${articleId}`);

      if (!response.ok) {
        throw new Error("Article not found");
      }

      const data = await response.json();
      setArticle(data.article);
      setVersions(data.versions || []);
      setLinks(data.links || { outgoing: [], incoming: [] });

      // Normalize images to ensure only one cover image
      const normalizedImages = normalizeImages(
        data.images || [],
        data.article?.cover_image
      );
      setImages(normalizedImages);

      // Check if article is being generated
      // Only consider it generating if word_count is not set (only set at final save)
      // This is the most reliable indicator
      const hasNoWordCount =
        !data.article.word_count || data.article.word_count === 0;
      const isVeryRecent =
        new Date(data.article.created_at).getTime() >
        Date.now() - 5 * 60 * 1000; // Created within last 5 minutes

      // Only set generating if word_count is missing AND it's recent
      // This prevents infinite loops - once word_count is set, we stop
      setIsGenerating(hasNoWordCount && isVeryRecent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setIsLoading(false);
    }
  }, [articleId, normalizeImages]);

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId, fetchArticle]);

  // NO STREAMING OR POLLING ON ARTICLE PAGE
  // The stream should complete in create-article-flow before navigation
  // If we're here and article is incomplete, it means something went wrong
  // Just fetch once to get final state, then stop
  useEffect(() => {
    if (isGenerating && articleId) {
      // Only fetch once after a delay to allow final save to complete
      const timeout = setTimeout(() => {
        fetchArticle();
        // After fetching, if still incomplete, stop trying (prevent infinite loop)
        setTimeout(() => {
          setIsGenerating(false);
        }, 2000);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isGenerating, articleId, fetchArticle]);

  // Normalize images whenever article cover_image changes to ensure only one cover image
  useEffect(() => {
    if (images.length > 0 && article?.cover_image) {
      const normalized = normalizeImages(images, article.cover_image);
      // Only update if normalization changed something
      const needsUpdate = normalized.some(
        (img, idx) => img.is_cover !== images[idx]?.is_cover
      );
      if (needsUpdate) {
        setImages(normalized);
      }
    }
  }, [article?.cover_image, normalizeImages, images]);

  // Set default cover image from last created cover image if article doesn't have one
  useEffect(() => {
    if (article && images.length > 0 && !article.cover_image) {
      const lastCoverImage = images.find((img) => img.is_cover);
      if (lastCoverImage) {
        // This will be handled by the parent component's handleUpdateMetadata
      }
    }
  }, [article, images]);

  return {
    article,
    versions,
    links,
    images,
    isLoading,
    error,
    isGenerating,
    setArticle,
    setImages,
    setIsGenerating,
    fetchArticle,
    normalizeImages,
  };
}

