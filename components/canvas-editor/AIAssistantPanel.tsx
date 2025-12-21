"use client";

import { useState } from "react";
import { ImageLibrary } from "./ImageLibrary";
import { ImageLightbox } from "./ImageLightbox";

interface ImageItem {
  id: string;
  url: string;
  prompt: string | null;
  is_cover?: boolean;
}

interface AIAssistantPanelProps {
  selectedText: string;
  onApply: (action: string, customPrompt?: string) => void;
  isLoading: boolean;
  completion: string;
  onClose: () => void;
  onGenerateImage: (params: {
    prompt?: string;
    sectionContent?: string;
    model?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
    quality?: "low" | "medium" | "high";
  }) => Promise<void>;
  onGenerateCover?: (params?: {
    model?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
    quality?: "low" | "medium" | "high";
  }) => void;
  isGeneratingCoverImage?: boolean;
  images?: ImageItem[];
  onSetCoverImage?: (imageId: string) => Promise<void>;
  onDeleteImage?: (imageId: string) => Promise<void>;
  onEditImage?: (
    imageId: string,
    newImageData: string,
    newPrompt: string
  ) => Promise<void>;
  isGeneratingImage?: boolean;
  activeTab?: "text" | "image";
  onTabChange?: (tab: "text" | "image") => void;
  onRunEditor?: () => Promise<void>;
  isRunningEditor?: boolean;
  articleId?: string;
  imageModel?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
  imageQuality?: "low" | "medium" | "high";
  onImageModelChange?: (
    model: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini"
  ) => void;
  onImageQualityChange?: (quality: "low" | "medium" | "high") => void;
}

