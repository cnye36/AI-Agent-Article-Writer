import { Mark, mergeAttributes } from "@tiptap/core";

export const LoadingMark = Mark.create({
  name: "loading",

  addOptions() {
    return {
      HTMLAttributes: {
        class: "ai-loading-skeleton",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-loading]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-loading": "true",
      }),
      0,
    ];
  },
});

