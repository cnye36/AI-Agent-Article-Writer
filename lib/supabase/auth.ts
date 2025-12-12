import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if user is authenticated
 * Returns null if user is not authenticated
 */
export async function requireAuth(
  supabase: SupabaseClient
): Promise<{ user: { id: string } } | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return { user: { id: user.id } };
}
