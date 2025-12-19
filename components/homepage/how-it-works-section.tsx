"use client";

import {
  Search,
  FileText,
  PenTool,
  Rocket,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Discover Topics",
    description:
      "Choose your industry and let our AI research agent discover trending topics with real-time web search. Get viral topic ideas backed by sources and relevance scores.",
    gradient: "from-blue-500 to-cyan-500",
    progressLabels: [
      "Searching web",
      "Finding relevant topics",
      "Analyzing sources",
    ],
  },
  {
    number: "02",
    icon: FileText,
    title: "Generate Outline",
    description:
      "Select a topic and our outline agent creates a comprehensive structure with hooks, key points, SEO keywords, and internal linking suggestions.",
    gradient: "from-purple-500 to-pink-500",
    progressLabels: [
      "Analyzing topic",
      "Organizing sources",
      "Writing outline",
    ],
  },
  {
    number: "03",
    icon: PenTool,
    title: "Write & Edit",
    description:
      "Watch as our writer agent creates your article in real-time. Use AI-powered editing tools to refine, expand, or rewrite sections. Generate contextual images on demand.",
    gradient: "from-orange-500 to-red-500",
    progressLabels: [
      "Analyzing outline",
      "Preparing to write",
      "Writing article",
    ],
  },
  {
    number: "04",
    icon: Rocket,
    title: "Publish Anywhere",
    description:
      "Export your SEO-optimized content to any platform. Publish to multiple sites with custom frontmatter, or download as Markdown, PDF, or TXT.",
    gradient: "from-green-500 to-emerald-500",
    progressLabels: ["Optimizing article", "Preparing to publish", "Published"],
  },
];

// Animated step visual component
function StepVisual({ step }: { step: (typeof steps)[0] }) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = step.icon;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [isVisible]);

  return (
    <div
      ref={ref}
      className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-8 hover:border-slate-300 dark:hover:border-zinc-700 transition-all group hover:shadow-xl"
    >
      {/* Icon with gradient glow */}
      <div className="relative mb-6">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            step.gradient
          } opacity-20 blur-3xl transition-opacity ${
            isVisible ? "opacity-30" : "opacity-20"
          }`}
        />
        <div
          className={`relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${step.gradient} p-[2px] group-hover:scale-110 transition-all duration-300`}
          style={{
            transform: isVisible ? "scale(1)" : "scale(0.8)",
            opacity: isVisible ? 1 : 0,
          }}
        >
          <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center">
            <Icon className="w-10 h-10 text-slate-700 dark:text-white" />
          </div>
        </div>

        {/* Animated checkmark when complete */}
        {progress === 100 && (
          <div className="absolute -top-2 -right-2">
            <div
              className={`bg-gradient-to-br ${step.gradient} rounded-full p-1 animate-bounce`}
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Mock interface elements */}
      <div className="space-y-3">
        {/* Animated progress bars */}
        {[100, 75, 50].map((width, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-600">
                {step.progressLabels[i]}
              </span>
              <span className="text-slate-600 dark:text-zinc-500 font-mono">
                {Math.min(progress, width)}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${step.gradient} rounded-full transition-all duration-1000 ease-out`}
                style={{
                  width: `${Math.min(progress, width)}%`,
                  boxShadow: isVisible
                    ? `0 0 10px rgba(59, 130, 246, 0.5)`
                    : "none",
                }}
              />
            </div>
          </div>
        ))}

        {/* Status indicators */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp
              className={`w-3 h-3 ${
                progress > 30
                  ? "text-green-500"
                  : "text-slate-400 dark:text-zinc-600"
              } transition-colors`}
            />
            <span className="text-slate-600 dark:text-zinc-400">
              Quality: High
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                progress > 50
                  ? "bg-green-500 animate-pulse"
                  : "bg-slate-300 dark:bg-zinc-700"
              } transition-colors`}
            />
            <span className="text-slate-600 dark:text-zinc-400">
              Status: Active
            </span>
          </div>
        </div>
      </div>

      {/* Hover gradient overlay */}
      <div
        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}
      />

      {/* Animated particles */}
      {isVisible && progress > 20 && (
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 bg-gradient-to-r ${step.gradient} rounded-full animate-float`}
              style={{
                left: `${20 + i * 30}%`,
                top: `${30 + i * 20}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: "3s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-white via-zinc-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
            <Rocket className="w-4 h-4" />
            Simple Process
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white">
            From Idea to Published
            <br />
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              In 4 Simple Steps
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
            Our AI-powered workflow takes you from topic discovery to
            publication in minutes, not hours.
          </p>
        </div>

        {/* Steps */}
        <section className="space-y-12">
          {steps.map((step, i) => {
            const isEven = i % 2 === 0;

            return (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute left-1/2 top-full h-12 w-px bg-gradient-to-b from-zinc-700 to-transparent transform -translate-x-1/2" />
                )}

                <div
                  className={`flex flex-col ${
                    isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                  } gap-8 items-center`}
                >
                  {/* Content */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-6xl font-bold text-slate-300 dark:text-zinc-800">
                        {step.number}
                      </span>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                          {step.title}
                        </h3>
                        <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Visual */}
                  <div className="flex-1 relative">
                    <StepVisual step={step} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </section>
    </section>
  );
}
