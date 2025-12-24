"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useArticleGeneration } from "@/hooks/use-article-generation";
import { useStreamingWriter } from "@/hooks/use-streaming-writer";
import type { ArticleType, GenerationConfig, Topic } from "@/types";
import type { UserPreferences } from "@/hooks/use-user-preferences";
import { INDUSTRIES } from "@/lib/onboarding-config";
import { TopicsStage } from "./topics-stage";
import { OutlineStage } from "./outline-stage";
import { StreamingContentStage } from "./streaming-content-stage";
import { LoadingDialog } from "./loading-dialog";
import { LinkReviewStage } from "./link-review-stage";

type Stage = "config" | "topics" | "outline" | "content" | "linking";

function getStageIndex(stage: Stage): number {
  const stages: Stage[] = ["config", "topics", "outline", "content", "linking"];
  return stages.indexOf(stage);
}

interface CreateArticleFlowProps {
  initialTopic?: Topic | null;
  onTopicProcessed?: () => void;
  onBackToTopicsFeed?: () => void;
  userPreferences?: UserPreferences;
}

export function CreateArticleFlow({
  initialTopic,
  onTopicProcessed,
  onBackToTopicsFeed,
  userPreferences,
}: CreateArticleFlowProps = {}) {
  const router = useRouter();
  const {
    stage,
    config,
    setConfig,
    startResearch,
    topics,
    researchMetadata,
    selectTopic,
    selectDifferentTopic,
    outline,
    approveOutline,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    article, // Unused - we use streamedArticle instead
    isLoading,
    goToStage,
    error,
    handleSaveSelected,
    linkSuggestions,
    applyLinks,
    skipLinking,
  } = useArticleGeneration();

  // Publishing sites for link generation
  const [publishingSites, setPublishingSites] = useState<Array<{
    id: string;
    name: string;
    base_path: string;
  }>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Fetch publishing sites on mount
  useEffect(() => {
    async function fetchSites() {
      try {
        const response = await fetch("/api/publishing-sites");
        const data = await response.json();
        if (data.success && data.data) {
          setPublishingSites(data.data);
          if (data.data.length > 0) {
            setSelectedSiteId(data.data[0].id); // Default to first site
          }
        }
      } catch (error) {
        console.error("Error fetching publishing sites:", error);
      }
    }
    fetchSites();
  }, []);

  // Streaming writer for real-time article generation
  const {
    progress: streamingProgress,
    content: streamingContent,
    article: streamedArticle,
    error: streamingError,
    startStreaming,
    cancelStreaming,
  } = useStreamingWriter({
    onArticleCreated: () => {
      // Article placeholder created in database
      // Hide the "starting" dialog - streaming UI will take over
      setIsStartingWriting(false);
    },
    onArticleReady: (article) => {
      // Article is complete - navigate to the article page
      // (StreamingContentStage component handles the delay before redirect)
      if (article?.id) {
        router.push(`/article/${article.id}`);
      }
    },
    onError: () => {
      // Hide loading dialog on error
      setIsStartingWriting(false);
    },
  });

  // Track processed topics to avoid reprocessing
  const processedTopicIds = useRef<Set<string>>(new Set());
  // Track if we came from the Topic Feed (so we know to redirect back to topics tab)
  const cameFromFeed = useRef<boolean>(false);
  // Track if we're using streaming mode (always true for now)
  const useStreaming = true;
  // Track if we're starting the writing process
  const [isStartingWriting, setIsStartingWriting] = useState(false);

  // Handle initial topic selection from Topic Feed
  useEffect(() => {
    if (initialTopic && initialTopic.id && stage === "config" && !isLoading) {
      // Skip if we've already processed this topic
      if (processedTopicIds.current.has(initialTopic.id)) {
        return;
      }

      // Mark as processed and that we came from feed
      processedTopicIds.current.add(initialTopic.id);
      cameFromFeed.current = true;

      // Set config based on topic's industry if available
      if (initialTopic.industry_id || initialTopic.industries) {
        const industryId =
          initialTopic.industry_id || initialTopic.industries?.id;
        if (industryId) {
          setConfig({ industry: industryId });
        }
      }
      // Select the topic which will generate the outline
      selectTopic(initialTopic)
        .then(() => {
          // Notify parent that topic has been processed
          onTopicProcessed?.();
        })
        .catch((error) => {
          console.error("Error selecting initial topic:", error);
          // Remove from processed set so it can be retried
          processedTopicIds.current.delete(initialTopic.id);
          cameFromFeed.current = false;
          onTopicProcessed?.();
        });
    }
  }, [
    initialTopic,
    stage,
    selectTopic,
    setConfig,
    onTopicProcessed,
    isLoading,
  ]);

  // Debug logging
  console.log("[CreateArticleFlow] Current state:", {
    stage,
    useStreaming,
    hasStreamedArticle: !!streamedArticle,
    hasStreamingProgress: !!streamingProgress,
    isStreaming:
      !!streamingProgress ||
      !!streamingContent.hook ||
      streamingContent.sections.length > 0,
  });

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Loading Dialog - Show when researching topics from config stage (but not when we have initialTopic) */}
      <LoadingDialog
        isOpen={isLoading && stage === "config" && !initialTopic}
        title="Finding Topics"
        message="Researching trending topics and opportunities in your selected industry. This may take a moment..."
      />

      {/* Loading Dialog - Show when selecting a topic from feed or from topics stage */}
      <LoadingDialog
        isOpen={
          isLoading &&
          ((stage === "config" && !!initialTopic) ||
            (stage === "topics" && topics.length > 0))
        }
        title="Creating Outline"
        message="Creating an outline for your selected topic. This may take a moment..."
      />

      {/* Loading Dialog - Show when starting to write article */}
      <LoadingDialog
        isOpen={isStartingWriting}
        title="Starting Article Generation"
        message="Preparing to write your article. You'll be redirected to the editor shortly..."
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 overflow-x-auto pb-2">
        {["config", "topics", "outline", "content"].map((s, i) => (
          <div key={s} className="flex items-center flex-shrink-0">
            <button
              onClick={() => goToStage(s as Stage)}
              disabled={getStageIndex(stage) < i}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                stage === s
                  ? "bg-blue-600 text-white"
                  : getStageIndex(stage) > i
                  ? "bg-green-600 hover:bg-green-500 cursor-pointer text-white"
                  : "bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 cursor-pointer text-slate-700 dark:text-white"
              }`}
            >
              {getStageIndex(stage) > i ? "✓" : i + 1}
            </button>
            {i < 3 && (
              <div className="w-8 sm:w-16 h-0.5 bg-slate-200 dark:bg-zinc-800 mx-1 sm:mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Stage Content */}
      {stage === "config" && (
        <ConfigStage
          config={config}
          onChange={(updates) => setConfig(updates)}
          onNext={() => {
            // Reset cameFromFeed flag when starting new research from config
            cameFromFeed.current = false;
            startResearch(config);
          }}
          userPreferences={userPreferences}
        />
      )}

      {stage === "topics" && stage === "topics" && (
        <TopicsStage
          topics={topics}
          isLoading={isLoading}
          researchMetadata={researchMetadata}
          onSelect={(topic) => {
            console.log("TopicsStage onSelect called with:", topic);
            selectTopic(topic);
          }}
          onSaveSelected={handleSaveSelected}
          onBack={() => goToStage("config")}
        />
      )}

      {stage === "outline" && (
        <OutlineStage
          outline={outline}
          isLoading={isLoading}
          onApprove={async () => {
            if (useStreaming && outline) {
              console.log(
                "[CreateArticleFlow] Starting streaming mode for outline:",
                outline.id
              );
              // Show loading dialog briefly while initializing
              setIsStartingWriting(true);
              try {
                // Change stage to content to show streaming UI
                console.log("[CreateArticleFlow] Changing stage to content");
                goToStage("content");
                console.log(
                  "[CreateArticleFlow] Stage changed, starting stream"
                );
                // Start streaming - the hook will handle navigation when article is ready
                await startStreaming(outline.id);
                console.log("[CreateArticleFlow] Streaming completed");
              } catch (error) {
                console.error(
                  "[CreateArticleFlow] Error starting streaming:",
                  error
                );
                setIsStartingWriting(false);
                // Go back to outline on error
                goToStage("outline");
              }
            } else {
              // Fall back to traditional non-streaming mode
              approveOutline(selectedSiteId || undefined);
            }
          }}
          onBack={() => {
            // If we came from the feed, go back to topics tab
            // Otherwise, go to topics stage
            if (cameFromFeed.current && onBackToTopicsFeed) {
              onBackToTopicsFeed();
            } else {
              goToStage("topics");
            }
          }}
          onSelectDifferentTopic={() => {
            // If we came from the feed, go back to topics tab
            // Otherwise, go to topics stage
            if (cameFromFeed.current && onBackToTopicsFeed) {
              onBackToTopicsFeed();
            } else {
              selectDifferentTopic();
            }
          }}
          onDelete={() => {
            // After deleting outline, go back to topics
            if (cameFromFeed.current && onBackToTopicsFeed) {
              onBackToTopicsFeed();
            } else {
              goToStage("topics");
            }
          }}
        />
      )}

      {stage === "linking" && article && (
        <LinkReviewStage
          suggestions={linkSuggestions}
          originalContent={article.content}
          onApply={applyLinks}
          onSkip={skipLinking}
        />
      )}

      {stage === "content" && (
        <StreamingContentStage
          progress={streamingProgress}
          content={streamingContent}
          article={streamedArticle}
          error={streamingError}
          onCancel={() => {
            cancelStreaming();
            goToStage("outline");
          }}
        />
      )}
    </div>
  );
}

interface ConfigStageProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  onNext: () => void;
  userPreferences?: UserPreferences;
}

// Map article types to optimal target lengths based on content requirements
function getOptimalTargetLength(articleType: ArticleType): "short" | "medium" | "long" {
  const lengthMap: Record<ArticleType, "short" | "medium" | "long"> = {
    blog: "medium", // Default/Standard: 1,500 words
    technical: "long", // Deep Dive/Guide: 2,500+ words
    news: "short", // News/Update: 600 words
    opinion: "short", // Opinion/Editorial: 900 words
    tutorial: "long", // Deep Dive/Guide: 2,500+ words
    listicle: "long", // Listicle: 1,800 words
    affiliate: "medium", // Default/Standard: 1,500 words
    personal: "medium", // Personal experience/journey: ~1,500 words default
  };
  return lengthMap[articleType] || "medium";
}

const articleTypes = [
  { id: "blog", label: "Blog Post", desc: "Conversational, engaging" },
  {
    id: "technical",
    label: "Technical Article",
    desc: "In-depth, code examples",
  },
  { id: "news", label: "News Analysis", desc: "Factual, timely" },
  { id: "opinion", label: "Opinion Piece", desc: "Persuasive, clear stance" },
  { id: "tutorial", label: "Tutorial", desc: "Step-by-step guide" },
  {
    id: "listicle",
    label: "Listicle",
    desc: "Numbered list format, e.g., '11 AI Tools Every Founder Should Know'",
  },
  {
    id: "affiliate",
    label: "Affiliate Piece",
    desc: "Comparison and recommendation articles",
  },
  {
    id: "personal",
    label: "Personal Piece",
    desc: "First-person experience/journey with concrete takeaways",
  },
];

interface ArticleTypeSelectorProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  topicMode: "discover" | "direct" | "prompt";
  setTopicMode: (mode: "discover" | "direct" | "prompt") => void;
  activeTab: "prompt" | "keywords";
  directTopicQuery: string;
  customInstructions: string;
}

function ArticleTypeSelector({
  config,
  onChange,
  topicMode,
  setTopicMode,
  activeTab,
  directTopicQuery,
  customInstructions,
}: ArticleTypeSelectorProps) {
  const supportsDirectTopic = (type: ArticleType) =>
    type === "tutorial" || type === "affiliate" || type === "personal";
  const forceDirectOnly = (type: ArticleType) => type === "personal";

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Article Type</h2>
      <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4">
        Article length is automatically optimized based on the selected type
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {articleTypes.map((type) => {
          const optimalLength = getOptimalTargetLength(type.id as ArticleType);
          const lengthLabels = {
            short: "~600-900 words",
            medium: "~1,500 words",
            long: "~1,800-2,500+ words",
          };
          return (
            <button
              key={type.id}
              onClick={() => {
                const optimalLength = getOptimalTargetLength(
                  type.id as ArticleType
                );
                const nextArticleType = type.id as ArticleType;
                const nextMode = forceDirectOnly(nextArticleType)
                  ? "direct"
                  : topicMode;
                setTopicMode(nextMode);
                onChange({
                  ...config,
                  articleType: nextArticleType,
                  targetLength: optimalLength,
                  topicMode: supportsDirectTopic(nextArticleType)
                    ? nextMode
                    : activeTab === "prompt"
                    ? "prompt"
                    : "discover",
                  topicQuery:
                    supportsDirectTopic(nextArticleType) &&
                    nextMode === "direct"
                      ? directTopicQuery.trim()
                        ? directTopicQuery
                        : undefined
                      : undefined,
                  customInstructions: customInstructions.trim()
                    ? customInstructions
                    : undefined,
                });
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                config.articleType === type.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-sm"
                  : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-transparent hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm"
              }`}
            >
              <span className="font-medium block">{type.label}</span>
              <span className="text-sm text-slate-600 dark:text-zinc-400">
                {type.desc}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-500 mt-1 block">
                {lengthLabels[optimalLength]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface WordCountSelectorProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
}

function WordCountSelector({ config, onChange }: WordCountSelectorProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Word Count (Optional)</h2>
      <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4">
        Specify a custom word count, or leave empty to use the optimal word
        count for the selected article type.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            onChange({
              ...config,
              wordCount: undefined, // Clear custom word count to use optimal
            });
          }}
          className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
            !config.wordCount
              ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-slate-900 dark:text-white shadow-sm font-medium"
              : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600"
          }`}
        >
          Optimal (Default)
        </button>
        {[250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000].map(
          (count) => (
            <button
              key={count}
              onClick={() => {
                onChange({
                  ...config,
                  wordCount: count,
                });
              }}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                config.wordCount === count
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-slate-900 dark:text-white shadow-sm font-medium"
                  : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600"
              }`}
            >
              {count.toLocaleString()} words
            </button>
          )
        )}
      </div>
      {config.wordCount && (
        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          ✓ Custom word count: {config.wordCount.toLocaleString()} words will be
          used instead of the optimal length.
        </p>
      )}
    </div>
  );
}

