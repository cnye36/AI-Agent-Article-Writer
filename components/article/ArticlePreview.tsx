"use client";

import Image from "next/image";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/types";

interface ArticlePreviewProps {
  article: Article;
}

export function ArticlePreview({ article }: ArticlePreviewProps) {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        <article className="prose prose-invert prose-lg">
          {article.cover_image && (
            <div className="mb-8 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative w-full aspect-video">
              <Image
                src={article.cover_image}
                alt={article.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <h1>{article.title}</h1>
          <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8 not-prose">
            <span>{formatDate(article.created_at)}</span>
            <span>•</span>
            <span>{article.reading_time || 1} min read</span>
            {article.industries && (
              <>
                <span>•</span>
                <span>{article.industries.name}</span>
              </>
            )}
          </div>
          <div
            dangerouslySetInnerHTML={{
              __html: article.content_html || article.content,
            }}
          />
        </article>
      </div>
    </div>
  );
}

