// Client-safe utilities for intelligent linking
// These functions don't use any server-side dependencies

import type { LinkOpportunity } from "@/types";

/**
 * Validate that anchor text exists in content (case-insensitive)
 */
export function validateAnchorText(content: string, anchorText: string): boolean {
  const normalizedContent = content.toLowerCase();
  const normalizedAnchor = anchorText.toLowerCase();
  return normalizedContent.includes(normalizedAnchor);
}

/**
 * Insert markdown links into content conservatively (no rewrites)
 */
export function insertLinksIntoContent(
  content: string,
  opportunities: LinkOpportunity[]
): { modifiedContent: string; insertedLinks: Array<{
  opportunityId: string;
  anchorText: string;
  targetArticleId: string;
  context: string;
}> } {
  let modifiedContent = content;
  const insertedLinks: Array<{
    opportunityId: string;
    anchorText: string;
    targetArticleId: string;
    context: string;
  }> = [];

  // Sort opportunities by position in content (to avoid index shifting)
  const sortedOpportunities = [...opportunities].sort((a, b) => {
    const posA = content.toLowerCase().indexOf(a.anchorText.toLowerCase());
    const posB = content.toLowerCase().indexOf(b.anchorText.toLowerCase());
    return posB - posA; // Reverse order to avoid index shifting
  });

  for (const opportunity of sortedOpportunities) {
    const { id, anchorText, canonicalUrl, targetArticleId } = opportunity;

    // Find the anchor text (case-insensitive)
    const lowerContent = modifiedContent.toLowerCase();
    const lowerAnchor = anchorText.toLowerCase();
    const index = lowerContent.indexOf(lowerAnchor);

    if (index === -1) {
      continue; // Anchor text not found
    }

    // Extract the actual text from content (preserves original case)
    const actualAnchorText = modifiedContent.substring(
      index,
      index + anchorText.length
    );

    // Check if already a link (crude check for markdown link syntax)
    const beforeText = modifiedContent.substring(Math.max(0, index - 10), index);
    const afterText = modifiedContent.substring(
      index + anchorText.length,
      Math.min(modifiedContent.length, index + anchorText.length + 10)
    );

    // Skip if already part of a link
    if (beforeText.includes("[") || afterText.startsWith("](")) {
      continue;
    }

    // Insert markdown link
    const markdownLink = `[${actualAnchorText}](${canonicalUrl})`;
    modifiedContent =
      modifiedContent.substring(0, index) +
      markdownLink +
      modifiedContent.substring(index + anchorText.length);

    // Extract context (50 chars before and after)
    const contextStart = Math.max(0, index - 50);
    const contextEnd = Math.min(
      modifiedContent.length,
      index + markdownLink.length + 50
    );
    const context = modifiedContent.substring(contextStart, contextEnd);

    insertedLinks.push({
      opportunityId: id,
      anchorText: actualAnchorText,
      targetArticleId,
      context,
    });
  }

  return { modifiedContent, insertedLinks };
}
