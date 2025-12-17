"use client";

import { Search, FileText, PenTool, Rocket, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Discover Topics",
    description:
      "Choose your industry and let our AI research agent discover trending topics with real-time web search. Get viral topic ideas backed by sources and relevance scores.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: FileText,
    title: "Generate Outline",
    description:
      "Select a topic and our outline agent creates a comprehensive structure with hooks, key points, SEO keywords, and internal linking suggestions.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    icon: PenTool,
    title: "Write & Edit",
    description:
      "Watch as our writer agent creates your article in real-time. Use AI-powered editing tools to refine, expand, or rewrite sections. Generate contextual images on demand.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Publish Anywhere",
    description:
      "Export your SEO-optimized content to any platform. Publish to multiple sites with custom frontmatter, or download as Markdown, PDF, or TXT.",
    gradient: "from-green-500 to-emerald-500",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
            <Rocket className="w-4 h-4" />
            Simple Process
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            From Idea to Published
            <br />
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              In 4 Simple Steps
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-zinc-400">
            Our AI-powered workflow takes you from topic discovery to publication
            in minutes, not hours.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
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
                      <span className="text-6xl font-bold text-zinc-800">
                        {step.number}
                      </span>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {step.title}
                        </h3>
                        <p className="text-zinc-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Visual */}
                  <div className="flex-1 relative">
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-all group">
                      {/* Icon with gradient */}
                      <div className="relative">
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-20 blur-2xl`}
                        />
                        <div
                          className={`relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${step.gradient} p-[2px] group-hover:scale-110 transition-transform`}
                        >
                          <div className="w-full h-full bg-zinc-900 rounded-2xl flex items-center justify-center">
                            <Icon className="w-10 h-10 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Decorative elements */}
                      <div className="mt-8 space-y-3">
                        <div className="h-2 bg-zinc-800 rounded-full w-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${step.gradient} rounded-full`}
                            style={{ width: `${100 - i * 10}%` }}
                          />
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full w-3/4 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${step.gradient} rounded-full`}
                            style={{ width: `${80 - i * 10}%` }}
                          />
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full w-1/2 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${step.gradient} rounded-full`}
                            style={{ width: `${60 - i * 10}%` }}
                          />
                        </div>
                      </div>

                      {/* Hover gradient overlay */}
                      <div
                        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}
                      />
                    </div>

                    {/* Arrow connector */}
                    {i < steps.length - 1 && (
                      <div className="hidden lg:flex absolute -bottom-8 left-1/2 transform -translate-x-1/2 items-center justify-center">
                        <ArrowRight className="w-6 h-6 text-zinc-700" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
