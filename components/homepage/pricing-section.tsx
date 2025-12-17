"use client";

import Link from "next/link";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    icon: Sparkles,
    price: "29",
    period: "month",
    description: "Perfect for individual creators and bloggers",
    features: [
      "10 articles per month",
      "AI topic research",
      "Outline generation",
      "Basic AI editing",
      "5 AI-generated images",
      "Version history (7 days)",
      "Export to Markdown",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Professional",
    icon: Zap,
    price: "79",
    period: "month",
    description: "For professional writers and content teams",
    features: [
      "50 articles per month",
      "Advanced topic research",
      "SEO optimization tools",
      "Advanced AI editing",
      "50 AI-generated images",
      "Version history (30 days)",
      "Internal linking suggestions",
      "Multi-site publishing",
      "Export to Markdown, PDF, TXT",
      "Priority email support",
      "Custom frontmatter",
    ],
    cta: "Start Free Trial",
    popular: true,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Enterprise",
    icon: Crown,
    price: "Custom",
    period: "",
    description: "For agencies and large content operations",
    features: [
      "Unlimited articles",
      "Custom AI agent training",
      "White-label options",
      "Unlimited AI images",
      "Unlimited version history",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 priority support",
      "Custom workflows",
      "Team collaboration tools",
      "Advanced analytics",
    ],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-orange-500 to-red-500",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-zinc-950 relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
            <Zap className="w-4 h-4" />
            Simple Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            Choose Your Plan
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Scale as You Grow
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-zinc-400">
            Start with a 14-day free trial. No credit card required.
            <br />
            Cancel anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <div
                key={i}
                className={`relative bg-gradient-to-b from-zinc-900 to-zinc-950 border rounded-2xl p-8 flex flex-col ${
                  plan.popular
                    ? "border-purple-500/50 shadow-xl shadow-purple-500/20 scale-105"
                    : "border-zinc-800"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 rounded-full text-sm font-semibold text-white shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} p-[2px] mb-6`}
                >
                  <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Plan name */}
                <h3 className="text-2xl font-bold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-zinc-400 text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-8">
                  {plan.price === "Custom" ? (
                    <div className="text-4xl font-bold text-white">
                      Custom Pricing
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-white">
                        ${plan.price}
                      </span>
                      <span className="text-zinc-500">/{plan.period}</span>
                    </div>
                  )}
                </div>

                {/* CTA button */}
                <Link
                  href={plan.price === "Custom" ? "/contact" : "/auth/signup"}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-center transition-all mb-8 ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                      : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features list */}
                <div className="space-y-4 flex-1">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br ${plan.gradient} p-[1px] mt-0.5`}
                      >
                        <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <span className="text-zinc-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${plan.gradient} opacity-0 hover:opacity-5 transition-opacity pointer-events-none`}
                />
              </div>
            );
          })}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-zinc-400">
            All plans include 14-day free trial • No credit card required
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <span>✓ Cancel anytime</span>
            <span>✓ No setup fees</span>
            <span>✓ Secure payments</span>
            <span>✓ Money-back guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
}