export function AIAssistantPanel({
  selectedText,
  onApply,
  isLoading,
  completion,
  onClose,
  onGenerateImage,
  onGenerateCover,
  isGeneratingCoverImage = false,
  images = [],
  onSetCoverImage,
  onDeleteImage,
  onEditImage,
  isGeneratingImage = false,
  activeTab: controlledActiveTab,
  onTabChange,
  onRunEditor,
  isRunningEditor = false,
  articleId,
  imageModel = "gpt-image-1-mini",
  imageQuality = "high",
  onImageModelChange,
  onImageQualityChange,
}: AIAssistantPanelProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [internalActiveTab, setInternalActiveTab] = useState<"text" | "image">(
    "text"
  );
  const [imagePrompt, setImagePrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  // Use controlled tab if provided, otherwise use internal state
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;

  const suggestions = [
    {
      label: "Make more engaging",
      prompt: "Rewrite to be more engaging and captivating",
    },
    {
      label: "Add statistics",
      prompt: "Expand with relevant statistics and data",
    },
    { label: "Fix grammar", prompt: "Fix any grammar or spelling issues" },
    {
      label: "Change tone to casual",
      prompt: "Rewrite in a casual, conversational tone",
    },
    {
      label: "Make more technical",
      prompt: "Add more technical depth and precision",
    },
    {
      label: "Shorten",
      prompt: "Make this more concise while keeping key points",
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
        <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
          AI Assistant
        </h3>
        <button
          onClick={onClose}
          className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white text-lg sm:text-xl"
        >
          ✕
        </button>
      </div>

      <div className="flex border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "text"
              ? "text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Text Edit
        </button>
        <button
          onClick={() => setActiveTab("image")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "image"
              ? "text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Image Gen
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin">
        {activeTab === "text" ? (
          <>
            {/* Editor Agent Button - Full Article Editing */}
            {onRunEditor && articleId && (
              <div className="space-y-2 mb-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
                <p className="text-xs text-slate-600 dark:text-zinc-500 font-medium">
                  Quality Assurance Editor
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  Review entire article for AI patterns, em dashes, duplicates,
                  and improve readability
                </p>
                <button
                  onClick={onRunEditor}
                  disabled={isRunningEditor || isLoading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white transition-colors"
                >
                  {isRunningEditor ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Editing Article...</span>
                    </>
                  ) : (
                    <>
                      <span>✏️</span>
                      <span>Run Editor Agent</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Selected Text Preview */}
            {selectedText && (
              <div className="bg-slate-100 dark:bg-zinc-900 rounded-lg p-2 sm:p-3">
                <p className="text-xs text-slate-600 dark:text-zinc-500 mb-2">
                  Selected text:
                </p>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-300 line-clamp-4">
                  {selectedText}
                </p>
              </div>
            )}

            {/* Quick Suggestions */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-zinc-500">
                Quick actions:
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => onApply("custom", s.prompt)}
                    disabled={!selectedText || isLoading}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full disabled:opacity-50 text-slate-900 dark:text-white"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-zinc-500">
                Custom instruction:
              </p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="E.g., 'Rewrite this paragraph to focus more on the business implications...'"
                className="w-full h-20 sm:h-24 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg p-2 sm:p-3 text-xs sm:text-sm resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
              <button
                onClick={() => onApply("custom", customPrompt)}
                disabled={!selectedText || !customPrompt || isLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Apply"}
              </button>
            </div>

            {/* AI Response Preview */}
            {completion && (
              <div className="bg-slate-100 dark:bg-zinc-900 rounded-lg p-2 sm:p-3">
                <p className="text-xs text-slate-600 dark:text-zinc-500 mb-2">
                  Preview:
                </p>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-300">
                  {completion}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Image Generation Tab */
          <div className="space-y-6">
            {/* Image Settings */}
            <div className="space-y-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-slate-200 dark:border-zinc-800">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                Image Settings
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-700 dark:text-zinc-400 mb-1.5 block">
                    Model
                  </label>
                  <select
                    value={imageModel}
                    onChange={(e) => {
                      const newModel = e.target.value as
                        | "gpt-image-1.5"
                        | "gpt-image-1"
                        | "gpt-image-1-mini";
                      console.log(
                        "🎨 [AIAssistantPanel] SELECT onChange FIRED!"
                      );
                      console.log(
                        "🎨 [AIAssistantPanel] Changing model from:",
                        imageModel,
                        "to:",
                        newModel
                      );
                      onImageModelChange?.(newModel);
                      console.log(
                        "🎨 [AIAssistantPanel] onImageModelChange called with:",
                        newModel
                      );
                    }}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white focus:border-blue-500/50 outline-none"
                  >
                    <option value="gpt-image-1.5">GPT Image 1.5</option>
                    <option value="gpt-image-1">GPT Image 1</option>
                    <option value="gpt-image-1-mini">GPT Image 1 Mini</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-700 dark:text-zinc-400 mb-1.5 block">
                    Quality
                  </label>
                  <select
                    value={imageQuality}
                    onChange={(e) => {
                      const newQuality = e.target.value as
                        | "low"
                        | "medium"
                        | "high";
                      console.log(
                        "🎨 [AIAssistantPanel] Quality changed from:",
                        imageQuality,
                        "to:",
                        newQuality
                      );
                      onImageQualityChange?.(newQuality);
                    }}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white focus:border-blue-500/50 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Context Aware Section */}
            {selectedText ? (
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-zinc-900 rounded-lg p-3 border border-slate-200 dark:border-zinc-800">
                  <p className="text-xs text-slate-600 dark:text-zinc-500 mb-2">
                    Selected Context:
                  </p>
                  <p className="text-sm text-slate-800 dark:text-zinc-300 line-clamp-3 italic">
                    &quot;{selectedText}&quot;
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-700 dark:text-zinc-400">
                    Instructions (Optional)
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="E.g., A minimalist line chart..."
                    className="w-full h-20 bg-white dark:bg-zinc-900 rounded-lg p-3 text-sm resize-none border border-slate-300 dark:border-zinc-700/50 focus:border-blue-500/50 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  />
                  <button
                    onClick={async () => {
                      console.log(
                        "🎨 AIAssistantPanel: Generate from Selection clicked"
                      );
                      console.log(
                        "🎨 AIAssistantPanel: imageModel state:",
                        imageModel
                      );
                      console.log(
                        "🎨 AIAssistantPanel: Calling onGenerateImage with model:",
                        imageModel
                      );
                      setActiveTab("image"); // Ensure we're on image tab
                      const prompt = imagePrompt
                        ? `${imagePrompt}. Based on text: ${selectedText}`
                        : undefined;
                      await onGenerateImage({
                        prompt,
                        sectionContent: selectedText,
                        model: imageModel,
                        quality: imageQuality,
                      });
                      setImagePrompt("");
                    }}
                    disabled={isLoading || isGeneratingImage}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading || isGeneratingImage
                      ? "Generating..."
                      : "Generate from Selection"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-slate-300 dark:border-zinc-800 text-center">
                <p className="text-sm text-slate-600 dark:text-zinc-500">
                  Select text in the editor to generate contextual images.
                </p>
              </div>
            )}

            <div className="w-full h-px bg-slate-200 dark:bg-zinc-800" />

            {/* General Image Creation */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                Create New Image
              </h4>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to create..."
                className="w-full h-24 bg-white dark:bg-zinc-900 rounded-lg p-3 text-sm resize-none border border-slate-300 dark:border-zinc-700/50 focus:border-blue-500/50 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
              <button
                onClick={async () => {
                  console.log("🎨 AIAssistantPanel: Generate button clicked");
                  console.log(
                    "🎨 AIAssistantPanel: imageModel state:",
                    imageModel
                  );
                  console.log(
                    "🎨 AIAssistantPanel: imageQuality state:",
                    imageQuality
                  );
                  console.log(
                    "🎨 AIAssistantPanel: Calling onGenerateImage with:",
                    {
                      prompt: imagePrompt,
                      model: imageModel,
                      quality: imageQuality,
                    }
                  );
                  setActiveTab("image"); // Switch to image tab
                  await onGenerateImage({
                    prompt: imagePrompt,
                    model: imageModel,
                    quality: imageQuality,
                  });
                  setImagePrompt("");
                }}
                disabled={!imagePrompt || isGeneratingImage || isLoading}
                className="w-full py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-slate-900 dark:text-white"
              >
                {isGeneratingImage || isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>🎨</span>
                    <span>Generate from Prompt</span>
                  </>
                )}
              </button>
            </div>

            <div className="w-full h-px bg-slate-200 dark:bg-zinc-800" />

            {/* Cover Image */}
            {onGenerateCover && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                  Article Cover
                </h4>
                <p className="text-xs text-slate-600 dark:text-zinc-500">
                  Generate a cover image based on the full article context.
                </p>
                <button
                  onClick={() => {
                    console.log(
                      "🎨 [AIAssistantPanel] Generate Cover clicked with model:",
                      imageModel,
                      "quality:",
                      imageQuality
                    );
                    onGenerateCover?.({
                      model: imageModel,
                      quality: imageQuality,
                    });
                  }}
                  disabled={isGeneratingCoverImage}
                  className="w-full py-2 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-slate-900 dark:text-white"
                >
                  {isGeneratingCoverImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-400 border-t-transparent" />
                      <span>Generating Cover Image...</span>
                    </>
                  ) : (
                    <span>Generate Cover Image</span>
                  )}
                </button>
                <p className="text-xs text-slate-500 dark:text-zinc-500 italic">
                  Using: {imageModel} ({imageQuality} quality)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator for image generation */}
        {isGeneratingImage && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800">
            <div className="bg-slate-100 dark:bg-zinc-900 rounded-lg p-4 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 dark:border-blue-500 border-t-transparent" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Generating Image...
                  </p>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                    This may take a few moments
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shared Image Library (Drag & Drop) - Always visible in image tab */}
        {activeTab === "image" && (
          <ImageLibrary
            images={images}
            onImageClick={(img) => setSelectedImage(img)}
            onSetCoverImage={(imageId) => {
              if (onSetCoverImage) {
                onSetCoverImage(imageId);
              }
            }}
            onDeleteImage={onDeleteImage}
          />
        )}
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImage && (
        <ImageLightbox
          selectedImage={selectedImage}
          images={images}
          onClose={() => setSelectedImage(null)}
          onSetCoverImage={onSetCoverImage}
          onNavigate={(image) => setSelectedImage(image)}
          onEditImage={onEditImage}
          articleId={articleId}
          imageModel={imageModel}
          imageQuality={imageQuality}
          isGeneratingImage={isGeneratingImage}
        />
      )}
    </div>
  );
}





