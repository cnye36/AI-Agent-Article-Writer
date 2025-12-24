export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  ai: [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "LLM",
    "GPT",
    "neural network",
    "AI agents",
    "generative AI",
    "transformer models",
    "computer vision",
  ],
  tech: [
    "technology",
    "software",
    "startup",
    "SaaS",
    "cloud computing",
    "cybersecurity",
    "devops",
    "programming",
    "open source",
    "tech industry",
  ],
  health: [
    "healthcare",
    "medical",
    "wellness",
    "biotech",
    "digital health",
    "telemedicine",
    "mental health",
    "pharmaceutical",
    "clinical trials",
    "health tech",
  ],
  finance: [
    "fintech",
    "banking",
    "investment",
    "cryptocurrency",
    "stock market",
    "venture capital",
    "financial services",
    "payments",
    "insurance tech",
    "trading",
  ],
  climate: [
    "climate change",
    "sustainability",
    "renewable energy",
    "clean tech",
    "carbon footprint",
    "ESG",
    "green technology",
    "electric vehicles",
    "solar energy",
    "climate tech",
  ],
  crypto: [
    "cryptocurrency",
    "blockchain",
    "web3",
    "DeFi",
    "NFT",
    "Bitcoin",
    "Ethereum",
    "smart contracts",
    "decentralized",
    "crypto regulation",
  ],
};

export const INDUSTRY_NAMES: Record<string, string> = {
  ai: "AI & Machine Learning",
  tech: "Technology",
  health: "Health & Wellness",
  finance: "Finance & Fintech",
  climate: "Climate & Sustainability",
  crypto: "Crypto & Web3",
};

// Stripe Price IDs for subscription plans
// Set these in your .env.local file:
// NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_xxxxx
// NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxx
export const STRIPE_PRICE_IDS = {
  starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "",
  professional: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || "",
};

/**
 * Get list of exempt emails from environment variable
 * These emails have full access without a plan or limits
 * Format: comma-separated list, e.g., "admin@example.com,user@example.com"
 */
export function getExemptEmails(): string[] {
  const exemptEmailsEnv = process.env.EXEMPT_EMAILS || "";
  if (!exemptEmailsEnv.trim()) {
    return [];
  }
  
  return exemptEmailsEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Check if an email is exempt from plan requirements
 */
export function isExemptEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  
  const exemptEmails = getExemptEmails();
  return exemptEmails.includes(email.toLowerCase());
}
