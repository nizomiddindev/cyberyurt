import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllServerChallenges } from "@/lib/ctf/loader";
import {
  calculateLevel,
  computeBadges,
  computeCategoryStats,
  getLevelProgress,
  XP_PER_LEVEL,
} from "@/lib/gamification/xp";

describe("XP, levels, badges, and category stats", () => {
  it("calculates levels deterministically every 200 XP starting at level 1", () => {
    expect(XP_PER_LEVEL).toBe(200);
    expect(calculateLevel(-10)).toBe(1);
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(199)).toBe(1);
    expect(calculateLevel(200)).toBe(2);
    expect(calculateLevel(450)).toBe(3);

    expect(getLevelProgress(250)).toEqual({
      level: 2,
      xp: 250,
      xpIntoLevel: 50,
      xpForNextLevel: 200,
    });
  });

  it("computes badges and per-category stats strictly from verified solved slugs", () => {
    const challenges = getAllServerChallenges();

    expect(computeBadges([], challenges)).toEqual([]);

    const oneCrypto = computeBadges(["salom-base64"], challenges);
    expect(oneCrypto).toEqual(["first-flag", "crypto-starter"]);

    const allSlugs = challenges.map((c) => c.slug);
    const allBadges = computeBadges(allSlugs, challenges);
    expect(allBadges).toEqual([
      "first-flag",
      "crypto-starter",
      "linux-starter",
      "forensics-starter",
      "five-solves",
    ]);

    const stats = computeCategoryStats(allSlugs, challenges);
    expect(stats.Kriptografiya).toBe(2);
    expect(stats.Linux).toBe(2);
    expect(stats.Forensika).toBe(1);
    expect(stats.Veb).toBe(0);
  });
});

describe("Milestone 6 SQL privacy & security invariants", () => {
  const rawSql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "004_xp_leaderboard.sql"),
    "utf-8",
  );
  const sql = rawSql.replace(/--.*$/gm, "");

  it("never adds broad SELECT policies on profiles and never returns PII columns", () => {
    expect(sql.toLowerCase()).not.toContain("create policy");
    expect(sql.toLowerCase()).not.toContain("display_name");
    expect(sql.toLowerCase()).not.toContain("email");
    expect(sql.toLowerCase()).not.toContain("school");
  });

  it("keeps Sinfim class leaderboard restricted to authenticated students in viewer's own class", () => {
    expect(sql).toContain("where p.role = 'student'");
    expect(sql).toContain(
      "revoke all on function public.get_leaderboard_class(integer) from public, anon;",
    );
    expect(sql).toContain(
      "grant execute on function public.get_leaderboard_class(integer) to authenticated;",
    );
  });

  it("updates profiles.level atomically inside submit_ctf_flag and never awards XP from lesson_progress", () => {
    expect(sql).toContain("level = public.calculate_level(xp + v_awarded)");
    expect(sql).toContain("extensions.digest(");
    expect(sql.toLowerCase()).not.toContain("lesson_progress");
  });
});
