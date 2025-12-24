"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Zap, TrendingUp, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Animated demo visualization component
function DemoVisualization() {
  const [activeAgent, setActiveAgent] = useState(0);
  const [progress, setProgress] = useState([0, 0, 0]);
  const [contentLines, setContentLines] = useState<string[]>([]);

  const agents = [
    {
      title: "Research Agent",
      icon: "🔍",
      task: "Analyzing trending topics in AI industry...",
      result: "Found 5 high-potential topics"
    },
    {
      title: "Outline Agent",
      icon: "📝",
      task: "Structuring article with SEO optimization...",
      result: "Created 8-section outline"
    },
    {
      title: "Writer Agent",
      icon: "✨",
      task: "Generating engaging content...",
      result: "Writing in progress..."
    },
  ];

  const contentPreview = [
    "# The Future of AI Agents in Content Creation",
    "",
    "Artificial intelligence has revolutionized...",
    "Multi-agent systems are transforming...",
    "According to recent research...",
  ];

  useEffect(() => {
    // Cycle through agents
    const agentTimer = setInterval(() => {
      setActiveAgent((prev) => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(agentTimer);
  }, []);

  useEffect(() => {
    // Animate progress bars
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = [...prev];
        if (newProgress[activeAgent] < 100) {
          newProgress[activeAgent] = Math.min(100, newProgress[activeAgent] + 2);
        }
        // Keep completed agents at 100
        if (activeAgent > 0) newProgress[0] = 100;
        if (activeAgent > 1) newProgress[1] = 100;
        return newProgress;
      });
    }, 30);

    return () => clearInterval(progressTimer);
  }, [activeAgent]);

  useEffect(() => {
    // Typing animation for content preview (only for writer agent)
    if (activeAgent === 2 && progress[2] > 20) {
      const lineTimer = setInterval(() => {
        setContentLines((prev) => {
          if (prev.length < contentPreview.length) {
            return [...prev, contentPreview[prev.length]];
          }
          return prev;
        });
      }, 600);

      return () => clearInterval(lineTimer);
    } else {
      setContentLines([]);
    }
  }, [activeAgent, progress]);

  return (
    <div className="mt-20 relative">
      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent z-10" />
      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-2xl shadow-blue-500/10">
        {/* Window chrome */}
        <div className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center text-sm text-slate-600 dark:text-zinc-500">
            Agent Article Writer - Live Demo
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-8">
          {/* Agent cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {agents.map((agent, i) => (
              <div
                key={i}
                className={`relative bg-slate-50 dark:bg-zinc-900 border rounded-lg p-4 space-y-3 transition-all duration-300 ${
                  activeAgent === i
                    ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-105"
                    : "border-slate-200 dark:border-zinc-800"
                }`}
              >
                {/* Agent header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{agent.icon}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                      {agent.title}
                    </span>
                  </div>
                  {progress[i] === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : activeAgent === i ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-zinc-700" />
                  )}
                </div>

                {/* Status */}
                <div className="text-xs text-slate-600 dark:text-zinc-400 min-h-[2.5rem]">
                  {activeAgent === i ? agent.task : progress[i] === 100 ? agent.result : "Waiting..."}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progress[i] === 100 ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${progress[i]}%` }}
                  />
                </div>

                {/* Progress percentage */}
                <div className="text-right text-xs text-slate-500 dark:text-zinc-500">
                  {Math.round(progress[i])}%
                </div>
              </div>
            ))}
          </div>

          {/* Content preview (shown when Writer is active) */}
          {activeAgent === 2 && contentLines.length > 0 && (
            <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                  Generated Content Preview
                </span>
              </div>
              <div className="font-mono text-xs text-slate-700 dark:text-zinc-300 space-y-1">
                {contentLines.map((line, i) => (
                  <div
                    key={i}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {line || <br />}
                  </div>
                ))}
                <div className="inline-block w-2 h-4 bg-blue-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-zinc-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 pt-20 pb-32">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Create Viral Articles
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              10x Faster with AI
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
            From trending topics to published articles in minutes. Our AI agents
            research, outline, and write SEO-optimized content while you focus
            on strategy.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 pt-4">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold">10x</span>
              <span className="text-zinc-500 dark:text-zinc-500">Faster</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="font-semibold">AI-Powered</span>
              <span className="text-zinc-500 dark:text-zinc-500">Research</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="font-semibold">SEO</span>
              <span className="text-zinc-500 dark:text-zinc-500">
                Optimized
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/#pricing"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              Start Writing for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-semibold transition-all border border-zinc-300 dark:border-zinc-700"
            >
              See How It Works
            </Link>
          </div>

          {/* Trust indicators */}
          <p className="text-sm text-zinc-500 dark:text-zinc-500 pt-4">
            14-day free trial • Credit card required • Cancel anytime
          </p>
        </div>

        {/* Demo visualization */}
        <DemoVisualization />
      </div>
    </section>
  );
}
