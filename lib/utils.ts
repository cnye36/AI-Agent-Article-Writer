import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate URL-safe slug from text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

// Count words in text (strips markdown)
export function countWords(text: string): number {
  return text
    .replace(/[#*_\[\]()```]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// Calculate reading time in minutes
export function calculateReadingTime(text: string, wordsPerMinute = 200): number {
  const words = countWords(text);
  return Math.ceil(words / wordsPerMinute);
}

// Generate excerpt from content
export function generateExcerpt(content: string, maxLength = 160): string {
  const plainText = content
    .replace(/[#*_\[\]()```]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return truncated.substring(0, lastSpace) + "...";
}

// Convert markdown to HTML (basic conversion)
export function markdownToHtml(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>')
    // Code blocks
    .replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<pre class="bg-zinc-900 p-4 rounded-lg overflow-x-auto"><code class="language-$1">$2</code></pre>'
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 rounded">$1</code>')
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br>");
}

// Format date for display
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // If dateStyle or timeStyle are provided, use Intl.DateTimeFormat
  // These options are not supported by toLocaleString/toLocaleDateString
  if (options && ("dateStyle" in options || "timeStyle" in options)) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", options);
      return formatter.format(d);
    } catch (error) {
      // Fallback if dateStyle/timeStyle not supported
      // Convert to equivalent individual options
      const fallbackOptions: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      
      if ("timeStyle" in options && options.timeStyle) {
        fallbackOptions.hour = "numeric";
        fallbackOptions.minute = "2-digit";
      }
      
      const formatter = new Intl.DateTimeFormat("en-US", fallbackOptions);
      return formatter.format(d);
    }
  }
  
  // Otherwise use toLocaleDateString for date-only formatting
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else {
    return formatDate(d);
  }
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Download content as file
export function downloadAsFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Generate random ID
export function generateId(length = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

// Check if we're in browser
export const isBrowser = typeof window !== "undefined";

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Capitalize first letter
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Convert article type to display name
export function getArticleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    blog: "Blog Post",
    technical: "Technical Article",
    news: "News Analysis",
    opinion: "Opinion Piece",
    tutorial: "Tutorial",
    listicle: "Listicle",
    affiliate: "Affiliate Piece",
  };
  return labels[type] || capitalize(type);
}

// Convert status to display name with color
export function getStatusConfig(status: string): { label: string; color: string } {
  const configs: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-zinc-600" },
    review: { label: "In Review", color: "bg-yellow-600" },
    published: { label: "Published", color: "bg-green-600" },
    pending: { label: "Pending", color: "bg-blue-600" },
    approved: { label: "Ready", color: "bg-green-600" },
    rejected: { label: "Rejected", color: "bg-red-600" },
    used: { label: "Used", color: "bg-purple-600" },
  };
  return configs[status] || { label: capitalize(status), color: "bg-zinc-600" };
}