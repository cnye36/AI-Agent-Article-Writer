import { useState, useEffect, useCallback } from "react";

export interface UserPreferences {
  id: string;
  userId: string;
  onboardingCompleted: boolean;
  onboardingAnswers: Record<string, string | string[]>;
  primaryIndustry: string;
  selectedSubcategories: string[];
  customKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/user/preferences");
      const data = await res.json();

      if (data.preferences) {
        setPreferences(data.preferences);
      } else {
        setPreferences(null);
      }
    } catch (err) {
      console.error("Error fetching preferences:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch preferences");
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update preferences");
      }

      if (data.preferences) {
        setPreferences(data.preferences);
      }

      return data.preferences;
    } catch (err) {
      console.error("Error updating preferences:", err);
      setError(err instanceof Error ? err.message : "Failed to update preferences");
      throw err;
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      const res = await fetch("/api/user/preferences", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset onboarding");
      }

      setPreferences(null);
      return true;
    } catch (err) {
      console.error("Error resetting onboarding:", err);
      setError(err instanceof Error ? err.message : "Failed to reset onboarding");
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    refetch: fetchPreferences,
    updatePreferences,
    resetOnboarding,
  };
}
