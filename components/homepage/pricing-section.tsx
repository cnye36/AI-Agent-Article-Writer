"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { STRIPE_PRICE_IDS } from "@/lib/config";

const plans = [
  {
    name: "Starter",
    icon: Sparkles,
    price: "9.99",
    period: "month",
    priceId: STRIPE_PRICE_IDS.starter,
    description: "Perfect for individual creators and bloggers",
    features: [
      "50 articles per month",
      "AI topic research",
      "Outline generation",
      "Basic AI editing",
      "25 AI-generated images",
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
    price: "29.99",
    period: "month",
    priceId: STRIPE_PRICE_IDS.professional,
    description: "For professional writers and content teams",
    features: [
      "500 articles per month",
      "Advanced topic research",
      "SEO optimization tools",
      "Advanced AI editing",
      "200 AI-generated images",
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
    priceId: null,
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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePlanSelect = async (plan: (typeof plans)[0]) => {
    // Custom plan goes to contact
    if (plan.price === "Custom") {
      router.push("/contact");
      return;
    }

    // Check if user is authenticated
    if (!user) {
      // Redirect to signup with return URL
      router.push(
        `/auth/signup?redirect=${encodeURIComponent(
          window.location.pathname + "#pricing"
        )}`
      );
      return;
    }

    // Check if priceId is configured
    if (!plan.priceId) {
      showToast(
        "This plan is not yet available. Please contact support.",
        "error"
      );
      return;
    }

    setLoadingPlan(plan.name);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to create checkout session";
        const details = data.details ? ` ${data.details}` : "";
        throw new Error(`${errorMsg}${details}`);
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please check your Stripe configuration.";
      showToast(errorMessage, "error");
      setLoadingPlan(null);
    }
  };

  return (
    <section
      id="pricing"
      className="py-24 bg-gradient-to-b from-blue-50 via-white to-blue-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/20 dark:from-blue-900/20 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
            Choose Your Plan
            <br />
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Scale as You Grow
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-zinc-400">
            Start with a 14-day free trial. Credit card required.
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
                className={`relative bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-950 border rounded-2xl p-8 flex flex-col transition-all ${
                  plan.popular
                    ? "border-purple-500/50 shadow-xl shadow-purple-500/20 dark:shadow-purple-500/20 scale-105 ring-2 ring-purple-500/20"
                    : "border-slate-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-zinc-700 hover:shadow-lg"
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
                  <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-slate-700 dark:text-white" />
                  </div>
                </div>

                {/* Plan name */}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400 text-sm mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-8">
                  {plan.price === "Custom" ? (
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      Custom Pricing
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-slate-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-slate-500 dark:text-zinc-500">
                        /{plan.period}
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA button */}
                <button
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loadingPlan === plan.name || authLoading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-center transition-all mb-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                      : "bg-blue-600 dark:bg-zinc-800 text-white hover:bg-blue-700 dark:hover:bg-zinc-700 border border-transparent dark:border-zinc-700"
                  }`}
                >
                  {loadingPlan === plan.name ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </button>

                {/* Features list */}
                <div className="space-y-4 flex-1">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br ${plan.gradient} p-[1px] mt-0.5`}
                      >
                        <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-slate-700 dark:text-white" />
                        </div>
                      </div>
                      <span className="text-slate-700 dark:text-zinc-300 text-sm">
                        {feature}
                      </span>
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
          <p className="text-slate-500 dark:text-zinc-400">
            All plans include 14-day free trial • Credit card required
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 dark:text-zinc-500">
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
