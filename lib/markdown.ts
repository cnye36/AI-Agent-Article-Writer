// Utilities for converting between TipTap JSON and Markdown

import type { JSONContent } from "@tiptap/core";

/**
 * Remove the first h1 heading from TipTap JSON content
 */
export function removeFirstH1(doc: JSONContent): JSONContent {
  if (!doc || !doc.content) {
    return doc;
  }

  // Find the first h1 heading
  const firstH1Index = doc.content.findIndex(
    (node) => node.type === "heading" && node.attrs?.level === 1
  );

  if (firstH1Index === -1) {
    return doc;
  }

  // Create a new content array without the first h1
  const newContent = doc.content.filter((_, index) => index !== firstH1Index);

  return {
    ...doc,
    content: newContent.length > 0 ? newContent : [{ type: "paragraph" }],
  };
}

/**
 * Convert TipTap JSON to Markdown
 * @param doc - TipTap JSON document or markdown string
 * @param options - Conversion options
 * @param options.skipFirstH1 - If true, skip the first h1 heading in the output
 */
export function tiptapToMarkdown(
  doc: JSONContent | string,
  options?: { skipFirstH1?: boolean }
): string {
  // If it's already a string, assume it's markdown
  if (typeof doc === "string") {
    // If skipFirstH1 is true, remove the first h1 from markdown string
    if (options?.skipFirstH1) {
      // Remove first line if it's an h1 heading
      const lines = doc.split("\n");
      const firstLine = lines[0]?.trim();
      if (firstLine && firstLine.startsWith("# ") && !firstLine.startsWith("##")) {
        return lines.slice(1).join("\n").trim();
      }
    }
    return doc;
  }

  // Handle empty or invalid content
  if (!doc || !doc.content) {
    return "";
  }

  // Remove first h1 if requested
  let processedDoc = doc;
  if (options?.skipFirstH1) {
    processedDoc = removeFirstH1(doc);
  }

  let markdown = "";

  function processNode(node: JSONContent): string {
    if (!node) return "";

    // Text node
    if (node.type === "text") {
      let text = node.text || "";
      
      // Apply marks
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") {
            text = `**${text}**`;
          } else if (mark.type === "italic") {
            text = `*${text}*`;
          } else if (mark.type === "code") {
            text = `\`${text}\``;
          } else if (mark.type === "link") {
            const href = mark.attrs?.href || "";
            text = `[${text}](${href})`;
          }
        }
      }
      
      return text;
    }

    // Block nodes
    let content = "";
    if (node.content) {
      content = node.content.map(processNode).join("");
    }

    switch (node.type) {
      case "heading":
        const level = node.attrs?.level || 1;
        const prefix = "#".repeat(level);
        return `${prefix} ${content}\n\n`;

      case "paragraph":
        return `${content}\n\n`;

      case "bulletList":
        return node.content
          ?.map((item) => {
            if (item.type === "listItem" && item.content) {
              const itemContent = item.content
                .map(processNode)
                .join("")
                .trim();
              return `- ${itemContent}\n`;
            }
            return "";
          })
          .join("") || "";

      case "orderedList":
        return node.content
          ?.map((item, index) => {
            if (item.type === "listItem" && item.content) {
              const itemContent = item.content
                .map(processNode)
                .join("")
                .trim();
              return `${index + 1}. ${itemContent}\n`;
            }
            return "";
          })
          .join("") || "";

      case "blockquote":
        return `> ${content.trim().replace(/\n/g, "\n> ")}\n\n`;

      case "codeBlock":
        const language = node.attrs?.language || "";
        return `\`\`\`${language}\n${content}\`\`\`\n\n`;

      case "horizontalRule":
        return "---\n\n";

      case "hardBreak":
        return "\n";

      default:
        return content;
    }
  }

  // Process all top-level nodes
  markdown = processedDoc.content.map(processNode).join("");

  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return markdown;
}

/**
 * Convert Markdown to TipTap JSON
 */
