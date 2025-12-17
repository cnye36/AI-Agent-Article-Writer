/**
 * Download an image from a base64 data URL or regular URL
 */
export function downloadImage(dataUrl: string, filename: string = "image.png") {
  // Create a temporary link element
  const link = document.createElement("a");

  if (dataUrl.startsWith("data:")) {
    // For base64 data URLs, use them directly
    link.href = dataUrl;
  } else {
    // For regular URLs, we might need to fetch and convert to blob
    // For now, just use the URL directly
    link.href = dataUrl;
  }

  // Extract file extension from data URL if possible
  if (dataUrl.startsWith("data:image/")) {
    const match = dataUrl.match(/^data:image\/(\w+);/);
    if (match && match[1]) {
      const ext = match[1];
      // Replace the extension in filename if it has one
      filename = filename.replace(/\.\w+$/, `.${ext}`);
    }
  }

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate a filename from prompt text
 */
export function generateFilename(
  prompt: string | null,
  imageId?: string
): string {
  if (!prompt) {
    return imageId ? `image-${imageId}.png` : "image.png";
  }

  // Take first few words of prompt, sanitize, and create filename
  const sanitized = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .substring(0, 50); // Limit length

  return `${sanitized}.png`;
}
