import type { Article, ArticleImage } from "@/types";

export interface FrontmatterData {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
  author: string;
  categories: string[];
  tags: string[];
  featuredImage?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

/**
 * Generate YAML frontmatter from article data
 */
export function generateFrontmatter(
  article: Article,
  frontmatterOverrides?: Partial<FrontmatterData>,
  coverImage?: ArticleImage | null
): string {
  // Use overrides or defaults
  const data: FrontmatterData = {
    title: frontmatterOverrides?.title || article.title,
    description:
      frontmatterOverrides?.description ||
      article.excerpt ||
      generateDescriptionFromContent(article.content),
    date:
      frontmatterOverrides?.date ||
      formatDateForFrontmatter(article.published_at || article.created_at),
    author: frontmatterOverrides?.author || "Curtis Nye", // Default author
    categories:
      frontmatterOverrides?.categories ||
      deriveCategoriesFromArticle(article),
    tags:
      frontmatterOverrides?.tags ||
      deriveTagsFromArticle(article),
    ...(frontmatterOverrides?.featuredImage || coverImage
      ? {
          featuredImage: frontmatterOverrides?.featuredImage || {
            src: coverImage?.url
              ? deriveImagePath(coverImage.url, article.slug)
              : "",
            alt:
              frontmatterOverrides?.featuredImage?.alt ||
              generateImageAlt(article.title),
            width: frontmatterOverrides?.featuredImage?.width || 1024,
            height: frontmatterOverrides?.featuredImage?.height || 768,
          },
        }
      : {}),
  };

  return formatAsYAML(data);
}

/**
 * Format frontmatter data as YAML string
 */
function formatAsYAML(data: FrontmatterData): string {
  let yaml = "---\n";
  yaml += `title: "${escapeYAMLString(data.title)}"\n`;
  yaml += `description: "${escapeYAMLString(data.description)}"\n`;
  yaml += `date: ${data.date}\n`;
  yaml += `author: "${escapeYAMLString(data.author)}"\n`;

  // Categories
  if (data.categories.length > 0) {
    yaml += "categories:\n";
    data.categories.forEach((cat) => {
      yaml += `- ${escapeYAMLString(cat)}\n`;
    });
  }

  // Tags
  if (data.tags.length > 0) {
    yaml += "tags:\n";
    data.tags.forEach((tag) => {
      yaml += `- ${escapeYAMLString(tag)}\n`;
    });
  }

  // Featured image
  if (data.featuredImage) {
    yaml += "featuredImage:\n";
    yaml += `    src: "${escapeYAMLString(data.featuredImage.src)}"\n`;
    yaml += `    alt: "${escapeYAMLString(data.featuredImage.alt)}"\n`;
    if (data.featuredImage.width) {
      yaml += `    width: ${data.featuredImage.width}\n`;
    }
    if (data.featuredImage.height) {
      yaml += `    height: ${data.featuredImage.height}\n`;
    }
  }

  yaml += "---\n";
  return yaml;
}

/**
 * Escape special characters in YAML strings
 */
function escapeYAMLString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

/**
 * Format date as YYYY-MM-DD for frontmatter
 */
function formatDateForFrontmatter(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Generate description from content if excerpt is not available
 */
function generateDescriptionFromContent(content: string): string {
  // Remove markdown formatting
  const plainText = content
    .replace(/[#*_\[\]()]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  // Take first 160 characters and cut at word boundary
  if (plainText.length <= 160) {
    return plainText;
  }

  const truncated = plainText.substring(0, 160);
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.substring(0, lastSpace) + "...";
}

/**
 * Derive categories from article (industry, article type, etc.)
 */
function deriveCategoriesFromArticle(article: Article): string[] {
  const categories: string[] = [];

  // Add industry as category if available
  if (article.industries?.name) {
    categories.push(article.industries.name);
  }

  // Map article types to categories
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

/**
 * Derive tags from SEO keywords and article type
 */
function deriveTagsFromArticle(article: Article): string[] {
  const tags = new Set<string>();

  // Add SEO keywords as tags
  if (article.seo_keywords && article.seo_keywords.length > 0) {
    article.seo_keywords.forEach((keyword) => {
      // Capitalize first letter of each word
      const formatted = keyword
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      tags.add(formatted);
    });
  }

  // Add article type as tag
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

/**
 * Derive image path from image URL and article slug
 * Converts data URLs or full URLs to relative paths
 */
function deriveImagePath(imageUrl: string, articleSlug: string): string {
  // If it's already a relative path, return as-is
  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }

  // If it's a data URL, generate a path
  if (imageUrl.startsWith("data:")) {
    // Generate filename from article slug
    return `/images/blog-images/${articleSlug}.png`;
  }

  // If it's a full URL, try to extract path or generate one
  try {
    const url = new URL(imageUrl);
    return url.pathname;
  } catch {
    // If URL parsing fails, generate a path
    return `/images/blog-images/${articleSlug}.png`;
  }
}

/**
 * Generate image alt text from article title
 */
function generateImageAlt(articleTitle: string): string {
  // Create a descriptive alt text based on the title
  // This is a simple implementation - could be enhanced with AI
  return `Featured image for: ${articleTitle}`;
}

/**
 * Parse YAML frontmatter from a string
 * Returns the frontmatter data and the remaining content
 */
export function parseFrontmatter(
  content: string
): { frontmatter: FrontmatterData | null; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: null, content };
  }

  const yamlContent = match[1];
  const remainingContent = content.slice(match[0].length);

  try {
    // Simple YAML parsing (for basic structure)
    // For production, consider using a YAML parser library
    const frontmatter = parseYAML(yamlContent);
    return { frontmatter, content: remainingContent };
  } catch (error) {
    console.error("Error parsing frontmatter:", error);
    return { frontmatter: null, content };
  }
}

/**
 * Simple YAML parser for frontmatter (basic implementation)
 * For production, consider using 'js-yaml' or similar
 */
function parseYAML(yaml: string): FrontmatterData {
  const data: Partial<FrontmatterData> = {
    categories: [],
    tags: [],
  };

  let currentArray: string[] | null = null;
  let inFeaturedImage = false;
  const featuredImage: Record<string, string | number | undefined> = {};

  const lines = yaml.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Handle featuredImage block
    if (trimmed === "featuredImage:") {
      inFeaturedImage = true;
      continue;
    }

    if (inFeaturedImage) {
      if (trimmed.startsWith("src:")) {
        featuredImage.src = unescapeYAMLString(
          trimmed.replace(/^src:\s*"/, "").replace(/"$/, "")
        );
      } else if (trimmed.startsWith("alt:")) {
        featuredImage.alt = unescapeYAMLString(
          trimmed.replace(/^alt:\s*"/, "").replace(/"$/, "")
        );
      } else if (trimmed.startsWith("width:")) {
        featuredImage.width = parseInt(trimmed.replace(/^width:\s*/, ""));
      } else if (trimmed.startsWith("height:")) {
        featuredImage.height = parseInt(trimmed.replace(/^height:\s*/, ""));
      } else if (!trimmed.startsWith(" ") && !trimmed.startsWith("-")) {
        inFeaturedImage = false;
        if (Object.keys(featuredImage).length > 0) {
          data.featuredImage = {
            src: featuredImage.src as string,
            alt: featuredImage.alt as string,
            width: featuredImage.width as number | undefined,
            height: featuredImage.height as number | undefined,
          };
        }
      }
    }

    // Handle arrays (categories, tags)
    if (trimmed.startsWith("- ")) {
      const value = unescapeYAMLString(trimmed.replace(/^-\s*/, ""));
      if (currentArray) {
        currentArray.push(value);
      }
      continue;
    }

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (key === "categories") {
        currentArray = data.categories as string[];
      } else if (key === "tags") {
        currentArray = data.tags as string[];
      } else {
        currentArray = null;
        const unescapedValue = unescapeYAMLString(
          value.replace(/^"/, "").replace(/"$/, "")
        );

        if (key === "title") data.title = unescapedValue;
        else if (key === "description") data.description = unescapedValue;
        else if (key === "date") data.date = unescapedValue;
        else if (key === "author") data.author = unescapedValue;
      }
    } else {
      currentArray = null;
    }
  }

  if (inFeaturedImage && Object.keys(featuredImage).length > 0) {
    data.featuredImage = {
      src: featuredImage.src as string,
      alt: featuredImage.alt as string,
      width: featuredImage.width as number | undefined,
      height: featuredImage.height as number | undefined,
    };
  }

  return data as FrontmatterData;
}

/**
 * Unescape YAML string
 */
function unescapeYAMLString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

