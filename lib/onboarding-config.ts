/**
 * Onboarding configuration for personalized user experience
 * Maps user interests to industries and relevant subcategories
 */

export interface IndustryConfig {
  id: string;
  name: string;
  description: string;
  subcategories: SubcategoryConfig[];
  keywords: string[];
  placeholderExamples: {
    research: string;
    outline: string;
    customPrompt: string;
  };
}

export interface SubcategoryConfig {
  id: string;
  name: string;
  keywords: string[];
}

export interface OnboardingQuestion {
  id: string;
  question: string;
  type: "single-choice" | "multiple-choice" | "text";
  options?: {
    label: string;
    value: string;
    description?: string;
    industryWeights: Record<string, number>; // How much this answer weights towards each industry
  }[];
  skipLogic?: (answers: Record<string, string | string[]>) => boolean;
}

// Comprehensive industry configurations with subcategories
export const INDUSTRIES: Record<string, IndustryConfig> = {
  "ai-ml": {
    id: "ai-ml",
    name: "AI & Machine Learning",
    description: "Artificial intelligence, LLMs, and machine learning technologies",
    subcategories: [
      { id: "ai-agents", name: "AI Agents", keywords: ["autonomous agents", "AI assistants", "agent frameworks"] },
      { id: "llms", name: "Large Language Models", keywords: ["GPT", "LLM", "transformer models", "language AI"] },
      { id: "computer-vision", name: "Computer Vision", keywords: ["image recognition", "object detection", "visual AI"] },
      { id: "ai-providers", name: "AI Providers & Platforms", keywords: ["OpenAI", "Anthropic", "Google AI", "Azure AI"] },
      { id: "ml-ops", name: "MLOps & Infrastructure", keywords: ["model deployment", "ML pipelines", "AI infrastructure"] },
      { id: "generative-ai", name: "Generative AI", keywords: ["image generation", "text generation", "creative AI", "Midjourney"] },
    ],
    keywords: ["artificial intelligence", "machine learning", "deep learning", "neural networks", "AI tools"],
    placeholderExamples: {
      research: "Latest breakthroughs in large language models",
      outline: "How to build AI agents with LangChain",
      customPrompt: "Write about the impact of GPT-5 on software development",
    },
  },

  technology: {
    id: "technology",
    name: "Technology & Software",
    description: "Software development, SaaS, and tech industry trends",
    subcategories: [
      { id: "web-dev", name: "Web Development", keywords: ["React", "Next.js", "frontend", "backend", "full-stack"] },
      { id: "saas", name: "SaaS & Startups", keywords: ["software as a service", "startup growth", "product-market fit"] },
      { id: "devops", name: "DevOps & Cloud", keywords: ["AWS", "Docker", "Kubernetes", "CI/CD", "cloud infrastructure"] },
      { id: "cybersecurity", name: "Cybersecurity", keywords: ["security", "encryption", "penetration testing", "data privacy"] },
      { id: "mobile-dev", name: "Mobile Development", keywords: ["iOS", "Android", "React Native", "Flutter", "mobile apps"] },
      { id: "open-source", name: "Open Source", keywords: ["GitHub", "open source projects", "community development"] },
    ],
    keywords: ["technology", "software", "programming", "development", "tech stack"],
    placeholderExamples: {
      research: "Best React frameworks for 2026",
      outline: "Building a SaaS product from scratch",
      customPrompt: "Explain microservices architecture for beginners",
    },
  },

  health: {
    id: "health",
    name: "Health & Wellness",
    description: "Healthcare, medical technology, and wellness",
    subcategories: [
      { id: "womens-health", name: "Women's Health", keywords: ["reproductive health", "pregnancy", "menopause", "women's wellness"] },
      { id: "nutrition", name: "Nutrition & Diet", keywords: ["healthy eating", "vitamins", "dietary supplements", "meal planning"] },
      { id: "mental-health", name: "Mental Health", keywords: ["therapy", "anxiety", "depression", "mindfulness", "mental wellness"] },
      { id: "health-tech", name: "Health Tech & Digital Health", keywords: ["telemedicine", "health apps", "wearables", "medical devices"] },
      { id: "biotech", name: "Biotech & Pharma", keywords: ["biotechnology", "pharmaceuticals", "drug development", "clinical trials"] },
      { id: "fitness", name: "Fitness & Exercise", keywords: ["workout", "training", "exercise science", "sports medicine"] },
    ],
    keywords: ["healthcare", "wellness", "medical", "health", "fitness"],
    placeholderExamples: {
      research: "Latest nutrition trends for 2026",
      outline: "Complete guide to mental health apps",
      customPrompt: "Benefits of Mediterranean diet for heart health",
    },
  },

  finance: {
    id: "finance",
    name: "Finance & Fintech",
    description: "Financial services, investing, and fintech innovation",
    subcategories: [
      { id: "personal-finance", name: "Personal Finance", keywords: ["budgeting", "savings", "debt management", "financial planning"] },
      { id: "investing", name: "Investing & Trading", keywords: ["stocks", "ETFs", "portfolio", "investment strategy"] },
      { id: "fintech", name: "Fintech & Payments", keywords: ["digital banking", "payment processing", "neobanks", "fintech apps"] },
      { id: "real-estate", name: "Real Estate Investing", keywords: ["property investment", "REITs", "real estate market"] },
      { id: "crypto-finance", name: "Crypto & DeFi", keywords: ["cryptocurrency investing", "DeFi", "blockchain finance"] },
      { id: "retirement", name: "Retirement Planning", keywords: ["401k", "IRA", "retirement savings", "pension"] },
    ],
    keywords: ["finance", "money", "investing", "banking", "wealth"],
    placeholderExamples: {
      research: "Best investment strategies for 2026",
      outline: "How to start investing with $1000",
      customPrompt: "Compare high-yield savings accounts",
    },
  },

  marketing: {
    id: "marketing",
    name: "Marketing & Business",
    description: "Digital marketing, content strategy, and business growth",
    subcategories: [
      { id: "content-marketing", name: "Content Marketing", keywords: ["content strategy", "SEO content", "blog marketing"] },
      { id: "social-media", name: "Social Media Marketing", keywords: ["Instagram", "TikTok", "LinkedIn", "social strategy"] },
      { id: "email-marketing", name: "Email Marketing", keywords: ["email campaigns", "newsletters", "automation", "lead nurturing"] },
      { id: "seo", name: "SEO & Growth", keywords: ["search optimization", "organic traffic", "backlinks", "keyword research"] },
      { id: "paid-ads", name: "Paid Advertising", keywords: ["Google Ads", "Facebook Ads", "PPC", "ad campaigns"] },
      { id: "analytics", name: "Analytics & Data", keywords: ["Google Analytics", "conversion tracking", "data analysis"] },
    ],
    keywords: ["marketing", "growth", "advertising", "branding", "digital marketing"],
    placeholderExamples: {
      research: "TikTok marketing trends for 2026",
      outline: "Complete SEO guide for small businesses",
      customPrompt: "How to build an email list from scratch",
    },
  },

  ecommerce: {
    id: "ecommerce",
    name: "E-commerce & Retail",
    description: "Online retail, dropshipping, and e-commerce platforms",
    subcategories: [
      { id: "shopify", name: "Shopify & Platforms", keywords: ["Shopify", "WooCommerce", "e-commerce platforms"] },
      { id: "dropshipping", name: "Dropshipping", keywords: ["dropshipping", "product sourcing", "supplier management"] },
      { id: "amazon-fba", name: "Amazon FBA", keywords: ["Amazon selling", "FBA", "private label", "Amazon business"] },
      { id: "conversion", name: "Conversion Optimization", keywords: ["CRO", "checkout optimization", "cart abandonment"] },
      { id: "product-photography", name: "Product & Branding", keywords: ["product photos", "branding", "packaging design"] },
      { id: "fulfillment", name: "Logistics & Fulfillment", keywords: ["shipping", "inventory", "warehouse management"] },
    ],
    keywords: ["e-commerce", "online store", "retail", "selling", "dropshipping"],
    placeholderExamples: {
      research: "Best Shopify apps for 2026",
      outline: "How to start a profitable dropshipping business",
      customPrompt: "Compare Shopify vs WooCommerce",
    },
  },

  education: {
    id: "education",
    name: "Education & E-learning",
    description: "Online courses, edtech, and educational content",
    subcategories: [
      { id: "online-courses", name: "Online Courses", keywords: ["course creation", "Udemy", "Teachable", "online teaching"] },
      { id: "edtech", name: "EdTech Tools", keywords: ["learning platforms", "educational software", "classroom tech"] },
      { id: "tutoring", name: "Tutoring & Coaching", keywords: ["private tutoring", "test prep", "academic coaching"] },
      { id: "language-learning", name: "Language Learning", keywords: ["language apps", "ESL", "foreign languages"] },
      { id: "homeschooling", name: "Homeschooling", keywords: ["homeschool curriculum", "home education", "unschooling"] },
      { id: "stem", name: "STEM Education", keywords: ["science education", "coding for kids", "STEM curriculum"] },
    ],
    keywords: ["education", "learning", "teaching", "courses", "training"],
    placeholderExamples: {
      research: "Best online learning platforms 2026",
      outline: "How to create and sell online courses",
      customPrompt: "Compare Udemy vs Teachable for course creators",
    },
  },

  lifestyle: {
    id: "lifestyle",
    name: "Lifestyle & Personal Development",
    description: "Self-improvement, productivity, and lifestyle content",
    subcategories: [
      { id: "productivity", name: "Productivity & Time Management", keywords: ["productivity apps", "time management", "focus techniques"] },
      { id: "self-improvement", name: "Self-Improvement", keywords: ["personal growth", "habits", "self-help", "life coaching"] },
      { id: "minimalism", name: "Minimalism & Organization", keywords: ["decluttering", "minimalist living", "organization"] },
      { id: "travel", name: "Travel & Adventure", keywords: ["travel tips", "destinations", "budget travel", "digital nomad"] },
      { id: "relationships", name: "Relationships & Dating", keywords: ["dating advice", "relationships", "communication skills"] },
      { id: "parenting", name: "Parenting & Family", keywords: ["parenting tips", "child development", "family life"] },
    ],
    keywords: ["lifestyle", "personal development", "productivity", "habits", "wellness"],
    placeholderExamples: {
      research: "Best productivity apps for 2026",
      outline: "Building better habits in 30 days",
      customPrompt: "Digital nomad destinations for remote workers",
    },
  },

  food: {
    id: "food",
    name: "Food & Cooking",
    description: "Recipes, cooking techniques, and food culture",
    subcategories: [
      { id: "recipes", name: "Recipes & Meal Ideas", keywords: ["recipes", "cooking", "meal planning", "quick meals"] },
      { id: "baking", name: "Baking & Pastry", keywords: ["baking", "bread", "pastries", "desserts"] },
      { id: "special-diets", name: "Special Diets", keywords: ["vegan", "keto", "gluten-free", "paleo", "dietary restrictions"] },
      { id: "food-blogging", name: "Food Blogging", keywords: ["food photography", "food blog", "recipe development"] },
      { id: "restaurant", name: "Restaurant & Dining", keywords: ["restaurant reviews", "dining out", "food culture"] },
      { id: "cooking-techniques", name: "Cooking Techniques", keywords: ["culinary skills", "knife skills", "cooking methods"] },
    ],
    keywords: ["food", "cooking", "recipes", "culinary", "baking"],
    placeholderExamples: {
      research: "Trending recipes for 2026",
      outline: "Ultimate guide to keto diet meal planning",
      customPrompt: "Easy weeknight dinner recipes for families",
    },
  },

  climate: {
    id: "climate",
    name: "Climate & Sustainability",
    description: "Environmental issues, clean tech, and sustainable living",
    subcategories: [
      { id: "renewable-energy", name: "Renewable Energy", keywords: ["solar", "wind power", "clean energy", "energy storage"] },
      { id: "sustainable-living", name: "Sustainable Living", keywords: ["zero waste", "eco-friendly", "sustainable lifestyle"] },
      { id: "climate-tech", name: "Climate Tech", keywords: ["carbon capture", "climate solutions", "green technology"] },
      { id: "ev", name: "Electric Vehicles", keywords: ["EVs", "Tesla", "electric cars", "charging infrastructure"] },
      { id: "circular-economy", name: "Circular Economy", keywords: ["recycling", "upcycling", "waste reduction"] },
      { id: "climate-policy", name: "Climate Policy", keywords: ["climate regulation", "ESG", "carbon credits", "climate action"] },
    ],
    keywords: ["climate", "sustainability", "environment", "green tech", "renewable energy"],
    placeholderExamples: {
      research: "Latest innovations in solar technology",
      outline: "How to transition to a zero-waste lifestyle",
      customPrompt: "Compare electric vehicles for families",
    },
  },

  crypto: {
    id: "crypto",
    name: "Crypto & Web3",
    description: "Cryptocurrency, blockchain, and decentralized technologies",
    subcategories: [
      { id: "bitcoin", name: "Bitcoin & Cryptocurrencies", keywords: ["Bitcoin", "Ethereum", "altcoins", "crypto trading"] },
      { id: "defi", name: "DeFi & Protocols", keywords: ["decentralized finance", "lending", "yield farming", "liquidity"] },
      { id: "nfts", name: "NFTs & Digital Assets", keywords: ["NFT", "digital art", "collectibles", "metaverse"] },
      { id: "web3", name: "Web3 & dApps", keywords: ["Web3", "decentralized apps", "blockchain development"] },
      { id: "crypto-regulation", name: "Crypto Regulation", keywords: ["crypto laws", "SEC", "compliance", "regulation"] },
      { id: "blockchain-tech", name: "Blockchain Technology", keywords: ["smart contracts", "blockchain", "consensus mechanisms"] },
    ],
    keywords: ["cryptocurrency", "blockchain", "Web3", "DeFi", "crypto"],
    placeholderExamples: {
      research: "Best DeFi protocols for 2026",
      outline: "Complete guide to NFT investing",
      customPrompt: "Explain blockchain technology for beginners",
    },
  },

  "real-estate": {
    id: "real-estate",
    name: "Real Estate",
    description: "Property investing, home buying, and real estate business",
    subcategories: [
      { id: "home-buying", name: "Home Buying & Mortgages", keywords: ["home buying", "mortgages", "first-time buyer", "real estate market"] },
      { id: "rental-property", name: "Rental Properties", keywords: ["rental investing", "landlord", "property management"] },
      { id: "flipping", name: "House Flipping & Renovation", keywords: ["house flipping", "renovation", "home improvement"] },
      { id: "commercial", name: "Commercial Real Estate", keywords: ["commercial property", "office space", "retail real estate"] },
      { id: "real-estate-tech", name: "PropTech & Real Estate Tech", keywords: ["real estate apps", "virtual tours", "PropTech"] },
      { id: "market-analysis", name: "Market Analysis", keywords: ["real estate trends", "market data", "property valuation"] },
    ],
    keywords: ["real estate", "property", "housing", "investment property"],
    placeholderExamples: {
      research: "Real estate market trends for 2026",
      outline: "How to buy your first rental property",
      customPrompt: "Best cities for real estate investing",
    },
  },
};

