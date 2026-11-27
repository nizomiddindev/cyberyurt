import type { CtfCategory, ServerChallenge } from "@/lib/ctf/types";

export const XP_PER_LEVEL = 200;

export function calculateLevel(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(safeXp / XP_PER_LEVEL) + 1;
}

export interface LevelProgress {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = calculateLevel(safeXp);
  const xpIntoLevel = safeXp % XP_PER_LEVEL;
  return {
    level,
    xp: safeXp,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
  };
}

export type BadgeId =
  | "first-flag"
  | "crypto-starter"
  | "linux-starter"
  | "forensics-starter"
  | "five-solves";

export function computeCategoryStats(
  solvedSlugs: readonly string[],
  challenges: readonly Pick<ServerChallenge, "slug" | "category">[],
): Record<CtfCategory, number> {
  const counts: Record<CtfCategory, number> = {
    Kriptografiya: 0,
    Forensika: 0,
    Veb: 0,
    Linux: 0,
    OSINT: 0,
    Tarmoq: 0,
    Reverse: 0,
    Fishing: 0,
  };

  const slugToCategory = new Map<string, CtfCategory>();
  for (const ch of challenges) {
    slugToCategory.set(ch.slug, ch.category);
  }

  const uniqueSlugs = new Set(solvedSlugs);
  for (const slug of uniqueSlugs) {
    const category = slugToCategory.get(slug);
    if (category) {
      counts[category]++;
    }
  }

  return counts;
}

export function computeBadges(
  solvedSlugs: readonly string[],
  challenges: readonly Pick<ServerChallenge, "slug" | "category">[],
): BadgeId[] {
  const uniqueCount = new Set(solvedSlugs).size;
  const stats = computeCategoryStats(solvedSlugs, challenges);
  const badges: BadgeId[] = [];

  if (uniqueCount >= 1) badges.push("first-flag");
  if (stats.Kriptografiya >= 1) badges.push("crypto-starter");
  if (stats.Linux >= 1) badges.push("linux-starter");
  if (stats.Forensika >= 1) badges.push("forensics-starter");
  if (uniqueCount >= 5) badges.push("five-solves");

  return badges;
}
