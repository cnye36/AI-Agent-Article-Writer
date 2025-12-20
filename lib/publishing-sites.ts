export interface PreconfiguredSite {
  name: string;
  base_path: string;
  category: string;
  description?: string;
}

export const PRECONFIGURED_PUBLISHING_SITES: PreconfiguredSite[] = [
  // Tech & Development
  {
    name: "Medium",
    base_path: "https://medium.com/@yourusername",
    category: "Tech",
    description: "Popular blogging platform for tech articles",
  },
  {
    name: "HackerNoon",
    base_path: "https://hackernoon.com",
    category: "Tech",
    description: "Tech publication for developers and entrepreneurs",
  },
  {
    name: "Indie Hackers",
    base_path: "https://www.indiehackers.com",
    category: "Tech",
    description: "Community for indie entrepreneurs",
  },
  {
    name: "Dev.to",
    base_path: "https://dev.to",
    category: "Tech",
    description: "Community for developers",
  },
  {
    name: "Hashnode",
    base_path: "https://hashnode.com",
    category: "Tech",
    description: "Developer blogging platform",
  },
  {
    name: "FreeCodeCamp",
    base_path: "https://www.freecodecamp.org/news",
    category: "Tech",
    description: "Free coding education platform",
  },
  {
    name: "CSS-Tricks",
    base_path: "https://css-tricks.com",
    category: "Tech",
    description: "Web design and development resource",
  },
  {
    name: "Smashing Magazine",
    base_path: "https://www.smashingmagazine.com",
    category: "Tech",
    description: "Web design and development magazine",
  },

  // Web3 & Crypto
  {
    name: "Mirror",
    base_path: "https://mirror.xyz",
    category: "Web3",
    description: "Web3-native publishing platform",
  },
  {
    name: "Medium (Web3)",
    base_path: "https://medium.com/@yourusername",
    category: "Web3",
    description: "Medium for crypto/blockchain content",
  },
  {
    name: "CoinDesk",
    base_path: "https://www.coindesk.com",
    category: "Web3",
    description: "Cryptocurrency news and analysis",
  },
  {
    name: "The Defiant",
    base_path: "https://thedefiant.io",
    category: "Web3",
    description: "DeFi and crypto news",
  },

  // Health & Wellness
  {
    name: "Medium (Health)",
    base_path: "https://medium.com/@yourusername",
    category: "Health",
    description: "Medium for health and wellness content",
  },
  {
    name: "Healthline",
    base_path: "https://www.healthline.com",
    category: "Health",
    description: "Health information and wellness",
  },
  {
    name: "Well+Good",
    base_path: "https://www.wellandgood.com",
    category: "Health",
    description: "Wellness lifestyle publication",
  },

  // Business & Entrepreneurship
  {
    name: "Medium (Business)",
    base_path: "https://medium.com/@yourusername",
    category: "Business",
    description: "Medium for business content",
  },
  {
    name: "Entrepreneur",
    base_path: "https://www.entrepreneur.com",
    category: "Business",
    description: "Business and entrepreneurship magazine",
  },
  {
    name: "Fast Company",
    base_path: "https://www.fastcompany.com",
    category: "Business",
    description: "Business innovation and leadership",
  },
  {
    name: "Forbes",
    base_path: "https://www.forbes.com",
    category: "Business",
    description: "Business news and financial information",
  },

  // General
  {
    name: "Personal Blog",
    base_path: "https://yourblog.com",
    category: "General",
    description: "Your personal website or blog",
  },
  {
    name: "WordPress",
    base_path: "https://yoursite.wordpress.com",
    category: "General",
    description: "WordPress.com hosted blog",
  },
  {
    name: "Substack",
    base_path: "https://yoursubstack.substack.com",
    category: "General",
    description: "Newsletter and blog platform",
  },
  {
    name: "Ghost",
    base_path: "https://yoursite.ghost.io",
    category: "General",
    description: "Professional publishing platform",
  },
];

export const SITE_CATEGORIES = [
  "All",
  "Tech",
  "Web3",
  "Health",
  "Business",
  "General",
] as const;

export type SiteCategory = (typeof SITE_CATEGORIES)[number];