// Industry-specific topic options (shown based on Q1 answer)
const INDUSTRY_TOPICS: Record<string, { label: string; value: string }[]> = {
  "ai-ml": [
    { label: "AI Agents & Autonomous Systems", value: "ai-agents" },
    { label: "Large Language Models (LLMs)", value: "llms" },
    { label: "Computer Vision & Image AI", value: "computer-vision" },
    { label: "AI Providers & Platforms", value: "ai-providers" },
    { label: "MLOps & Model Deployment", value: "mlops" },
    { label: "Generative AI & Creative Tools", value: "generative-ai" },
  ],
  technology: [
    { label: "Web Development (React, Next.js, etc.)", value: "web-dev" },
    { label: "SaaS & Startup Building", value: "saas" },
    { label: "DevOps & Cloud Infrastructure", value: "devops" },
    { label: "Cybersecurity & Privacy", value: "cybersecurity" },
    { label: "Mobile Development", value: "mobile-dev" },
    { label: "Open Source Projects", value: "open-source" },
  ],
  health: [
    { label: "Women's Health", value: "womens-health" },
    { label: "Nutrition & Diet", value: "nutrition" },
    { label: "Mental Health & Wellness", value: "mental-health" },
    { label: "Health Tech & Digital Health", value: "health-tech" },
    { label: "Biotech & Pharmaceuticals", value: "biotech" },
    { label: "Fitness & Exercise", value: "fitness" },
  ],
  finance: [
    { label: "Personal Finance & Budgeting", value: "personal-finance" },
    { label: "Investing & Stock Market", value: "investing" },
    { label: "Fintech & Digital Banking", value: "fintech" },
    { label: "Real Estate Investing", value: "real-estate-investing" },
    { label: "Crypto Investing & DeFi", value: "crypto-finance" },
    { label: "Retirement Planning", value: "retirement" },
  ],
  marketing: [
    { label: "Content Marketing & SEO", value: "content-marketing" },
    { label: "Social Media Marketing", value: "social-media" },
    { label: "Email Marketing & Automation", value: "email-marketing" },
    { label: "SEO & Organic Growth", value: "seo" },
    { label: "Paid Advertising (Google, Facebook)", value: "paid-ads" },
    { label: "Analytics & Data", value: "analytics" },
  ],
  ecommerce: [
    { label: "Shopify & E-commerce Platforms", value: "shopify" },
    { label: "Dropshipping", value: "dropshipping" },
    { label: "Amazon FBA & Private Label", value: "amazon-fba" },
    { label: "Conversion Rate Optimization", value: "conversion" },
    { label: "Product Branding & Photography", value: "product-branding" },
    { label: "Logistics & Fulfillment", value: "fulfillment" },
  ],
  education: [
    { label: "Online Course Creation", value: "online-courses" },
    { label: "EdTech Tools & Platforms", value: "edtech" },
    { label: "Tutoring & Test Prep", value: "tutoring" },
    { label: "Language Learning", value: "language-learning" },
    { label: "Homeschooling", value: "homeschooling" },
    { label: "STEM Education", value: "stem" },
  ],
  lifestyle: [
    { label: "Productivity & Time Management", value: "productivity" },
    { label: "Self-Improvement & Habits", value: "self-improvement" },
    { label: "Minimalism & Organization", value: "minimalism" },
    { label: "Travel & Digital Nomad Life", value: "travel" },
    { label: "Relationships & Dating", value: "relationships" },
    { label: "Parenting & Family", value: "parenting" },
  ],
  food: [
    { label: "Recipes & Meal Planning", value: "recipes" },
    { label: "Baking & Pastry", value: "baking" },
    { label: "Special Diets (Keto, Vegan, etc.)", value: "special-diets" },
    { label: "Food Blogging & Photography", value: "food-blogging" },
    { label: "Restaurant Reviews & Dining", value: "restaurant" },
    { label: "Cooking Techniques & Skills", value: "cooking-techniques" },
  ],
  climate: [
    { label: "Renewable Energy (Solar, Wind)", value: "renewable-energy" },
    { label: "Sustainable Living & Zero Waste", value: "sustainable-living" },
    { label: "Climate Tech & Innovation", value: "climate-tech" },
    { label: "Electric Vehicles", value: "ev" },
    { label: "Circular Economy & Recycling", value: "circular-economy" },
    { label: "Climate Policy & ESG", value: "climate-policy" },
  ],
  crypto: [
    { label: "Bitcoin & Cryptocurrencies", value: "bitcoin" },
    { label: "DeFi Protocols & Yield Farming", value: "defi" },
    { label: "NFTs & Digital Assets", value: "nfts" },
    { label: "Web3 & dApps", value: "web3" },
    { label: "Crypto Regulation & Compliance", value: "crypto-regulation" },
    { label: "Blockchain Technology", value: "blockchain-tech" },
  ],
  "real-estate": [
    { label: "Home Buying & Mortgages", value: "home-buying" },
    { label: "Rental Property Investing", value: "rental-property" },
    { label: "House Flipping & Renovation", value: "flipping" },
    { label: "Commercial Real Estate", value: "commercial" },
    { label: "PropTech & Real Estate Tech", value: "real-estate-tech" },
    { label: "Market Analysis & Trends", value: "market-analysis" },
  ],
};

