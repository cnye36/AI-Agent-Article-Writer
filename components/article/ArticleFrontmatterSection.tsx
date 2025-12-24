"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { generateFrontmatter, type FrontmatterData } from "@/lib/frontmatter";
import { copyToClipboard as copyToClipboardUtil } from "@/lib/utils";
import type { Article, ArticleImage } from "@/types";

interface ArticleFrontmatterSectionProps {
  article: Article;
  coverImage: ArticleImage | null;
  onUpdate: (updates: Partial<Article>) => Promise<void>;
}

export function ArticleFrontmatterSection({
  article,
  coverImage,
  onUpdate,
}: ArticleFrontmatterSectionProps) {
  // Compute initial frontmatter data from article metadata or defaults
  const getInitialFrontmatterData = (): FrontmatterData => {
    const defaults: FrontmatterData = {
      title: article.title,
      description: article.excerpt || "",
      date: formatDateForInput(article.published_at || article.created_at),
      author: "Curtis Nye",
      categories: deriveCategories(article),
      tags: deriveTags(article),
      featuredImage: coverImage
        ? {
            src: `/images/blog-images/${article.slug}.png`,
            alt: generateImageAlt(),
            width: 1024,
            height: 768,
          }
        : undefined,
    };

    // Merge with saved overrides if available
    if (article.metadata?.frontmatter) {
      return {
        ...defaults,
        ...(article.metadata.frontmatter as Partial<FrontmatterData>),
      };
    }

    return defaults;
  };

  const [frontmatterData, setFrontmatterData] = useState<FrontmatterData>(
    getInitialFrontmatterData
  );

  const [isEditing, setIsEditing] = useState(false);

  // Compute YAML preview as derived state (no useEffect needed)
  const yamlPreview = useMemo(
    () => generateFrontmatter(article, frontmatterData, coverImage),
    [article, frontmatterData, coverImage]
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Reset copy success state after 2 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Call the frontmatter agent API
      const response = await fetch("/api/agents/frontmatter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId: article.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate frontmatter");
      }

      const result = await response.json();

      if (result.success && result.frontmatter) {
        // Get the generated description
        const generatedDescription =
          result.frontmatter.description ||
          article.excerpt ||
          generateDescription(article.content);

        // Merge AI-generated frontmatter with existing data
        const newFrontmatterData = {
          title: article.title,
          description: generatedDescription,
          date: formatDateForInput(article.published_at || article.created_at),
          author: "Curtis Nye",
          categories:
            result.frontmatter.categories || deriveCategories(article),
          tags: result.frontmatter.tags || deriveTags(article),
          featuredImage: coverImage
            ? {
                src: `/images/blog-images/${article.slug}.png`,
                alt: generateImageAlt(),
                width: 1024,
                height: 768,
              }
            : undefined,
        };

        setFrontmatterData(newFrontmatterData);

        // Update the article's excerpt field with the generated description
        const currentMetadata = article.metadata || {};
        await onUpdate({
          excerpt: generatedDescription,
          metadata: {
            ...currentMetadata,
            frontmatter: newFrontmatterData as unknown as Record<string, unknown>,
          },
        } as Partial<Article>);
      } else {
        // Fallback to basic generation if agent fails
        setFrontmatterData({
          title: article.title,
          description: article.excerpt || generateDescription(article.content),
          date: formatDateForInput(article.published_at || article.created_at),
          author: "Curtis Nye",
          categories: deriveCategories(article),
          tags: deriveTags(article),
          featuredImage: coverImage
            ? {
                src: `/images/blog-images/${article.slug}.png`,
                alt: generateImageAlt(),
                width: 1024,
                height: 768,
              }
            : undefined,
        });
      }
    } catch (error) {
      console.error("Error generating frontmatter:", error);
      // Fallback to basic generation on error
      setFrontmatterData({
        title: article.title,
        description: article.excerpt || generateDescription(article.content),
        date: formatDateForInput(article.published_at || article.created_at),
        author: "Curtis Nye",
        categories: deriveCategories(article),
        tags: deriveTags(article),
        featuredImage: coverImage
          ? {
              src: `/images/blog-images/${article.slug}.png`,
              alt: generateImageAlt(),
              width: 1024,
              height: 768,
            }
          : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    // Save frontmatter overrides to article metadata
    const currentMetadata = article.metadata || {};
    await onUpdate({
      metadata: {
        ...currentMetadata,
        frontmatter: frontmatterData as unknown as Record<string, unknown>,
      },
    } as Partial<Article>);
    setIsEditing(false);
  };

  const handleCopyYAML = async () => {
    const success = await copyToClipboardUtil(yamlPreview);
    if (success) {
      setCopySuccess(true);
    }
    // Silently fail - user can try again if needed
  };

  return (
    <section className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Frontmatter
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-sm text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate with AI"}
          </button>
          <button
            onClick={handleCopyYAML}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white flex items-center gap-1.5 transition-colors"
          >
            {copySuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy YAML</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-sm text-slate-900 dark:text-white"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={frontmatterData.title}
              onChange={(e) =>
                setFrontmatterData({
                  ...frontmatterData,
                  title: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-1">
              Description
            </label>
            <textarea
              value={frontmatterData.description}
              onChange={(e) =>
                setFrontmatterData({
                  ...frontmatterData,
                  description: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-1">
                Date
              </label>
              <input
                type="date"
                value={frontmatterData.date}
                onChange={(e) =>
                  setFrontmatterData({
                    ...frontmatterData,
                    date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-1">
                Author
              </label>
              <input
                type="text"
                value={frontmatterData.author}
                onChange={(e) =>
                  setFrontmatterData({
                    ...frontmatterData,
                    author: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-1">
              Categories (one per line)
            </label>
            <textarea
              value={frontmatterData.categories.join("\n")}
              onChange={(e) =>
                setFrontmatterData({
                  ...frontmatterData,
                  categories: e.target.value
                    .split("\n")
                    .filter((c) => c.trim().length > 0),
                })
              }
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-1">
              Tags (one per line)
            </label>
            <textarea
              value={frontmatterData.tags.join("\n")}
              onChange={(e) =>
                setFrontmatterData({
                  ...frontmatterData,
                  tags: e.target.value
                    .split("\n")
                    .filter((t) => t.trim().length > 0),
                })
              }
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {frontmatterData.featuredImage && (
            <div className="space-y-2">
              <label className="block text-sm text-slate-700 dark:text-zinc-400">
                Featured Image
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-zinc-500 mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    value={frontmatterData.featuredImage.src}
                    onChange={(e) =>
                      setFrontmatterData({
                        ...frontmatterData,
                        featuredImage: {
                          ...frontmatterData.featuredImage!,
                          src: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-zinc-500 mb-1">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    value={frontmatterData.featuredImage.alt}
                    onChange={(e) =>
                      setFrontmatterData({
                        ...frontmatterData,
                        featuredImage: {
                          ...frontmatterData.featuredImage!,
                          alt: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-zinc-500 mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    value={frontmatterData.featuredImage.width || 1024}
                    onChange={(e) =>
                      setFrontmatterData({
                        ...frontmatterData,
                        featuredImage: {
                          ...frontmatterData.featuredImage!,
                          width: parseInt(e.target.value) || 1024,
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-zinc-500 mb-1">
                    Height
                  </label>
                  <input
                    type="number"
                    value={frontmatterData.featuredImage.height || 768}
                    onChange={(e) =>
                      setFrontmatterData({
                        ...frontmatterData,
                        featuredImage: {
                          ...frontmatterData.featuredImage!,
                          height: parseInt(e.target.value) || 768,
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium text-white"
            >
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-sm text-slate-900 dark:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm text-slate-700 dark:text-zinc-400 mb-2">
            YAML Preview
          </label>
          <pre className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-800 dark:text-zinc-300 font-mono overflow-x-auto max-h-96 overflow-y-auto">
            {yamlPreview}
          </pre>
        </div>
      )}
    </section>
  );
}

// Helper functions
function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveCategories(article: Article): string[] {
  const categories: string[] = [];
  if (article.industries?.name) {
    categories.push(article.industries.name);
  }
  const typeCategoryMap: Record<string, string> = {
    blog: "Blog",
    technical: "Technical",
    news: "News",
    opinion: "Opinion",
    tutorial: "Tutorial",
    listicle: "Listicle",
    affiliate: "Affiliate",
  };
  if (typeCategoryMap[article.article_type]) {
    categories.push(typeCategoryMap[article.article_type]);
  }
  return categories.length > 0 ? categories : ["General"];
}

function deriveTags(article: Article): string[] {
  const tags = new Set<string>();
  if (article.seo_keywords && article.seo_keywords.length > 0) {
    article.seo_keywords.forEach((keyword) => {
      const formatted = keyword
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      tags.add(formatted);
    });
  }
  const typeTagMap: Record<string, string> = {
    blog: "Blog",
    technical: "Technical",
    news: "News",
    opinion: "Opinion",
    tutorial: "Tutorial",
    listicle: "Listicle",
    affiliate: "Affiliate",
  };
  if (typeTagMap[article.article_type]) {
    tags.add(typeTagMap[article.article_type]);
  }
  return Array.from(tags);
}

function generateDescription(content: string): string {
  const plainText = content
    .replace(/[#*_\[\]()]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  if (plainText.length <= 160) {
    return plainText;
  }
  const truncated = plainText.substring(0, 160);
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.substring(0, lastSpace) + "...";
}

function generateImageAlt(): string {
  return `A futuristic, minimalistic image in blue-purple and cyan-magenta gradients showing AI chatbots interacting with abstract business environments—neural networks, data grids, and digital workspaces—symbolizing productivity in small businesses.`;
}

