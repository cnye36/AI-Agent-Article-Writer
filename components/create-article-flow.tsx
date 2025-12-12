"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useArticleGeneration } from "@/hooks/use-article-generation";
import { useStreamingWriter } from "@/hooks/use-streaming-writer";
import type { ArticleType, GenerationConfig, Topic } from "@/types";
import { TopicsStage } from "./topics-stage";
import { OutlineStage } from "./outline-stage";
import { ContentStage } from "./content-stage";
import { StreamingContentStage } from "./streaming-content-stage";
import { LoadingDialog } from "./loading-dialog";

type Stage = "config" | "topics" | "outline" | "content";

function getStageIndex(stage: Stage): number {
  const stages: Stage[] = ["config", "topics", "outline", "content"];
  return stages.indexOf(stage);
}

interface CreateArticleFlowProps {
  initialTopic?: Topic | null;
  onTopicProcessed?: () => void;
  onBackToTopicsFeed?: () => void;
}

export function CreateArticleFlow({
  initialTopic,
  onTopicProcessed,
  onBackToTopicsFeed,
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
    article,
    isLoading,
    goToStage,
    error,
  } = useArticleGeneration();

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
    isStreaming: !!streamingProgress || !!streamingContent.hook || streamingContent.sections.length > 0,
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
                  ? "bg-blue-600"
                  : getStageIndex(stage) > i
                  ? "bg-green-600 hover:bg-green-500 cursor-pointer"
                  : "bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
              }`}
            >
              {getStageIndex(stage) > i ? "✓" : i + 1}
            </button>
            {i < 3 && (
              <div className="w-8 sm:w-16 h-0.5 bg-zinc-800 mx-1 sm:mx-2" />
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
        />
      )}

      {stage === "topics" && (
        <TopicsStage
          topics={topics}
          isLoading={isLoading}
          researchMetadata={researchMetadata}
          onSelect={(topic) => {
            console.log("TopicsStage onSelect called with:", topic);
            selectTopic(topic);
          }}
          onBack={() => goToStage("config")}
        />
      )}

      {stage === "outline" && (
        <OutlineStage
          outline={outline}
          isLoading={isLoading}
          onApprove={async () => {
            if (useStreaming && outline) {
              console.log("[CreateArticleFlow] Starting streaming mode for outline:", outline.id);
              // Show loading dialog briefly while initializing
              setIsStartingWriting(true);
              try {
                // Change stage to content to show streaming UI
                console.log("[CreateArticleFlow] Changing stage to content");
                goToStage("content");
                console.log("[CreateArticleFlow] Stage changed, starting stream");
                // Start streaming - the hook will handle navigation when article is ready
                await startStreaming(outline.id);
                console.log("[CreateArticleFlow] Streaming completed");
              } catch (error) {
                console.error("[CreateArticleFlow] Error starting streaming:", error);
                setIsStartingWriting(false);
                // Go back to outline on error
                goToStage("outline");
              }
            } else {
              // Fall back to traditional non-streaming mode
              approveOutline();
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
        />
      )}

      {stage === "content" && (
        <>
          {useStreaming && !streamedArticle ? (
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
          ) : (
            <ContentStage
              article={streamedArticle || article}
              isLoading={isLoading}
              onBack={() => goToStage("outline")}
            />
          )}
        </>
      )}
    </div>
  );
}

interface ConfigStageProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  onNext: () => void;
}

function ConfigStage({ config, onChange, onNext }: ConfigStageProps) {
  // Initialize search terms from config keywords if they exist
  const getInitialSearchTerms = () => {
    return config.keywords && config.keywords.length > 0 
      ? config.keywords.join(", ") 
      : "";
  };
  
  const [searchTerms, setSearchTerms] = useState(getInitialSearchTerms);

  const industries = [
    { id: "ai", label: "AI & Machine Learning", icon: "🤖" },
    { id: "tech", label: "Technology", icon: "💻" },
    { id: "health", label: "Health & Wellness", icon: "🏥" },
    { id: "finance", label: "Finance & Fintech", icon: "💰" },
    { id: "climate", label: "Climate & Sustainability", icon: "🌍" },
    { id: "crypto", label: "Crypto & Web3", icon: "⛓️" },
  ];

  const articleTypes = [
    { id: "blog", label: "Blog Post", desc: "Conversational, engaging" },
    { id: "technical", label: "Technical Article", desc: "In-depth, code examples" },
    { id: "news", label: "News Analysis", desc: "Factual, timely" },
    { id: "opinion", label: "Opinion Piece", desc: "Persuasive, clear stance" },
    { id: "tutorial", label: "Tutorial", desc: "Step-by-step guide" },
  ];

  const handleSearchChange = (value: string) => {
    setSearchTerms(value);
    // Parse comma-separated keywords
    const keywords = value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    
    onChange({
      ...config,
      keywords: keywords.length > 0 ? keywords : undefined,
    });
  };

  const handleIndustrySelect = (industryId: string) => {
    onChange({ ...config, industry: industryId });
  };

  const hasSelection = config.industry || (config.keywords && config.keywords.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Search Topics</h2>
        <div className="mb-4">
          <input
            type="text"
            value={searchTerms}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Enter keywords (comma-separated), e.g., AI, machine learning, neural networks"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-2 text-sm text-zinc-400">
            Enter specific keywords to search for topics, or select an industry category below
          </p>
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-medium mb-3 text-zinc-300">Or Select Industry Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {industries.map((ind) => (
              <button
                key={ind.id}
                onClick={() => handleIndustrySelect(ind.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  config.industry === ind.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <span className="text-2xl mb-2 block">{ind.icon}</span>
                <span className="font-medium">{ind.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Article Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {articleTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onChange({ ...config, articleType: type.id as ArticleType })}
              className={`p-4 rounded-xl border text-left transition-all ${
                config.articleType === type.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <span className="font-medium block">{type.label}</span>
              <span className="text-sm text-zinc-400">{type.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Length</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          {[
            { id: "short", label: "Short", words: "~500 words" },
            { id: "medium", label: "Medium", words: "~1000 words" },
            { id: "long", label: "Long", words: "~2000+ words" },
          ].map((len) => (
            <button
              key={len.id}
              onClick={() => onChange({ ...config, targetLength: len.id as "short" | "medium" | "long" })}
              className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                config.targetLength === len.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <span className="font-medium block">{len.label}</span>
              <span className="text-sm text-zinc-400">{len.words}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!hasSelection}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Find Topics →
      </button>
    </div>
  );
}