export function markdownToTiptap(markdown: string): JSONContent {
  if (!markdown || markdown.trim() === "") {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    };
  }

  const lines = markdown.split("\n");
  const content: JSONContent[] = [];
  let inCodeBlock = false;
  let codeBlockLanguage = "";
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: JSONContent[] = [];
  let listType: "bulletList" | "orderedList" = "bulletList";

  function flushCodeBlock() {
    if (inCodeBlock && codeBlockContent.length > 0) {
      content.push({
        type: "codeBlock",
        attrs: { language: codeBlockLanguage },
        content: [
          {
            type: "text",
            text: codeBlockContent.join("\n"),
          },
        ],
      });
      codeBlockContent = [];
      inCodeBlock = false;
      codeBlockLanguage = "";
    }
  }

  function flushList() {
    if (inList && listItems.length > 0) {
      content.push({
        type: listType,
        content: listItems,
      });
      listItems = [];
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headings
    if (trimmed.startsWith("#")) {
      flushList();
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        content.push({
          type: "heading",
          attrs: { level },
          content: parseInlineText(text),
        });
      }
      continue;
    }

    // Horizontal rule
    if (trimmed.match(/^---+$/)) {
      flushList();
      content.push({ type: "horizontalRule" });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushList();
      const text = trimmed.slice(1).trim();
      content.push({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: parseInlineText(text),
          },
        ],
      });
      continue;
    }

    // Lists
    const bulletMatch = trimmed.match(/^-\s+(.+)$/);
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);

    if (bulletMatch || orderedMatch) {
      const match = bulletMatch || orderedMatch;
      if (match) {
        const text = match[2] || match[1];
        const isOrdered = !!orderedMatch;

        if (!inList || (isOrdered && listType === "bulletList") || (!isOrdered && listType === "orderedList")) {
          flushList();
          inList = true;
          listType = isOrdered ? "orderedList" : "bulletList";
        }

        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineText(text),
            },
          ],
        });
      }
      continue;
    }

    // Regular paragraph
    if (trimmed) {
      flushList();
      content.push({
        type: "paragraph",
        content: parseInlineText(trimmed),
      });
    } else if (!inList && !inCodeBlock) {
      // Empty line - add paragraph break if not in list/code
      if (content.length > 0 && content[content.length - 1].type !== "paragraph") {
        content.push({
          type: "paragraph",
        });
      }
    }
  }

  flushCodeBlock();
  flushList();

  // Ensure at least one paragraph
  if (content.length === 0) {
    content.push({
      type: "paragraph",
    });
  }

  return {
    type: "doc",
    content,
  };
}

/**
 * Parse inline markdown text (bold, italic, links, code)
 */
function parseInlineText(text: string): JSONContent[] {
  const nodes: JSONContent[] = [];
  let currentIndex = 0;

  // Patterns for markdown syntax
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: "bold" }, // Bold
    { regex: /\*([^*]+)\*/g, type: "italic" }, // Italic
    { regex: /`([^`]+)`/g, type: "code" }, // Inline code
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: "link" }, // Links
  ];

  const matches: Array<{
    index: number;
    length: number;
    type: string;
    content: string;
    href?: string;
  }> = [];

  // Find all matches
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: pattern.type,
        content: pattern.type === "link" ? match[1] : match[1],
        href: pattern.type === "link" ? match[2] : undefined,
      });
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Remove overlapping matches (keep first)
  const filteredMatches: typeof matches = [];
  for (const match of matches) {
    const overlaps = filteredMatches.some(
      (m) =>
        (match.index >= m.index && match.index < m.index + m.length) ||
        (m.index >= match.index && m.index < match.index + match.length)
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  }

  // Build nodes
  for (const match of filteredMatches) {
    // Add text before match
    if (match.index > currentIndex) {
      const textBefore = text.substring(currentIndex, match.index);
      if (textBefore) {
        nodes.push({
          type: "text",
          text: textBefore,
        });
      }
    }

    // Add matched content with marks
    const marks: NonNullable<JSONContent["marks"]> = [];
    if (match.type === "bold") {
      marks.push({ type: "bold" });
    } else if (match.type === "italic") {
      marks.push({ type: "italic" });
    } else if (match.type === "code") {
      marks.push({ type: "code" });
    } else if (match.type === "link") {
      marks.push({
        type: "link",
        attrs: { href: match.href, target: "_blank" },
      });
    }

    nodes.push({
      type: "text",
      text: match.content,
      marks: marks.length > 0 ? marks : undefined,
    });

    currentIndex = match.index + match.length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remaining = text.substring(currentIndex);
    if (remaining) {
      nodes.push({
        type: "text",
        text: remaining,
      });
    }
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

