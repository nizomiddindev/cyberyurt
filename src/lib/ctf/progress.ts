import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface UserCtfState {
  solves: Record<string, number>;
  unlockedHints: Record<string, string[]>;
}

export async function getUserCtfState(
  userId: string | null,
): Promise<UserCtfState> {
  if (!userId) {
    return { solves: {}, unlockedHints: {} };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { solves: {}, unlockedHints: {} };
  }

  const [solvesRes, hintsRes] = await Promise.all([
    supabase
      .from("challenge_solves")
      .select("challenge_slug, points_awarded")
      .eq("user_id", userId),
    supabase
      .from("challenge_hint_unlocks")
      .select("challenge_slug, hint_id")
      .eq("user_id", userId),
  ]);

  const solves: Record<string, number> = {};
  if (!solvesRes.error && solvesRes.data) {
    for (const row of solvesRes.data) {
      solves[String(row.challenge_slug)] = Number(row.points_awarded ?? 0);
    }
  }

  const unlockedHints: Record<string, string[]> = {};
  if (!hintsRes.error && hintsRes.data) {
    for (const row of hintsRes.data) {
      const slug = String(row.challenge_slug);
      const hintId = String(row.hint_id);
      if (!unlockedHints[slug]) unlockedHints[slug] = [];
      unlockedHints[slug].push(hintId);
    }
  }

  return { solves, unlockedHints };
}