// Map first question answers to industries
const INDUSTRY_MAPPING: Record<string, string> = {
  "ai-content": "ai-ml",
  "tech-content": "technology",
  "health-content": "health",
  "finance-content": "finance",
  "marketing-content": "marketing",
  "ecommerce-content": "ecommerce",
  "education-content": "education",
  "lifestyle-content": "lifestyle",
  "food-content": "food",
  "climate-content": "climate",
  "crypto-content": "crypto",
  "real-estate-content": "real-estate",
};

// Onboarding questionnaire - progressive and intuitive
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "primary-industry",
    question: "What type of content do you want to create?",
    type: "single-choice",
    options: [
      {
        label: "AI & Machine Learning",
        description: "Write about AI, LLMs, machine learning, and artificial intelligence",
        value: "ai-content",
        industryWeights: { "ai-ml": 10 },
      },
      {
        label: "Technology & Software",
        description: "Cover software development, SaaS, startups, and tech trends",
        value: "tech-content",
        industryWeights: { technology: 10 },
      },
      {
        label: "Health & Wellness",
        description: "Share health, fitness, nutrition, and wellness content",
        value: "health-content",
        industryWeights: { health: 10 },
      },
      {
        label: "Finance & Investing",
        description: "Write about personal finance, investing, and money management",
        value: "finance-content",
        industryWeights: { finance: 10 },
      },
      {
        label: "Marketing & Business Growth",
        description: "Create content about marketing strategies and business development",
        value: "marketing-content",
        industryWeights: { marketing: 10 },
      },
      {
        label: "E-commerce & Online Retail",
        description: "Cover dropshipping, Shopify, Amazon FBA, and online selling",
        value: "ecommerce-content",
        industryWeights: { ecommerce: 10 },
      },
      {
        label: "Education & E-learning",
        description: "Write about online courses, teaching, and educational content",
        value: "education-content",
        industryWeights: { education: 10 },
      },
      {
        label: "Lifestyle & Personal Development",
        description: "Share content about productivity, travel, and self-improvement",
        value: "lifestyle-content",
        industryWeights: { lifestyle: 10 },
      },
      {
        label: "Food & Cooking",
        description: "Create recipes, cooking guides, and food-related content",
        value: "food-content",
        industryWeights: { food: 10 },
      },
      {
        label: "Climate & Sustainability",
        description: "Write about environmental issues, clean tech, and sustainability",
        value: "climate-content",
        industryWeights: { climate: 10 },
      },
      {
        label: "Crypto & Web3",
        description: "Cover cryptocurrency, blockchain, DeFi, and Web3 technologies",
        value: "crypto-content",
        industryWeights: { crypto: 10 },
      },
      {
        label: "Real Estate",
        description: "Write about property investing, home buying, and real estate",
        value: "real-estate-content",
        industryWeights: { "real-estate": 10 },
      },
    ],
  },
  {
    id: "specific-topics",
    question: "Which specific topics interest you most? (Select up to 6)",
    type: "multiple-choice",
    options: [], // Will be populated dynamically based on Q1 answer
  },
];

