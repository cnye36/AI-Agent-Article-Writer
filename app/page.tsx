import { Navbar } from "@/components/homepage/navbar";
import { HeroSection } from "@/components/homepage/hero-section";
import { FeaturesSection } from "@/components/homepage/features-section";
import { HowItWorksSection } from "@/components/homepage/how-it-works-section";
import { PricingSection } from "@/components/homepage/pricing-section";
import { TestimonialsSection } from "@/components/homepage/testimonials-section";
import { CTASection } from "@/components/homepage/cta-section";
import { Footer } from "@/components/homepage/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <div id="testimonials">
        <TestimonialsSection />
      </div>
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}
