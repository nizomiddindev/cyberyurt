import { getAllServerChallenges } from "@/lib/ctf/loader";
import type { CtfCategory } from "@/lib/ctf/types";
import {
  calculateLevel,
  computeBadges,
  computeCategoryStats,
  type BadgeId,
} from "@/lib/gamification/xp";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/validation/username";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  xp: number;
  solvesCount: number;
}

export interface PublicProfileData {
  username: string;
  level: number;
  xp: number;
  solvesCount: number;
  badges: BadgeId[];
  categoryStats: Record<CtfCategory, number>;
  createdAt: string;
}

interface RawLeaderboardRow {
  rank_num: number | string;
  username: string;
  level: number;
  xp: number;
  solves_count: number | string;
}

function mapLeaderboardRows(rows: unknown): LeaderboardEntry[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw) => {
    const row = raw as RawLeaderboardRow;
    return {
      rank: Number(row.rank_num ?? 0),
      username: String(row.username ?? ""),
      level: Number(row.level ?? 1),
      xp: Number(row.xp ?? 0),
      solvesCount: Number(row.solves_count ?? 0),
    };
  });
}

export async function getLeaderboardOverall(
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_leaderboard_overall", {
    p_limit: limit,
  });

  if (error) return [];
  return mapLeaderboardRows(data);
}

export async function getLeaderboardWeekly(
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_leaderboard_weekly", {
    p_limit: limit,
  });

  if (error) return [];
  return mapLeaderboardRows(data);
}

export async function getLeaderboardClass(
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_leaderboard_class", {
    p_limit: limit,
  });

  if (error) return [];
  return mapLeaderboardRows(data);
}

export async function getPublicProfileData(
  rawUsername: string,
): Promise<PublicProfileData | null> {
  const check = validateUsername(rawUsername);
  if (!check.valid) return null;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const challenges = getAllServerChallenges();

  // Prefer M6 RPC returning username, level, xp, solves_count, solved_slugs, created_at
  const { data, error } = await supabase.rpc("get_public_profile_stats", {
    target_username: check.normalized,
  });

  if (!error && Array.isArray(data) && data.length > 0) {
    const row = data[0] as {
      username: string;
      level: number;
      xp: number;
      solves_count: number | string;
      solved_slugs: string[] | null;
      created_at: string;
    };
    const solvedSlugs = Array.isArray(row.solved_slugs) ? row.solved_slugs : [];
    const xp = Number(row.xp ?? 0);
    return {
      username: String(row.username),
      level: Number(row.level ?? calculateLevel(xp)),
      xp,
      solvesCount: Number(row.solves_count ?? solvedSlugs.length),
      badges: computeBadges(solvedSlugs, challenges),
      categoryStats: computeCategoryStats(solvedSlugs, challenges),
      createdAt: String(row.created_at ?? ""),
    };
  }

  // Graceful fallback to M1's get_public_profile if 004_xp_leaderboard.sql isn't run yet
  const fallback = await supabase.rpc("get_public_profile", {
    target_username: check.normalized,
  });

  if (
    !fallback.error &&
    Array.isArray(fallback.data) &&
    fallback.data.length > 0
  ) {
    const row = fallback.data[0] as {
      username: string;
      level: number;
      xp: number;
      created_at: string;
    };
    const xp = Number(row.xp ?? 0);
    return {
      username: String(row.username),
      level: Number(row.level ?? calculateLevel(xp)),
      xp,
      solvesCount: 0,
      badges: [],
      categoryStats: computeCategoryStats([], challenges),
      createdAt: String(row.created_at ?? ""),
    };
  }

  return null;
}
