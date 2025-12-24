import Image from "@tiptap/extension-image";
import { Node } from "@tiptap/core";

export const ImageWithRemove = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      prompt: {
        default: null,
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement("div");
      container.className = "image-wrapper relative inline-block group my-2";
      container.style.display = "inline-block";
      
      // Create a wrapper div with padding for the border
      const imageWrapper = document.createElement("div");
      imageWrapper.style.padding = "4px";
      imageWrapper.style.border = "1px solid transparent";
      imageWrapper.style.borderRadius = "0.5rem";
      imageWrapper.style.transition = "all 0.2s ease";
      imageWrapper.style.display = "inline-block";
      
      // Track hover state
      let isHovering = false;
      
      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || "";
      img.className = "rounded-lg cursor-move transition-all max-w-full block";
      img.draggable = true;
      img.style.display = "block";
      
      // Add hover and active states with padding
      imageWrapper.onmouseenter = () => {
        isHovering = true;
        imageWrapper.style.border = "1px solid rgb(59 130 246 / 0.5)";
        imageWrapper.style.boxShadow = "0 0 0 1px rgb(59 130 246 / 0.3)";
      };
      imageWrapper.onmouseleave = () => {
        isHovering = false;
        // Check if this specific image is still selected
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos === null || pos === undefined) {
          imageWrapper.style.border = "1px solid transparent";
          imageWrapper.style.boxShadow = "none";
          return;
        }
        
        const { from, to } = editor.state.selection;
        const isActive = from <= pos && to >= pos + node.nodeSize;
        
        if (!isActive) {
          imageWrapper.style.border = "1px solid transparent";
          imageWrapper.style.boxShadow = "none";
        }
      };
      
      // Update active state when selection changes
      const updateActiveState = () => {
        // Check if this specific image is selected by comparing positions
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos === null || pos === undefined) {
          if (!isHovering) {
            imageWrapper.style.border = "1px solid transparent";
            imageWrapper.style.boxShadow = "none";
          }
          return;
        }
        
        const { from, to } = editor.state.selection;
        // Check if selection is within this image node
        const isActive = from <= pos && to >= pos + node.nodeSize;
        
        if (isActive) {
          imageWrapper.style.border = "1px solid rgb(59 130 246 / 0.6)";
          imageWrapper.style.boxShadow = "0 0 0 1px rgb(59 130 246 / 0.4)";
        } else {
          // Only clear if not hovering
          if (!isHovering) {
            imageWrapper.style.border = "1px solid transparent";
            imageWrapper.style.boxShadow = "none";
          }
        }
      };
      
      // Listen for selection updates
      editor.on("selectionUpdate", updateActiveState);
      
      // Initial state check
      setTimeout(updateActiveState, 0);
      
      // Set up drag handler to mark this as coming from canvas
      img.ondragstart = (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData("image/url", node.attrs.src);
          e.dataTransfer.setData("image/alt", node.attrs.alt || "");
          e.dataTransfer.setData("image/prompt", node.attrs.prompt || "");
          e.dataTransfer.setData("image/from-canvas", "true");
          e.dataTransfer.effectAllowed = "move";
          // Store position for later removal
          const pos = typeof getPos === "function" ? getPos() : null;
          if (pos !== null && pos !== undefined) {
            (e.dataTransfer as any).canvasImagePos = pos;
            (e.dataTransfer as any).canvasImageSize = node.nodeSize;
          }
        }
      };
      
      // X button to remove from canvas
      const removeButton = document.createElement("button");
      removeButton.className = "absolute top-2 right-2 z-10 p-1.5 bg-red-600 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer";
      removeButton.setAttribute("aria-label", "Remove from canvas");
      removeButton.setAttribute("data-image-remove-button", "true");
      removeButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;
      removeButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos !== null && pos !== undefined) {
          editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
        }
      };
      // Also handle on mousedown to catch it earlier
      removeButton.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };
      
      imageWrapper.appendChild(img);
      container.appendChild(imageWrapper);
      container.appendChild(removeButton);
      
      return {
        dom: container,
        contentDOM: null,
        destroy: () => {
          // Clean up event listener
          editor.off("selectionUpdate", updateActiveState);
        },
      };
    };
  },
});

