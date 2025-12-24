/**
 * Test script for writer agent word count debugging
 * Run with: npx tsx test-writer-agent.ts
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

import { createWriterAgent } from "./agents/writer-agent";
import type { ArticleType, Source } from "./types";

// Mock outline that should produce ~1,500 word article (6 sections × 250 words)
const mockOutline = {
  title: "Test Article: AI Trends for 2026",
  hook: "Artificial intelligence is evolving faster than ever. Here's what you need to know for 2026.",
  sections: [
    {
      heading: "Introduction to AI in 2026",
      keyPoints: [
        "AI market growth",
        "Key technological advances",
        "Industry adoption rates"
      ],
      wordTarget: 250,
      suggestedLinks: []
    },
    {
      heading: "Machine Learning Breakthroughs",
      keyPoints: [
        "New model architectures",
        "Training efficiency improvements",
        "Real-world applications"
      ],
      wordTarget: 250,
      suggestedLinks: []
    },
    {
      heading: "AI in Business Operations",
      keyPoints: [
        "Automation trends",
        "ROI analysis",
        "Implementation challenges"
      ],
      wordTarget: 250,
      suggestedLinks: []
    },
    {
      heading: "Ethical Considerations",
      keyPoints: [
        "Bias in AI systems",
        "Privacy concerns",
        "Regulatory landscape"
      ],
      wordTarget: 250,
      suggestedLinks: []
    },
    {
      heading: "Future Predictions",
      keyPoints: [
        "Emerging technologies",
        "Market disruptions",
        "Skills for AI professionals"
      ],
      wordTarget: 250,
      suggestedLinks: []
    },
    {
      heading: "Getting Started with AI",
      keyPoints: [
        "Tools and platforms",
        "Learning resources",
        "First steps for businesses"
      ],
      wordTarget: 250,
      suggestedLinks: []
    }
  ],
  conclusion: {
    summary: "AI will continue to transform industries in 2026. Staying informed and adaptable is key.",
    callToAction: "Start exploring AI tools today to stay ahead of the curve."
  },
  seoKeywords: ["AI trends 2026", "artificial intelligence", "machine learning"]
};

const mockSources: Source[] = [
  {
    title: "AI Market Report 2025",
    url: "https://example.com/ai-market-2025",
    snippet: "The AI market is expected to reach $500B by 2026"
  },
  {
    title: "Machine Learning Advances",
    url: "https://example.com/ml-advances",
    snippet: "New architectures are improving model efficiency"
  }
];

async function testWriterAgent() {
  console.log("=".repeat(80));
  console.log("WRITER AGENT WORD COUNT TEST");
  console.log("=".repeat(80));
  console.log(`Target: 6 sections × 250 words = 1,500 words total`);
  console.log(`Acceptable range: 1,350-1,650 words (±10%)`);
  console.log("=".repeat(80));
  console.log();

  const writerAgent = createWriterAgent();

  const initialState = {
    outline: mockOutline,
    articleType: "blog" as ArticleType,
    tone: "professional yet conversational",
    sources: mockSources,
    allowedInternalLinks: [],
    currentSection: 0,
    sections: [],
    fullArticle: "",
    coverImage: "",
    customInstructions: undefined,
    retryCount: 0
  };

  try {
    console.log("Starting article generation...\n");
    const startTime = Date.now();

    const result = await writerAgent.invoke(initialState, {
      recursionLimit: 100, // Increase from default 25 to handle retries
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Debug: log the result object
    console.log("\nDEBUG - Result keys:", Object.keys(result));
    console.log("DEBUG - Sections array length:", result.sections?.length || 0);
    console.log("DEBUG - Full article length:", result.fullArticle?.length || 0);

    console.log("\n" + "=".repeat(80));
    console.log("RESULTS");
    console.log("=".repeat(80));

    // Count words in each section
    console.log("\nPER-SECTION ANALYSIS:");
    let totalWords = 0;
    result.sections.forEach((section: string, idx: number) => {
      const wordCount = countWords(section);
      const target = mockOutline.sections[idx].wordTarget;
      const deviation = ((wordCount - target) / target * 100).toFixed(1);
      const status = Math.abs(wordCount - target) <= target * 0.15 ? "✓" : "✗";

      totalWords += wordCount;

      console.log(`${status} Section ${idx + 1}: ${wordCount} words (target: ${target}, deviation: ${deviation}%)`);
    });

    // Final article word count
    const finalWordCount = countWords(result.fullArticle);
    const targetTotal = mockOutline.sections.reduce((sum, s) => sum + s.wordTarget, 0);
    const totalDeviation = ((finalWordCount - targetTotal) / targetTotal * 100).toFixed(1);
    const finalStatus = Math.abs(finalWordCount - targetTotal) <= targetTotal * 0.15 ? "✓ PASS" : "✗ FAIL";

    console.log("\nFINAL ARTICLE:");
    console.log(`${finalStatus} Total: ${finalWordCount} words (target: ${targetTotal}, deviation: ${totalDeviation}%)`);
    console.log(`Generation time: ${duration}s`);

    // Save article for inspection
    const fs = require('fs');
    fs.writeFileSync('./test-article-output.md', result.fullArticle);
    console.log('\nFull article saved to: ./test-article-output.md');

    console.log("=".repeat(80));

    // Exit with appropriate code
    const passed = Math.abs(finalWordCount - targetTotal) <= targetTotal * 0.15;
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

function countWords(text: string): number {
  // Strip markdown syntax
  const cleaned = text
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/#{1,6}\s/g, "") // headers
    .replace(/[*_~`]/g, "") // formatting
    .replace(/^\s*[-*+]\s/gm, "") // lists
    .replace(/^\s*\d+\.\s/gm, ""); // numbered lists

  return cleaned.split(/\s+/).filter((word) => word.length > 0).length;
}

// Run test
testWriterAgent();
