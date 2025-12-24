import { Navbar } from "@/components/homepage/navbar";
import { PricingSection } from "@/components/homepage/pricing-section";
import { CTASection } from "@/components/homepage/cta-section";
import { Footer } from "@/components/homepage/footer";
import { Check, X, Sparkles } from "lucide-react";
import Link from "next/link";

const comparisonFeatures = [
  {
    category: "Content Creation",
    features: [
      { name: "Articles per month", starter: "10", pro: "50", enterprise: "Unlimited" },
      { name: "AI topic research", starter: true, pro: true, enterprise: true },
      { name: "Outline generation", starter: true, pro: true, enterprise: true },
      { name: "Real-time streaming writer", starter: true, pro: true, enterprise: true },
      { name: "Custom AI instructions", starter: false, pro: true, enterprise: true },
      { name: "Custom AI agent training", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "AI Features",
    features: [
      { name: "AI text editing", starter: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { name: "AI image generation", starter: "5/mo", pro: "50/mo", enterprise: "Unlimited" },
      { name: "Tone adjustment", starter: true, pro: true, enterprise: true },
      { name: "Custom prompts", starter: false, pro: true, enterprise: true },
      { name: "Batch operations", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "SEO & Optimization",
    features: [
      { name: "SEO keyword suggestions", starter: false, pro: true, enterprise: true },
      { name: "Internal linking", starter: false, pro: true, enterprise: true },
      { name: "Meta descriptions", starter: false, pro: true, enterprise: true },
      { name: "Search optimization", starter: false, pro: true, enterprise: true },
      { name: "Custom SEO rules", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Publishing & Export",
    features: [
      { name: "Export to Markdown", starter: true, pro: true, enterprise: true },
      { name: "Export to PDF", starter: false, pro: true, enterprise: true },
      { name: "Export to TXT", starter: false, pro: true, enterprise: true },
      { name: "Multi-site publishing", starter: false, pro: true, enterprise: true },
      { name: "Custom frontmatter", starter: false, pro: true, enterprise: true },
      { name: "API access", starter: false, pro: false, enterprise: true },
      { name: "White-label options", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Version Control & History",
    features: [
      { name: "Version history", starter: "7 days", pro: "30 days", enterprise: "Unlimited" },
      { name: "One-click rollback", starter: true, pro: true, enterprise: true },
      { name: "Change tracking", starter: true, pro: true, enterprise: true },
      { name: "Advanced analytics", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Collaboration & Teams",
    features: [
      { name: "Team members", starter: "1", pro: "5", enterprise: "Unlimited" },
      { name: "Collaborative editing", starter: false, pro: false, enterprise: true },
      { name: "Role-based permissions", starter: false, pro: false, enterprise: true },
      { name: "Activity logs", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Email support", starter: "Standard", pro: "Priority", enterprise: "24/7" },
      { name: "Response time", starter: "48hrs", pro: "24hrs", enterprise: "1hr" },
      { name: "Dedicated account manager", starter: false, pro: false, enterprise: true },
      { name: "Custom onboarding", starter: false, pro: false, enterprise: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Transparent Pricing
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            Choose the Perfect Plan
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              For Your Needs
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-8">
            Start with a 14-day free trial. Credit card required. Scale as you
            grow.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <PricingSection />

      {/* Feature comparison table */}
      <section className="py-24 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Compare All Features
            </h2>
            <p className="text-zinc-400">
              See exactly what&apos;s included in each plan
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div className="text-white font-semibold">Features</div>
              <div className="text-white font-semibold text-center">
                Starter
              </div>
              <div className="text-white font-semibold text-center">
                Professional
              </div>
              <div className="text-white font-semibold text-center">
                Enterprise
              </div>
            </div>

            {/* Feature rows */}
            {comparisonFeatures.map((category, i) => (
              <div key={i}>
                <div className="px-6 py-4 bg-zinc-900/30 border-b border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                    {category.category}
                  </h3>
                </div>
                {category.features.map((feature, j) => (
                  <div
                    key={j}
                    className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors"
                  >
                    <div className="text-zinc-300 text-sm">{feature.name}</div>
                    <div className="text-center">
                      {typeof feature.starter === "boolean" ? (
                        feature.starter ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-zinc-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-zinc-300 text-sm">
                          {feature.starter}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof feature.pro === "boolean" ? (
                        feature.pro ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-zinc-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-zinc-300 text-sm">
                          {feature.pro}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof feature.enterprise === "boolean" ? (
                        feature.enterprise ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-zinc-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-zinc-300 text-sm">
                          {feature.enterprise}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-zinc-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-zinc-400">Have questions? We have answers.</p>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "How does the free trial work?",
                a: "Start with any plan and get 14 days completely free. Credit card required. You'll be charged at the end of the trial period if you don't cancel. You can cancel anytime during the trial period.",
              },
              {
                q: "Can I change plans later?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.",
              },
              {
                q: "What happens when I reach my article limit?",
                a: "You can either upgrade to a higher plan or wait until your monthly limit resets. Enterprise customers have unlimited articles.",
              },
              {
                q: "Do you offer refunds?",
                a: "Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.",
              },
              {
                q: "Is there a setup fee?",
                a: "No setup fees, ever. You only pay the monthly subscription price for your chosen plan.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely. Cancel anytime from your account settings. No questions asked, no cancellation fees.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
              >
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-zinc-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-zinc-400 mb-4">Still have questions?</p>
            <Link
              href="#"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Contact our sales team →
            </Link>
          </div>
        </div>
      </section>

      <CTASection />
      <Footer />
    </main>
  );
}
