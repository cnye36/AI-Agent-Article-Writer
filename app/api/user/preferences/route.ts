import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { determineIndustryFromAnswers } from "@/lib/onboarding-config";

// Request validation schema
const PreferencesSchema = z.object({
  onboardingAnswers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  primaryIndustry: z.string().optional(),
  selectedSubcategories: z.array(z.string()).optional(),
  customKeywords: z.array(z.string()).optional(),
});

// GET - Fetch user preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch preferences
    const { data: preferences, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is okay for first-time users
      throw error;
    }

    return NextResponse.json({
      success: true,
      preferences: preferences || null,
      hasCompletedOnboarding: preferences?.onboarding_completed || false,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch preferences",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Save onboarding responses and create/update preferences
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = PreferencesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { onboardingAnswers, primaryIndustry, selectedSubcategories, customKeywords } =
      validationResult.data;

    // Determine primary industry from answers if not provided
    let determinedIndustry = primaryIndustry;
    if (onboardingAnswers && !primaryIndustry) {
      determinedIndustry = determineIndustryFromAnswers(onboardingAnswers as Record<string, string | string[]>);
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const preferencesData = {
      user_id: user.id,
      onboarding_completed: true,
      onboarding_answers: onboardingAnswers || {},
      onboarded_at: new Date().toISOString(),
      primary_industry: determinedIndustry || "technology",
      selected_subcategories: selectedSubcategories || [],
      custom_keywords: customKeywords || [],
    };

    let savedPreferences;

    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from("user_preferences")
        .update(preferencesData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      savedPreferences = data;
    } else {
      // Insert new preferences
      const { data, error } = await supabase
        .from("user_preferences")
        .insert(preferencesData)
        .select()
        .single();

      if (error) throw error;
      savedPreferences = data;
    }

    return NextResponse.json({
      success: true,
      preferences: savedPreferences,
      message: "Preferences saved successfully",
    });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return NextResponse.json(
      {
        error: "Failed to save preferences",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update specific preference fields
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = PreferencesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Only update provided fields
    const updateData: any = {};
    if (updates.primaryIndustry) updateData.primary_industry = updates.primaryIndustry;
    if (updates.selectedSubcategories) updateData.selected_subcategories = updates.selectedSubcategories;
    if (updates.customKeywords) updateData.custom_keywords = updates.customKeywords;
    if (updates.onboardingAnswers) updateData.onboarding_answers = updates.onboardingAnswers;

    const { data: updatedPreferences, error } = await supabase
      .from("user_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      {
        error: "Failed to update preferences",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Reset onboarding (allows user to retake questionnaire)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reset onboarding status but keep the preferences record
    const { data, error } = await supabase
      .from("user_preferences")
      .update({
        onboarding_completed: false,
        onboarding_answers: {},
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Onboarding reset successfully. You can now retake the questionnaire.",
    });
  } catch (error) {
    console.error("Error resetting onboarding:", error);
    return NextResponse.json(
      {
        error: "Failed to reset onboarding",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
