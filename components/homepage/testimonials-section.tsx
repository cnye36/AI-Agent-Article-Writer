"use client";

import { Star, Quote } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Content Director",
    company: "TechFlow Media",
    avatar: "SC",
    rating: 5,
    text: "This platform has transformed our content creation process. We're publishing 3x more articles with the same team size. The AI research agent finds topics we would have never discovered manually.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Marcus Rodriguez",
    role: "Founder & CEO",
    company: "Growth Labs",
    avatar: "MR",
    rating: 5,
    text: "The multi-agent system is brilliant. Each agent specializes in its task, and the results are consistently high-quality. Our organic traffic increased 250% in just 3 months.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Emily Watson",
    role: "Senior Writer",
    company: "AI Insights Blog",
    avatar: "EW",
    rating: 5,
    text: "I was skeptical about AI writing tools, but this one actually enhances my creativity instead of replacing it. The AI editing features help me refine my voice, not change it.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    name: "David Kim",
    role: "Marketing Manager",
    company: "FinTech Pulse",
    avatar: "DK",
    rating: 5,
    text: "The SEO optimization and internal linking suggestions alone are worth the price. We're ranking for competitive keywords we never thought possible. Game-changer for our content strategy.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "Priya Patel",
    role: "Content Strategist",
    company: "Health & Wellness Hub",
    avatar: "PP",
    rating: 5,
    text: "Version history saved us multiple times when clients changed their mind. The ability to roll back to any previous version gives us confidence to experiment with different approaches.",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    name: "James Mitchell",
    role: "Blogger",
    company: "Independent",
    avatar: "JM",
    rating: 5,
    text: "As a solo creator, this tool is like having a research team, editor, and designer all in one. The AI image generation feature is incredible - my articles look professional without any design skills.",
    gradient: "from-pink-500 to-fuchsia-500",
  },
];

const stats = [
  { value: "10,000+", label: "Articles Published" },
  { value: "500+", label: "Active Users" },
  { value: "4.9/5", label: "Average Rating" },
  { value: "250%", label: "Traffic Increase" },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium">
            <Star className="w-4 h-4 fill-current" />
            Loved by Content Creators
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            What Our Users Say
            <br />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              About Their Results
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-zinc-400">
            Join thousands of content creators who are publishing better content faster.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="group relative bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-blue-500/5"
            >
              {/* Quote icon */}
              <Quote className="absolute top-4 right-4 w-8 h-8 text-zinc-800" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star
                    key={j}
                    className="w-4 h-4 text-yellow-400 fill-current"
                  />
                ))}
              </div>

              {/* Testimonial text */}
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} text-white font-semibold text-sm`}
                >
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-white font-medium text-sm">
                    {testimonial.name}
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {testimonial.role} • {testimonial.company}
                  </div>
                </div>
              </div>

              {/* Hover gradient overlay */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
