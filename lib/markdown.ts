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
 * Clean markdown content by removing base64 data URLs and prompt text that shouldn't be in the content
 * This function removes lines containing base64 image data that may have been accidentally saved as text
 */
export function cleanMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== "string") {
    return markdown;
  }
  
  // First, remove any base64 data URLs that span multiple lines
  // Base64 data URLs can be extremely long (thousands of characters)
  // Use a regex to remove the entire pattern: data:image/<type>;base64,<very_long_base64_string>
  markdown = markdown.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=\s]{100,}/g, '');
  
  // Remove multi-line image generation prompt blocks
  // Pattern: ![Image Generation Prompt: followed by multi-line content (may be malformed)
  // Also handles ||Generate an AI art image patterns
  // Using [\s\S] instead of . with s flag for ES2017 compatibility
  markdown = markdown.replace(/!\[Image Generation Prompt:[^\n]*\n[\s\S]*?(?=\n\n|\n#|\n!\[[^\]]+\]\(|$)/g, '');
  markdown = markdown.replace(/!\[Generation Prompt:[^\n]*\n[\s\S]*?(?=\n\n|\n#|\n!\[[^\]]+\]\(|$)/gi, '');
  markdown = markdown.replace(/!\[Prompt:[^\n]*\n[\s\S]*?(?=\n\n|\n#|\n!\[[^\]]+\]\(|$)/gi, '');
  
  // Remove prompt blocks that start with ||Generate or |Generate
  markdown = markdown.replace(/\|+Generate an AI art image[\s\S]*?(?=\n\n|\n#|\n!\[[^\]]+\]\(|$)/gi, '');
  markdown = markdown.replace(/\|+Generate.*?cover[\s\S]*?(?=\n\n|\n#|\n!\[[^\]]+\]\(|$)/gi, '');
  
  // Now process line by line
  const lines = markdown.split("\n");
  const cleaned: string[] = [];
  let inPromptBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    
    // Skip empty lines that might be left after removing base64
    if (!trimmed) {
      if (!inPromptBlock) {
        cleaned.push(line);
      }
      continue;
    }
    
    // Detect start of prompt block - malformed image markdown with "Image Generation Prompt" or "Prompt:"
    // Also detect ||Generate or |Generate patterns
    if (trimmed.match(/^!\[(Image )?Generation Prompt:/i) || 
        trimmed.match(/^!\[Prompt:/i) ||
        trimmed.match(/^\|+Generate/i) ||
        trimmed.match(/^\|+\s*Generate.*?(art|AI).*?image/i) ||
        (trimmed.startsWith('![Image Generation Prompt') && !trimmed.includes(']('))) {
      inPromptBlock = true;
      continue;
    }
    
    // If we're in a prompt block, check if we should continue skipping
    if (inPromptBlock) {
      // Check for common prompt keywords that indicate we're still in the prompt
      const isPromptContent = 
        lowerTrimmed.includes('text overlay') ||
        lowerTrimmed.includes('main text:') ||
        lowerTrimmed.includes('supporting text:') ||
        lowerTrimmed.includes('visual style:') ||
        lowerTrimmed.includes('design elements:') ||
        lowerTrimmed.includes('aspect ratio:') ||
        trimmed.match(/^Aspect Ratio:/i) ||
        trimmed.match(/^Text Overlay:/i) ||
        trimmed.match(/^Visual Style:/i) ||
        trimmed.match(/^Design Elements:/i) ||
        lowerTrimmed.includes('gradient') && lowerTrimmed.includes('blue') ||
        lowerTrimmed.match(/^[•\-\*]\s+(use|integrate|ensure|incorporate)/i) ||
        (trimmed.match(/^[•\-\*]/) && lowerTrimmed.includes('text') && lowerTrimmed.includes('overlay'));
      
      // If we hit a clear markdown element (heading, image, etc.) we've left the prompt block
      if (trimmed.startsWith('#') || trimmed.match(/^!\[[^\]]+\]\(/)) {
        inPromptBlock = false;
        cleaned.push(line);
        continue;
      }
      
      // Continue skipping prompt content
      if (isPromptContent) {
        continue;
      }
      
      // If we've gone a few lines without prompt content, exit the block
      // Check if this looks like normal article content
      if (trimmed.length > 0 && !isPromptContent) {
        // Look ahead to see if there's more prompt content
        let hasMorePrompt = false;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim().toLowerCase();
          if (nextLine.includes('visual style') || nextLine.includes('design elements') || 
              nextLine.includes('text overlay') && nextLine.includes('main text')) {
            hasMorePrompt = true;
            break;
          }
        }
        if (!hasMorePrompt) {
          inPromptBlock = false;
        } else {
          continue; // Still in prompt block
        }
      }
    }
    
    // Skip lines that are pure base64 data URLs (data:image/*;base64,...)
    if (trimmed.match(/^data:image\/[^;]+;base64,[A-Za-z0-9+/=]+$/)) {
      continue;
    }
    
    // Skip lines that start with base64 data URLs
    if (trimmed.startsWith("data:image/") && trimmed.includes(";base64,")) {
      continue;
    }
    
    // Skip lines that contain very long base64 strings
    const base64Match = trimmed.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=\s]+)/);
    if (base64Match && base64Match[1]) {
      const base64Data = base64Match[1].replace(/\s/g, '');
      if (base64Data.length > 50) {
        continue;
      }
    }
    
    // Skip lines that are just base64 characters
    if (trimmed.length > 100 && trimmed.match(/^[A-Za-z0-9+/=\s]+$/)) {
      const base64CharCount = (trimmed.match(/[A-Za-z0-9+/=]/g) || []).length;
      if (base64CharCount / trimmed.length > 0.9) {
        continue;
      }
    }
    
    // Skip lines that look like image generation prompts
    const isPromptLine = 
      trimmed.match(/^!\[(Image )?Generation Prompt:/i) ||
      trimmed.match(/^!\[Prompt:/i) ||
      (lowerTrimmed.includes('cover image') && lowerTrimmed.includes('aspect ratio') && lowerTrimmed.length > 50) ||
      (lowerTrimmed.includes('image generation prompt') && lowerTrimmed.length > 30) ||
      (lowerTrimmed.includes('eye-catching text overlay') && lowerTrimmed.includes('gradient')) ||
      (lowerTrimmed.includes('dynamic and modern cover image') && lowerTrimmed.includes('16:9')) ||
      (trimmed.match(/^[•\-\*]\s*Main Text:/i)) ||
      (trimmed.match(/^[•\-\*]\s*Supporting Text:/i)) ||
      (trimmed.match(/^[•\-\*]\s*Visual Style:/i)) ||
      (trimmed.match(/^[•\-\*]\s*Design Elements:/i));
    
    if (isPromptLine) {
      continue;
    }
    
    // Keep all other lines
    cleaned.push(line);
  }
  
  return cleaned.join("\n");
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
      if (
        firstLine &&
        firstLine.startsWith("# ") &&
        !firstLine.startsWith("##")
      ) {
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

      // Skip text nodes that are base64 data URLs (they shouldn't be saved as text)
      if (
        text.match(/^data:image\/[^;]+;base64,[A-Za-z0-9+/=]+$/) ||
        (text.startsWith("data:image/") &&
          text.includes(";base64,") &&
          text.length > 100)
      ) {
        return ""; // Don't include base64 data URLs as text content
      }

      // Skip text that looks like image generation prompts
      const lowerText = text.toLowerCase();
      if (
        text.match(/^\|+\s*Generate/i) || // ||Generate or |Generate patterns
        text.match(/^Aspect Ratio:/i) ||
        text.match(/^Text Overlay:/i) ||
        text.match(/^Visual Style:/i) ||
        text.match(/^Design Elements:/i) ||
        (lowerText.includes("generate") &&
          lowerText.includes("ai") &&
          lowerText.includes("image")) ||
        (lowerText.includes("generate") &&
          lowerText.includes("art") &&
          lowerText.includes("cover")) ||
        (text.length > 100 &&
          ((lowerText.includes("cover image") &&
            lowerText.includes("aspect ratio") &&
            lowerText.includes("eye-catching")) ||
            (lowerText.includes("image generation prompt") &&
              lowerText.includes("dynamic and modern")) ||
            (lowerText.includes("text overlay") &&
              lowerText.includes("gradient background") &&
              lowerText.includes("16:9"))))
      ) {
        return ""; // Don't include image generation prompts as text content
      }

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
        // Skip paragraphs that contain only base64 data URLs
        const paragraphText = content.trim();
        if (
          paragraphText.match(/^data:image\/[^;]+;base64,[A-Za-z0-9+/=]+$/) ||
          (paragraphText.startsWith("data:image/") &&
            paragraphText.includes(";base64,") &&
            paragraphText.length > 100)
        ) {
          return ""; // Don't include base64 data URLs as text content
        }

        // Skip paragraphs that look like image generation prompts
        const lowerParagraphText = paragraphText.toLowerCase();
        if (
          paragraphText.match(/^!\[Prompt:.*\]\(\)$/) || // ![Prompt:]() format
          paragraphText.match(/^\|+\s*Generate/i) || // ||Generate or |Generate patterns
          paragraphText.match(/^Aspect Ratio:/i) || // Aspect Ratio: line
          paragraphText.match(/^Text Overlay:/i) ||
          paragraphText.match(/^Visual Style:/i) ||
          paragraphText.match(/^Design Elements:/i) ||
          (lowerParagraphText.includes("generate") &&
            lowerParagraphText.includes("ai") &&
            lowerParagraphText.includes("image")) ||
          (lowerParagraphText.includes("generate") &&
            lowerParagraphText.includes("art") &&
            lowerParagraphText.includes("cover")) ||
          (paragraphText.length > 100 &&
            lowerParagraphText.includes("cover image") &&
            lowerParagraphText.includes("aspect ratio") &&
            lowerParagraphText.includes("eye-catching")) ||
          (lowerParagraphText.includes("image generation prompt") &&
            lowerParagraphText.includes("dynamic and modern")) ||
          (lowerParagraphText.includes("text overlay") &&
            lowerParagraphText.includes("gradient background") &&
            lowerParagraphText.includes("16:9"))
        ) {
          return ""; // Don't include image generation prompts as text content
        }

        return `${content}\n\n`;

      case "bulletList":
        return (
          node.content
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
            .join("") || ""
        );

      case "orderedList":
        return (
          node.content
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
            .join("") || ""
        );

      case "blockquote":
        return `> ${content.trim().replace(/\n/g, "\n> ")}\n\n`;

      case "codeBlock":
        const language = node.attrs?.language || "";
        return `\`\`\`${language}\n${content}\`\`\`\n\n`;

      case "horizontalRule":
        return "---\n\n";

      case "hardBreak":
        return "\n";

      case "image":
        const src = node.attrs?.src || "";
        const alt = node.attrs?.alt || "";
        return `![${alt}](${src})\n\n`;

      case "table":
        if (!node.content || node.content.length === 0) return "";

        // Process table rows
        const rows = node.content;
        let tableMarkdown = "";

        // Helper to get cell text content
        const getCellContent = (cell: JSONContent): string => {
          if (!cell.content) return "";
          return cell.content.map((c) => {
            if (c.type === "paragraph" && c.content) {
              return c.content.map(processNode).join("").trim();
            }
            return processNode(c).trim();
          }).join("");
        };

        // Process first row (headers)
        if (rows[0] && rows[0].content) {
          const headerCells = rows[0].content;
          const headers = headerCells.map(getCellContent);
          tableMarkdown += `| ${headers.join(" | ")} |\n`;
          tableMarkdown += `| ${headers.map(() => "---").join(" | ")} |\n`;
        }

        // Process remaining rows (data)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row.content) {
            const cells = row.content.map(getCellContent);
            tableMarkdown += `| ${cells.join(" | ")} |\n`;
          }
        }

        return tableMarkdown + "\n";

      case "tableRow":
      case "tableHeader":
      case "tableCell":
        // These are handled by the table case above
        return content;

      default:
        return content;
    }
  }

  // Process all top-level nodes
  markdown = processedDoc.content?.map(processNode).join("") || "";

  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  // Clean out any base64 data URLs or prompt text that shouldn't be in the content
  markdown = cleanMarkdown(markdown);

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

  // Clean the markdown first to remove any base64 data URLs
  markdown = cleanMarkdown(markdown);

  const lines = markdown.split("\n");
  const content: JSONContent[] = [];
  let inCodeBlock = false;
  let codeBlockLanguage = "";
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: JSONContent[] = [];
  let listType: "bulletList" | "orderedList" = "bulletList";
  let inTable = false;
  let tableRows: JSONContent[] = [];

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

  function flushTable() {
    if (inTable && tableRows.length > 0) {
      content.push({
        type: "table",
        content: tableRows,
      });
      tableRows = [];
      inTable = false;
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

        if (
          !inList ||
          (isOrdered && listType === "bulletList") ||
          (!isOrdered && listType === "orderedList")
        ) {
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

    // Images - markdown format: ![alt](src)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushList();
      flushTable();
      content.push({
        type: "image",
        attrs: {
          src: imageMatch[2],
          alt: imageMatch[1] || "",
        },
      });
      continue;
    }

    // Tables - markdown format: | Header 1 | Header 2 |
    const tableRowMatch = trimmed.match(/^\|(.+)\|$/);
    if (tableRowMatch) {
      flushList();

      // Check if this is a separator row (| --- | --- |)
      const isSeparator = trimmed.match(/^\|[\s\-:|]+\|$/);

      if (isSeparator) {
        // Skip separator rows, they just define the table structure
        inTable = true;
        continue;
      }

      // Parse table cells
      const cellsText = tableRowMatch[1].split("|").map((cell) => cell.trim());

      // Determine if this is a header row (first row of the table)
      const isHeaderRow = !inTable || tableRows.length === 0;
      const cellType = isHeaderRow ? "tableHeader" : "tableCell";

      const cells: JSONContent[] = cellsText.map((cellText) => ({
        type: cellType,
        attrs: {},
        content: [
          {
            type: "paragraph",
            content: cellText ? parseInlineText(cellText) : [],
          },
        ],
      }));

      tableRows.push({
        type: "tableRow",
        content: cells,
      });

      inTable = true;
      continue;
    } else if (inTable) {
      // No longer in a table, flush it
      flushTable();
    }

    // Skip lines that are pure base64 data URLs (they shouldn't be in markdown as text)
    // These might have been accidentally saved as text content
    if (trimmed.match(/^data:image\/[^;]+;base64,[A-Za-z0-9+/=]+$/)) {
      continue;
    }

    // Skip lines that start with base64 data URLs (even if wrapped)
    if (trimmed.startsWith("data:image/") && trimmed.includes(";base64,")) {
      // Check if it's a very long line (likely base64 data)
      if (trimmed.length > 100) {
        continue;
      }
    }

    // Skip lines that look like image generation prompts
    const lowerTrimmed = trimmed.toLowerCase();
    if (
      trimmed.match(/^!\[Prompt:.*\]\(\)$/) || // ![Prompt:]() format
      trimmed.match(/^\|+\s*Generate/i) || // ||Generate or |Generate patterns
      trimmed.match(/^Aspect Ratio:/i) || // Aspect Ratio: line
      (lowerTrimmed.includes("generate") &&
        lowerTrimmed.includes("ai") &&
        lowerTrimmed.includes("image")) ||
      (lowerTrimmed.includes("generate") &&
        lowerTrimmed.includes("art") &&
        lowerTrimmed.includes("image")) ||
      (trimmed.length > 100 &&
        lowerTrimmed.includes("cover image") &&
        lowerTrimmed.includes("aspect ratio") &&
        lowerTrimmed.includes("eye-catching")) ||
      (trimmed.length > 100 &&
        lowerTrimmed.includes("image generation prompt") &&
        lowerTrimmed.includes("dynamic and modern")) ||
      (trimmed.length > 100 &&
        lowerTrimmed.includes("text overlay") &&
        lowerTrimmed.includes("gradient background") &&
        lowerTrimmed.includes("16:9"))
    ) {
      continue; // Skip prompt lines
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
      if (
        content.length > 0 &&
        content[content.length - 1].type !== "paragraph"
      ) {
        content.push({
          type: "paragraph",
        });
      }
    }
  }

  flushCodeBlock();
  flushList();
  flushTable();

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

