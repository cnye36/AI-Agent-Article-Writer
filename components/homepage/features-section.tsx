"use client";

import {
  Brain,
  FileSearch,
  FileEdit,
  ImagePlus,
  History,
  Link2,
  Zap,
  TrendingUp,
  Target,
  Sparkles,
  Globe,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Multi-Agent System",
    description:
      "Three specialized AI agents work together - Research discovers trends, Outline structures content, Writer creates engaging articles.",
    color: "blue",
  },
  {
    icon: FileSearch,
    title: "Trending Topic Discovery",
    description:
      "Automatically research and discover viral topics in AI, Tech, Health, Finance, Climate, and Crypto industries with real-time data.",
    color: "purple",
  },
  {
    icon: FileEdit,
    title: "Smart Content Editor",
    description:
      "Rich text editor with AI-powered rewriting, expanding, simplifying, and tone adjustment. Edit with natural language commands.",
    color: "pink",
  },
  {
    icon: ImagePlus,
    title: "AI Image Generation",
    description:
      "Generate contextual images from your content using Google Imagen 4.0. Cover images, section graphics, and custom illustrations.",
    color: "green",
  },
  {
    icon: Target,
    title: "SEO Optimization",
    description:
      "Built-in SEO tools with keyword suggestions, meta descriptions, internal linking recommendations, and search-optimized content.",
    color: "yellow",
  },
  {
    icon: History,
    title: "Version Control",
    description:
      "Never lose your work. Automatic version history with one-click rollback to any previous state. Track all changes over time.",
    color: "red",
  },
  {
    icon: Link2,
    title: "Smart Internal Linking",
    description:
      "AI analyzes your content library and suggests relevant internal links with anchor text to boost SEO and user engagement.",
    color: "indigo",
  },
  {
    icon: Zap,
    title: "Real-Time Streaming",
    description:
      "Watch your article being written in real-time with streaming generation. No waiting - see content appear word by word.",
    color: "cyan",
  },
  {
    icon: Globe,
    title: "Multi-Site Publishing",
    description:
      "Publish to multiple platforms with custom frontmatter. Export to Markdown, PDF, or TXT for any CMS or publishing workflow.",
    color: "orange",
  },
  {
    icon: BarChart3,
    title: "Content Analytics",
    description:
      "Track article performance, publication status, and content metrics. Organize with tags, categories, and custom metadata.",
    color: "teal",
  },
  {
    icon: TrendingUp,
    title: "Industry-Specific Research",
    description:
      "Specialized research agents trained on industry-specific knowledge for AI, Tech, Health, Finance, Climate, and Web3 content.",
    color: "violet",
  },
  {
    icon: Sparkles,
    title: "Customizable Workflows",
    description:
      "Choose article types (blog, technical, news, tutorial, listicle), target lengths, tone, and custom instructions for each piece.",
    color: "fuchsia",
  },
];

const colorMap = {
  blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400",
  purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400",
  pink: "from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-400",
  green: "from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
  yellow: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400",
  red: "from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
  indigo: "from-indigo-500/20 to-indigo-600/20 border-indigo-500/30 text-indigo-400",
  cyan: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400",
  orange: "from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400",
  teal: "from-teal-500/20 to-teal-600/20 border-teal-500/30 text-teal-400",
  violet: "from-violet-500/20 to-violet-600/20 border-violet-500/30 text-violet-400",
  fuchsia: "from-fuchsia-500/20 to-fuchsia-600/20 border-fuchsia-500/30 text-fuchsia-400",
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Powerful Features
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Create Amazing Content
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-zinc-400">
            A complete AI-powered content creation platform with advanced features
            to help you write, edit, and publish professional articles faster.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="group relative bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-blue-500/5"
              >
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${
                    colorMap[feature.color as keyof typeof colorMap]
                  } border mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