// Export for use in OnboardingFlow
export { INDUSTRY_TOPICS, INDUSTRY_MAPPING };

// Helper function to determine primary industry from quiz answers
export function determineIndustryFromAnswers(
  answers: Record<string, string | string[]>
): string {
  // For the new simplified flow, just use the direct mapping from Q1
  const primaryIndustryAnswer = answers["primary-industry"];
  if (typeof primaryIndustryAnswer === "string" && INDUSTRY_MAPPING[primaryIndustryAnswer]) {
    return INDUSTRY_MAPPING[primaryIndustryAnswer];
  }

  // Fallback to old scoring method if needed
  const scores: Record<string, number> = {};
  Object.keys(INDUSTRIES).forEach((industry) => {
    scores[industry] = 0;
  });

  ONBOARDING_QUESTIONS.forEach((question) => {
    const answer = answers[question.id];
    if (!answer) return;

    const answerArray = Array.isArray(answer) ? answer : [answer];
    answerArray.forEach((value) => {
      const option = question.options?.find((opt) => opt.value === value);
      if (option && option.industryWeights) {
        Object.entries(option.industryWeights).forEach(([industry, weight]) => {
          scores[industry] = (scores[industry] || 0) + weight;
        });
      }
    });
  });

  let maxScore = 0;
  let primaryIndustry = "technology";
  Object.entries(scores).forEach(([industry, score]) => {
    if (score > maxScore) {
      maxScore = score;
      primaryIndustry = industry;
    }
  });

  return primaryIndustry;
}

// Helper to get personalized placeholder text
export function getPlaceholderForIndustry(
  industryId: string,
  type: "research" | "outline" | "customPrompt"
): string {
  const industry = INDUSTRIES[industryId];
  return industry?.placeholderExamples[type] || INDUSTRIES.technology.placeholderExamples[type];
}

// Helper to get subcategories for an industry
export function getSubcategoriesForIndustry(industryId: string): SubcategoryConfig[] {
  return INDUSTRIES[industryId]?.subcategories || INDUSTRIES.technology.subcategories;
}

// Helper to get all keywords for an industry (main + subcategory keywords)
export function getAllKeywordsForIndustry(industryId: string): string[] {
  const industry = INDUSTRIES[industryId];
  if (!industry) return [];

  const subcategoryKeywords = industry.subcategories.flatMap((sub) => sub.keywords);
  return [...industry.keywords, ...subcategoryKeywords];
}
