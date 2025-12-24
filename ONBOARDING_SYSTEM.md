# Personalized Onboarding System - Implementation Guide

## Overview

This onboarding system creates a **highly personalized experience** for each user based on their industry and interests. Users answer 3 smart questions, get automatically placed into the right industry, select 6 subcategories, and their entire dashboard gets customized to their needs.

## What's Been Built

### 1. **Industry & Subcategory Mapping** (`lib/onboarding-config.ts`)

**12 Industries** (expanded from 6):
- AI & Machine Learning
- Technology & Software
- Health & Wellness
- Finance & Fintech
- Marketing & Business
- E-commerce & Retail
- Education & E-learning
- Lifestyle & Personal Development
- Food & Cooking
- Climate & Sustainability
- Crypto & Web3
- Real Estate

**6 Subcategories Per Industry**:
- Each industry has 6 carefully curated subcategories
- Users select their specific focus areas
- Examples:
  - **AI & ML**: AI Agents, LLMs, Computer Vision, AI Providers, MLOps, Generative AI
  - **Health**: Women's Health, Nutrition, Mental Health, Health Tech, Biotech, Fitness
  - **Marketing**: Content Marketing, Social Media, Email Marketing, SEO, Paid Ads, Analytics

### 2. **Smart Questionnaire** (3 Questions)

**Question 1: Primary Goal**
- 11 options covering all industries
- E.g., "Build a tech/software blog", "Share health/wellness content", etc.

**Question 2: Content Focus** (Multi-select)
- 13 specific topic options
- Users can select multiple interests
- E.g., "AI/ML topics", "Mental health", "Dropshipping", etc.

**Question 3: Target Audience**
- 10 audience options
- E.g., "Tech professionals", "Health consumers", "Business owners", etc.

**Intelligent Scoring System**:
- Each answer has weighted scores for industries
- Algorithm automatically determines best-fit primary industry
- Example: Selecting "AI/ML topics" gives +8 to AI & ML industry, +2 to Technology

### 3. **Database Schema**

**`user_preferences` Table**:
```sql
- id (UUID)
- user_id (FK to auth.users)
- onboarding_completed (boolean)
- onboarding_answers (JSONB) - Stores quiz responses
- onboarded_at (timestamp)
- primary_industry (text) - e.g., "ai-ml", "health"
- selected_subcategories (text[]) - User's 6 focus areas
- custom_keywords (text[]) - Additional keywords they added
- created_at / updated_at
```

**Row Level Security**: Users can only access their own preferences.

### 4. **API Routes** (`app/api/user/preferences/route.ts`)

**GET** `/api/user/preferences`
- Fetch user's saved preferences
- Returns `hasCompletedOnboarding` flag

**POST** `/api/user/preferences`
- Save onboarding responses
- Auto-determines primary industry from answers
- Creates/updates user preferences

**PATCH** `/api/user/preferences`
- Update specific fields (e.g., subcategories, keywords)

**DELETE** `/api/user/preferences`
- Reset onboarding status
- Allows user to retake questionnaire

### 5. **Onboarding UI** (`components/onboarding/OnboardingFlow.tsx`)

**Multi-step flow**:
1. **Question Steps** (1-3): Beautiful card-based selection
2. **Subcategory Selection**: Grid of 6 subcategories to choose from
3. **Review Step**: Summary of personalization settings

**Features**:
- Progress bar showing current step
- Smooth animations between steps
- "Skip for now" option
- Validation before proceeding
- Custom keywords input
- Limit of 6 subcategory selections

**Visual Design**:
- Dark theme with gradient background
- Blue accents for selected items
- Checkmarks for confirmation
- Responsive grid layout
- Accessible keyboard navigation

## How to Integrate

### Step 1: Run Database Migration

```bash
# Apply the migration to create user_preferences table
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20260101000000_add_user_preferences.sql

# Or if using Supabase CLI:
supabase db push
```

### Step 2: Add Onboarding to Your App

**Option A: Show on first login** (Recommended)

In your layout or auth callback page:

```typescript
"use client";

import { useEffect, useState } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkOnboarding() {
      const res = await fetch("/api/user/preferences");
      const data = await res.json();

      if (!data.hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }

    checkOnboarding();
  }, []);

  const handleOnboardingComplete = async (answers, industry, subcategories) => {
    const keywordsArray = []; // Get from answers if needed

    await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboardingAnswers: answers,
        primaryIndustry: industry,
        selectedSubcategories: subcategories,
        customKeywords: keywordsArray,
      }),
    });

    setShowOnboarding(false);
    router.refresh(); // Reload to apply personalization
  };

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  return <>{children}</>;
}
```

### Step 3: Use Preferences Throughout Your App

**Fetch preferences in server components**:

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  const primaryIndustry = preferences?.primary_industry || "technology";

  // Use industry to customize UI
}
```

**Get personalized placeholders**:

```typescript
import { getPlaceholderForIndustry, getSubcategoriesForIndustry } from "@/lib/onboarding-config";

const researchPlaceholder = getPlaceholderForIndustry(primaryIndustry, "research");
// For health industry: "Latest nutrition trends for 2026"
// For tech industry: "Best React frameworks for 2026"

const subcategories = getSubcategoriesForIndustry(primaryIndustry);
// Returns 6 subcategories for that industry
```

### Step 4: Personalize Your Dashboard

**Update keyword suggestions**:

```typescript
import { getSubcategoriesForIndustry } from "@/lib/onboarding-config";

