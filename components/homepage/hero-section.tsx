"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Zap, TrendingUp } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pt-20 pb-32">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Powered Content Creation Platform
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            Create Viral Articles
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              10x Faster with AI
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-xl text-zinc-400 leading-relaxed">
            From trending topics to published articles in minutes. Our AI agents research, outline, and write SEO-optimized content while you focus on strategy.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 pt-4">
            <div className="flex items-center gap-2 text-zinc-300">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold">10x</span>
              <span className="text-zinc-500">Faster</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="font-semibold">AI-Powered</span>
              <span className="text-zinc-500">Research</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="font-semibold">SEO</span>
              <span className="text-zinc-500">Optimized</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/auth/signup"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              Start Writing for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-all border border-zinc-700"
            >
              See How It Works
            </Link>
          </div>

          {/* Trust indicators */}
          <p className="text-sm text-zinc-500 pt-4">
            No credit card required • Free trial • Cancel anytime
          </p>
        </div>

        {/* Demo visualization */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />
          <div className="relative rounded-xl overflow-hidden border border-zinc-800 shadow-2xl shadow-blue-500/10">
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 text-center text-sm text-zinc-500">
                Agent Article Writer
              </div>
            </div>
            <div className="bg-zinc-950 p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "Research Agent", status: "Complete", time: "2.3s" },
                  { title: "Outline Agent", status: "Complete", time: "1.8s" },
                  { title: "Writer Agent", status: "Writing...", time: "Live" },
                ].map((agent, i) => (
                  <div
                    key={i}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-300">
                        {agent.title}
                      </span>
                      <span className="text-xs text-zinc-500">{agent.time}</span>
                    </div>
                    <div className="text-xs text-blue-400 font-medium">
                      {agent.status}
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-blue-500 ${
                          i === 2 ? "w-3/4 animate-pulse" : "w-full"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