function ConfigStage({ config, onChange, onNext, userPreferences }: ConfigStageProps) {
  // Initialize search terms from config keywords if they exist
  const getInitialSearchTerms = () => {
    return config.keywords && config.keywords.length > 0
      ? config.keywords.join(", ")
      : "";
  };

  // Tab state - default to "prompt" to feature it prominently
  const initialTab =
    config.topicMode === "prompt" && config.promptInput
      ? "prompt"
      : config.industry || config.keywords?.length
      ? "keywords"
      : "prompt";

  const [activeTab, setActiveTab] = useState<"prompt" | "keywords">(initialTab);

  const [searchTerms, setSearchTerms] = useState(getInitialSearchTerms);
  const [topicMode, setTopicMode] = useState<"discover" | "direct" | "prompt">(
    config.topicMode || (initialTab === "prompt" ? "prompt" : "discover")
  );
  const [directTopicQuery, setDirectTopicQuery] = useState(
    config.topicQuery || ""
  );
  const [promptInput, setPromptInput] = useState(config.promptInput || "");
  const [useSearchInPrompt, setUseSearchInPrompt] = useState(
    config.useSearchInPrompt || false
  );
  const [customInstructions, setCustomInstructions] = useState(
    config.customInstructions || ""
  );
  // Track excluded keywords per category (categoryId -> Set of excluded keywords)
  const [excludedKeywords, setExcludedKeywords] = useState<
    Record<string, Set<string>>
  >({});
  // Track which category card has expanded keywords view
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Build personalized categories from user preferences or use defaults
  const { categories, categoryKeywords } = useMemo(() => {
    if (userPreferences && userPreferences.primaryIndustry) {
      const industryConfig = INDUSTRIES[userPreferences.primaryIndustry];
      if (industryConfig && industryConfig.subcategories) {
        // Map subcategories to category format
        const personalizedCategories = industryConfig.subcategories.map((sub) => ({
          id: sub.id,
          label: sub.name,
          icon: "📌", // Default icon for subcategories
        }));

        // Map subcategory keywords
        const personalizedKeywords: Record<string, string[]> = {};
        industryConfig.subcategories.forEach((sub) => {
          personalizedKeywords[sub.id] = sub.keywords;
        });

        return {
          categories: personalizedCategories,
          categoryKeywords: personalizedKeywords,
        };
      }
    }

    // Fallback to default hardcoded industries
    const defaultCategories = [
      { id: "ai", label: "AI & Machine Learning", icon: "🤖" },
      { id: "tech", label: "Technology", icon: "💻" },
      { id: "health", label: "Health & Wellness", icon: "🏥" },
      { id: "finance", label: "Finance & Fintech", icon: "💰" },
      { id: "climate", label: "Climate & Sustainability", icon: "🌍" },
      { id: "crypto", label: "Crypto & Web3", icon: "⛓️" },
    ];

    const defaultKeywords: Record<string, string[]> = {
      ai: [
        "artificial intelligence",
        "machine learning",
        "deep learning",
        "LLM",
        "GPT",
        "neural network",
        "AI agents",
        "generative AI",
        "transformer models",
        "computer vision",
      ],
      tech: [
        "technology",
        "software",
        "startup",
        "SaaS",
        "cloud computing",
        "cybersecurity",
        "devops",
        "programming",
        "open source",
        "tech industry",
      ],
      health: [
        "healthcare",
        "medical",
        "wellness",
        "biotech",
        "digital health",
        "telemedicine",
        "mental health",
        "pharmaceutical",
        "clinical trials",
        "health tech",
      ],
      finance: [
        "fintech",
        "banking",
        "investment",
        "cryptocurrency",
        "stock market",
        "venture capital",
        "financial services",
        "payments",
        "insurance tech",
        "trading",
      ],
      climate: [
        "climate change",
        "sustainability",
        "renewable energy",
        "clean tech",
        "carbon footprint",
        "ESG",
        "green technology",
        "electric vehicles",
        "solar energy",
        "climate tech",
      ],
      crypto: [
        "cryptocurrency",
        "blockchain",
        "web3",
        "DeFi",
        "NFT",
        "Bitcoin",
        "Ethereum",
        "smart contracts",
        "decentralized",
        "crypto regulation",
      ],
    };

    return {
      categories: defaultCategories,
      categoryKeywords: defaultKeywords,
    };
  }, [userPreferences]);

  const supportsDirectTopic = (type: ArticleType) =>
    type === "tutorial" || type === "affiliate" || type === "personal";
  const forceDirectOnly = (type: ArticleType) => type === "personal";

  const handleTopicModeChange = (mode: "discover" | "direct" | "prompt") => {
    setTopicMode(mode);

    if (mode === "discover") {
      setActiveTab("keywords");
      setDirectTopicQuery("");
      setPromptInput("");
      onChange({
        ...config,
        topicMode: "discover",
        topicQuery: undefined,
        promptInput: undefined,
        useSearchInPrompt: false,
        customInstructions: customInstructions.trim()
          ? customInstructions
          : undefined,
      });
    } else if (mode === "direct") {
      setPromptInput("");
      onChange({
        ...config,
        topicMode: "direct",
        topicQuery: directTopicQuery.trim() ? directTopicQuery : undefined,
        promptInput: undefined,
        useSearchInPrompt: false,
        customInstructions: customInstructions.trim()
          ? customInstructions
          : undefined,
      });
    } else {
      // prompt mode
      setActiveTab("prompt");
      setDirectTopicQuery("");
      onChange({
        ...config,
        topicMode: "prompt",
        topicQuery: undefined,
        promptInput: promptInput.trim() ? promptInput : undefined,
        useSearchInPrompt: useSearchInPrompt,
        customInstructions: customInstructions.trim()
          ? customInstructions
          : undefined,
      });
    }
  };

  const handlePromptInputChange = (value: string) => {
    setPromptInput(value);
    setTopicMode("prompt");
    setActiveTab("prompt"); // Ensure we're on the prompt tab
    onChange({
      ...config,
      topicMode: "prompt",
      promptInput: value.trim() ? value : undefined,
      useSearchInPrompt: useSearchInPrompt,
    });
  };

  const handleUseSearchInPromptChange = (checked: boolean) => {
    setUseSearchInPrompt(checked);
    onChange({
      ...config,
      topicMode: "prompt",
      promptInput: promptInput.trim() ? promptInput : undefined,
      useSearchInPrompt: checked,
    });
  };

  const handleDirectTopicQueryChange = (value: string) => {
    setDirectTopicQuery(value);
    setTopicMode("direct");
    onChange({
      ...config,
      topicMode: "direct",
      topicQuery: value.trim() ? value : undefined,
      customInstructions: customInstructions.trim()
        ? customInstructions
        : undefined,
    });
  };

  const handleCustomInstructionsChange = (value: string) => {
    setCustomInstructions(value);
    onChange({
      ...config,
      topicMode: forceDirectOnly(config.articleType) ? "direct" : topicMode,
      topicQuery: directTopicQuery.trim() ? directTopicQuery : undefined,
      customInstructions: value.trim() ? value : undefined,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerms(value);
    setActiveTab("keywords"); // Ensure we're on the keywords tab
    // Parse comma-separated keywords
    const keywords = value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    onChange({
      ...config,
      keywords: keywords.length > 0 ? keywords : undefined,
      // Clear industry when user starts typing keywords to switch back to keywords mode
      industry: keywords.length > 0 ? "" : config.industry,
      topicMode: "discover",
      topicQuery: undefined,
    });
  };

  const handleIndustrySelect = (industryId: string) => {
    setActiveTab("keywords"); // Ensure we're on the keywords tab
    const isCurrentlySelected = config.industry === industryId;
    const hasExcludedForThisIndustry = excludedKeywords[industryId]?.size > 0;

    // If clicking on the same industry (selected or has excluded keywords), toggle it off
    if (isCurrentlySelected || hasExcludedForThisIndustry) {
      onChange({
        ...config,
        industry: "",
        keywords: undefined,
        topicMode: "discover",
        topicQuery: undefined,
      });
      setSearchTerms("");
      // Clear excluded keywords for this industry
      setExcludedKeywords((prev) => {
        const newExcluded = { ...prev };
        delete newExcluded[industryId];
        return newExcluded;
      });
      setExpandedCategory(null);
    } else {
      // Select new industry
      onChange({
        ...config,
        industry: industryId,
        keywords: undefined,
        topicMode: "discover",
        topicQuery: undefined,
      });
      setSearchTerms("");
      // Clear excluded keywords when selecting a different industry
      if (config.industry && config.industry !== industryId) {
        setExcludedKeywords({});
      }
      setExpandedCategory(null);
    }
  };

  const handleExcludeKeyword = (
    industryId: string,
    keyword: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering the button click

    const currentExcluded = excludedKeywords[industryId] || new Set();
    const isCurrentlyExcluded = currentExcluded.has(keyword);

    // Toggle exclusion: if excluded, re-include it; otherwise exclude it
    const updatedExcluded = new Set(currentExcluded);
    if (isCurrentlyExcluded) {
      updatedExcluded.delete(keyword);
    } else {
      updatedExcluded.add(keyword);
    }

    setExcludedKeywords((prev) => {
      const newExcluded = { ...prev };
      if (updatedExcluded.size > 0) {
        newExcluded[industryId] = updatedExcluded;
      } else {
        delete newExcluded[industryId];
      }
      return newExcluded;
    });

    // Get all keywords for this category, filter out excluded ones
    const allKeywords = categoryKeywords[industryId] || [];
    const filteredKeywords = allKeywords.filter((k: string) => !updatedExcluded.has(k));

    if (updatedExcluded.size === 0) {
      // No exclusions, go back to industry mode
      onChange({
        ...config,
        industry: industryId,
        keywords: undefined,
      });
      setSearchTerms("");
    } else {
      // Switch to keywords-only mode with filtered list (don't pass industry to avoid merging)
      onChange({
        ...config,
        industry: "", // Clear industry to use only filtered keywords
        keywords: filteredKeywords.length > 0 ? filteredKeywords : undefined,
      });
      // Update search terms input to show what will actually be used
      setSearchTerms(filteredKeywords.join(", "));
    }
  };

  const handleToggleExpandKeywords = (
    industryId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering the button click
    setExpandedCategory((prev: string | null) => (prev === industryId ? null : industryId));
  };

  const hasSelection =
    (config.industry && config.industry !== "") ||
    (config.keywords && config.keywords.length > 0) ||
    (config.topicMode === "direct" &&
      ((config.articleType === "personal" && !!customInstructions.trim()) ||
        !!directTopicQuery.trim())) ||
    (config.topicMode === "prompt" &&
      !!promptInput.trim() &&
      promptInput.trim().length >= 10);

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-zinc-800">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setActiveTab("prompt");
              // Only change topicMode if not in direct mode (direct mode is independent of tabs)
              if (activeTab !== "prompt" && topicMode !== "direct") {
                setTopicMode("prompt");
                onChange({
                  ...config,
                  topicMode: "prompt",
                  promptInput: promptInput.trim() ? promptInput : undefined,
                  useSearchInPrompt: useSearchInPrompt,
                });
              }
            }}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "prompt"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            ✨ Prompt
          </button>
          <button
            onClick={() => {
              setActiveTab("keywords");
              // Only change topicMode if not in direct mode (direct mode is independent of tabs)
              if (activeTab !== "keywords" && topicMode !== "direct") {
                setTopicMode("discover");
                onChange({
                  ...config,
                  topicMode: "discover",
                  promptInput: undefined,
                  useSearchInPrompt: false,
                });
              }
            }}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "keywords"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            🔍 Keywords & Categories
          </button>
        </div>
      </div>

      {/* Prompt Tab Content */}
      {activeTab === "prompt" && (
        <div className="space-y-8">
          {/* Prominent Prompt Input */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
              What do you want to write about?
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4">
              Describe your article idea in your own words. Be as detailed as
              you want—the AI will generate topic options based on your
              description.
            </p>
            <div className="relative">
              <textarea
                value={promptInput}
                onChange={(e) => handlePromptInputChange(e.target.value)}
                placeholder="Example: I want to write about how small teams can implement AI without breaking the bank, focusing on practical tools and real ROI examples. I'd like to cover both free and paid options, with case studies from startups."
                className="w-full px-5 py-4 bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 rounded-xl text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                rows={6}
              />
              <div className="absolute bottom-4 right-4 text-xs text-slate-400 dark:text-zinc-500">
                {promptInput.length} characters
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="useSearchInPrompt"
                  checked={useSearchInPrompt}
                  onChange={(e) =>
                    handleUseSearchInPromptChange(e.target.checked)
                  }
                  className="mt-0.5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <label
                    htmlFor="useSearchInPrompt"
                    className="text-sm font-medium text-slate-900 dark:text-white cursor-pointer block"
                  >
                    Include web search for sources
                  </label>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                    The AI will research current trends and find supporting
                    sources. This adds research time but provides more
                    up-to-date information.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
              💡 The AI will generate 5-10 title options with explanations of
              why each would make a strong article.
            </p>
          </div>

          <ArticleTypeSelector
            config={config}
            onChange={onChange}
            topicMode={topicMode}
            setTopicMode={setTopicMode}
            activeTab={activeTab}
            directTopicQuery={directTopicQuery}
            customInstructions={customInstructions}
          />
          <WordCountSelector config={config} onChange={onChange} />
        </div>
      )}

      {/* Keywords & Categories Tab Content */}
      {activeTab === "keywords" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">Search Topics</h2>
            <div className="mb-4">
              <input
                type="text"
                value={searchTerms}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Enter keywords (comma-separated), e.g., AI, machine learning, neural networks"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                Enter specific keywords to search for topics, or select an
                industry category below
              </p>
            </div>

            <div className="mt-6">
              <h3 className="text-md font-medium mb-3 text-slate-700 dark:text-zinc-300">
                Or Select Industry Category
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((ind) => {
                  const isSelected = config.industry === ind.id;
                  const allKeywords = categoryKeywords[ind.id] || [];
                  const excluded = excludedKeywords[ind.id] || new Set();
                  const hasExcluded = excluded.size > 0;
                  // Show as selected if category is selected OR if it has excluded keywords (user modified this category)
                  const showAsSelected = isSelected || hasExcluded;
                  const isExpanded = expandedCategory === ind.id;

                  // Show all keywords if expanded, otherwise show first 6 visible ones
                  const keywordsToShow = isExpanded
                    ? allKeywords
                    : allKeywords.slice(0, 6);
                  const remainingCount = isExpanded
                    ? 0
                    : Math.max(0, allKeywords.length - 6);

                  return (
                    <button
                      key={ind.id}
                      onClick={() => handleIndustrySelect(ind.id)}
                      className={`p-4 rounded-xl border text-left transition-all w-full ${
                        showAsSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-sm"
                          : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-transparent hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm"
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{ind.icon}</span>
                      <span className="font-medium block mb-2">
                        {ind.label}
                      </span>
                      {showAsSelected && allKeywords.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-700/50">
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2 font-medium">
                            Keywords used:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {keywordsToShow.map((keyword: string) => {
                              const isExcluded = excluded.has(keyword);
                              return (
                                <span
                                  key={keyword}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border ${
                                    isExcluded
                                      ? "bg-slate-100 dark:bg-zinc-900/40 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-700/30 line-through"
                                      : "bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700/50"
                                  }`}
                                >
                                  <span>{keyword}</span>
                                  <button
                                    onClick={(e) =>
                                      handleExcludeKeyword(ind.id, keyword, e)
                                    }
                                    className="ml-0.5 hover:text-red-400 transition-colors"
                                    aria-label={`Remove ${keyword}`}
                                  >
                                    <svg
                                      className="w-3 h-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </span>
                              );
                            })}
                            {!isExpanded && remainingCount > 0 && (
                              <button
                                onClick={(e) =>
                                  handleToggleExpandKeywords(ind.id, e)
                                }
                                className="inline-block px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 italic underline transition-colors"
                              >
                                +{remainingCount} more
                              </button>
                            )}
                            {isExpanded && allKeywords.length > 6 && (
                              <button
                                onClick={(e) =>
                                  handleToggleExpandKeywords(ind.id, e)
                                }
                                className="inline-block px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 italic underline transition-colors"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <ArticleTypeSelector
            config={config}
            onChange={onChange}
            topicMode={topicMode}
            setTopicMode={setTopicMode}
            activeTab={activeTab}
            directTopicQuery={directTopicQuery}
            customInstructions={customInstructions}
          />
          <WordCountSelector config={config} onChange={onChange} />
        </div>
      )}

      {/* Direct Mode Inputs for Tutorial/Affiliate/Personal - Show in both tabs if applicable */}
      {supportsDirectTopic(config.articleType) && (
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50 dark:bg-zinc-900/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-md font-medium text-slate-900 dark:text-zinc-100">
                {config.articleType === "personal"
                  ? "Your personal piece"
                  : "Topic input"}
              </h3>
              <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
                {config.articleType === "personal"
                  ? "Tell the model what happened and what you discovered. We'll still research supporting context."
                  : "Either discover via search, or specify exactly what you want."}
              </p>
            </div>
          </div>

          {!forceDirectOnly(config.articleType) && (
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  handleTopicModeChange("discover");
                  setActiveTab("keywords");
                }}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  topicMode === "discover"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-slate-900 dark:text-white shadow-sm"
                    : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600"
                }`}
              >
                Search / Discover
              </button>
              <button
                type="button"
                onClick={() => handleTopicModeChange("direct")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  topicMode === "direct"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-slate-900 dark:text-white shadow-sm"
                    : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600"
                }`}
              >
                I know what I want
              </button>
            </div>
          )}

          {(forceDirectOnly(config.articleType) || topicMode === "direct") && (
            <div className="mt-4 space-y-3">
              {config.articleType !== "personal" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-2">
                    {config.articleType === "tutorial"
                      ? "Tutorial topic"
                      : "Product(s) / app(s)"}
                  </label>
                  <input
                    type="text"
                    value={directTopicQuery}
                    onChange={(e) =>
                      handleDirectTopicQueryChange(e.target.value)
                    }
                    placeholder={
                      config.articleType === "tutorial"
                        ? "e.g., Integrating MCP servers with agents properly"
                        : "e.g., Claude Code, Cursor (comma-separate for comparisons)"
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                    {config.articleType === "affiliate"
                      ? "Comma-separated = comparison. We'll research each product and write a killer buyer's guide."
                      : "We'll research sources for this topic and write a step-by-step guide."}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-2">
                  {config.articleType === "personal"
                    ? "Your story / experience (required)"
                    : "Extra context (optional)"}
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) =>
                    handleCustomInstructionsChange(e.target.value)
                  }
                  rows={config.articleType === "personal" ? 6 : 4}
                  placeholder={
                    config.articleType === "personal"
                      ? "What did you try? Setup/context. What surprised you. What worked/didn't. The exact workflow/steps you discovered. Concrete results and takeaways."
                      : config.articleType === "affiliate"
                      ? "Audience, budget, evaluation criteria, deal-breakers, your recommended winner, and any required sections."
                      : "Reader level, prerequisites, tools, constraints, and desired outcome."
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onNext()}
        disabled={!hasSelection}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        🔍 Find Topics →
      </button>
    </div>
  );
}