function KeywordSuggestions({ industry, userSubcategories }) {
  const allSubcategories = getSubcategoriesForIndustry(industry);

  // Filter to user's selected subcategories
  const selectedSubs = allSubcategories.filter(sub =>
    userSubcategories.includes(sub.id)
  );

  // Show their keywords as quick-select options
  return (
    <div className="grid grid-cols-3 gap-2">
      {selectedSubs.map(sub => (
        <button key={sub.id} className="...">
          {sub.name}
        </button>
      ))}
    </div>
  );
}
```

**Update placeholder text**:

```typescript
<input
  placeholder={getPlaceholderForIndustry(primaryIndustry, "customPrompt")}
  // Health: "Benefits of Mediterranean diet for heart health"
  // Tech: "Explain microservices architecture for beginners"
/>
```

**Filter categories**:

```typescript
// Show only user's industry subcategories instead of all industries
function CategorySelector({ preferences }) {
  const subcategories = getSubcategoriesForIndustry(preferences.primary_industry);

  return (
    <select>
      {subcategories.map(sub => (
        <option key={sub.id} value={sub.id}>{sub.name}</option>
      ))}
    </select>
  );
}
```

### Step 5: Add Settings Page for Re-onboarding

Create `app/settings/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleRetakeOnboarding = async () => {
    // Reset onboarding status
    await fetch("/api/user/preferences", { method: "DELETE" });
    setShowOnboarding(true);
  };

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={async (answers, industry, subcategories) => {
          await fetch("/api/user/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              onboardingAnswers: answers,
              primaryIndustry: industry,
              selectedSubcategories: subcategories,
            }),
          });
          setShowOnboarding(false);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div>
      <h1>Settings</h1>
      <Button onClick={handleRetakeOnboarding}>
        Retake Onboarding Quiz
      </Button>
    </div>
  );
}
```

## Key Benefits

### 1. **Highly Relevant Experience**
- Users only see keywords/categories for their industry
- Placeholder text matches their interests
- No clutter from irrelevant industries

### 2. **Flexibility Maintained**
- Users can still write about ANYTHING via prompts
- Keyword input still accepts any topic
- Personalization is for UI convenience, not restriction

### 3. **Smart Categorization**
- Weighted scoring ensures accurate industry placement
- Multi-select questions capture nuanced interests
- Fallback to "Technology" if no clear match

### 4. **Easy Re-configuration**
- Users can retake quiz anytime
- Settings page allows manual adjustments
- Preferences update seamlessly

## Examples by Industry

### Health & Wellness User

**Onboarding Answers**:
- Goal: "Share health, wellness, or fitness content"
- Topics: "Mental health", "Nutrition/diet/fitness"
- Audience: "Health-conscious individuals"

**Result**:
- Primary Industry: **Health & Wellness**
- Subcategories: Women's Health, Nutrition, Mental Health, Fitness (user selects 4-6)
- Research placeholder: "Latest nutrition trends for 2026"
- Custom prompt placeholder: "Benefits of Mediterranean diet for heart health"

**Dashboard View**:
- Quick-select keywords: "Women's Health", "Nutrition & Diet", "Mental Health", "Fitness"
- NO "AI Agents", "Blockchain", or other irrelevant categories
- Clean, focused experience

### E-commerce User

**Onboarding Answers**:
- Goal: "Promote e-commerce or online retail"
- Topics: "Dropshipping", "SEO/content marketing"
- Audience: "Online sellers"

**Result**:
- Primary Industry: **E-commerce & Retail**
- Subcategories: Shopify, Dropshipping, Amazon FBA, Conversion Optimization
- Research placeholder: "Best Shopify apps for 2026"
- Custom prompt placeholder: "Compare Shopify vs WooCommerce"

**Dashboard View**:
- Quick-select keywords: "Dropshipping", "Amazon FBA", "Conversion Optimization"
- Prompt suggestions tailored to e-commerce

### AI & ML User (Your Original Use Case)

**Onboarding Answers**:
- Goal: "Build a tech/software blog"
- Topics: "AI/ML/LLMs", "Software development"
- Audience: "Tech professionals"

**Result**:
- Primary Industry: **AI & Machine Learning**
- Subcategories: AI Agents, LLMs, Computer Vision, AI Providers
- Research placeholder: "Latest breakthroughs in large language models"
- Custom prompt placeholder: "Write about the impact of GPT-5 on software development"

**Dashboard View**:
- Quick-select keywords: "AI Agents", "LLMs", "Generative AI"
- Exactly what you have now, but ONLY for AI-focused users

## Next Steps

1. **Run migration** to create `user_preferences` table
2. **Add onboarding check** to your dashboard layout (show OnboardingFlow if not completed)
3. **Update dashboard** to use personalized subcategories and placeholders
4. **Add settings page** with "Retake Onboarding" button
5. **Test the flow** with different industries to see personalization in action

## Future Enhancements

- **Industry-specific article templates** (e.g., recipe structure for Food, case studies for Marketing)
- **Recommended article types** by industry (listicles for Lifestyle, tutorials for Tech)
- **Tone suggestions** based on industry (casual for Food, formal for Finance)
- **Auto-populate sources** from industry-specific publications
- **Community features** - connect users in the same industry

---

## Files Created

1. `lib/onboarding-config.ts` - Industry mapping, questionnaire, helper functions
2. `app/api/user/preferences/route.ts` - API for managing preferences
3. `components/onboarding/OnboardingFlow.tsx` - Beautiful onboarding UI
4. `supabase/migrations/20260101000000_add_user_preferences.sql` - Database schema

**Total LOC**: ~1,500 lines
**Industries**: 12 (vs 6 before)
**Subcategories**: 72 total (6 per industry)
**Questions**: 3 smart questions with weighted scoring

You now have a **production-ready, intelligent onboarding system** that makes your app feel personalized to every user! 🎉
