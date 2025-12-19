"use client";

import type { Article, ArticleImage, ArticleVersion, ArticleLink } from "@/types";
import { ArticleInfoSection } from "./ArticleInfoSection";
import { ArticleAssetsSection } from "./ArticleAssetsSection";
import { ArticleSEOSection } from "./ArticleSEOSection";
import { ArticlePublishingSection } from "./ArticlePublishingSection";
import { ArticleFrontmatterSection } from "./ArticleFrontmatterSection";
import { ArticleLinksSection } from "./ArticleLinksSection";
import { ArticleVersionHistory } from "./ArticleVersionHistory";
import { ArticleDangerZone } from "./ArticleDangerZone";
import { ImageLightbox } from "./ImageLightbox";

interface ArticleSettingsProps {
  article: Article;
  images: ArticleImage[];
  versions: ArticleVersion[];
  links: {
    outgoing: ArticleLink[];
    incoming: ArticleLink[];
  };
  isGeneratingImage: boolean;
  selectedImage: ArticleImage | null;
  onUpdate: (updates: Partial<Article>) => Promise<void>;
  onGenerateCoverImage: () => void;
  onSetCoverImage: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
  onImageClick: (image: ArticleImage) => void;
  onImageClose: () => void;
  onImageNavigate: (image: ArticleImage) => void;
  onDelete: () => void;
}

export function ArticleSettings({
  article,
  images,
  versions,
  links,
  isGeneratingImage,
  selectedImage,
  onUpdate,
  onGenerateCoverImage,
  onSetCoverImage,
  onDeleteImage,
  onImageClick,
  onImageClose,
  onImageNavigate,
  onDelete,
}: ArticleSettingsProps) {
  return (
    <div className="h-full overflow-y-auto p-8 bg-white dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto space-y-8">
        <ArticleInfoSection article={article} onUpdate={onUpdate} />
        <ArticleAssetsSection
          article={article}
          images={images}
          isGeneratingImage={isGeneratingImage}
          onUpdate={onUpdate}
          onGenerateCoverImage={onGenerateCoverImage}
          onSetCoverImage={onSetCoverImage}
          onDeleteImage={onDeleteImage}
          onImageClick={onImageClick}
        />
        <ArticleSEOSection article={article} onUpdate={onUpdate} />
        <ArticlePublishingSection article={article} onUpdate={onUpdate} />
        <ArticleFrontmatterSection
          article={article}
          coverImage={images.find((img) => img.is_cover) || images[0] || null}
          onUpdate={onUpdate}
        />
        <ArticleLinksSection links={links} />
        <ArticleVersionHistory versions={versions} />
        <ArticleDangerZone onDelete={onDelete} />
      </div>

      {selectedImage && (
        <ImageLightbox
          selectedImage={selectedImage}
          images={images}
          article={article}
          onClose={onImageClose}
          onSetCoverImage={onSetCoverImage}
          onNavigate={onImageNavigate}
        />
      )}
    </div>
  );
}

