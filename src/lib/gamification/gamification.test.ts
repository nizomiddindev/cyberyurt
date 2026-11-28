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
    for (const [category, count] of Object.entries(stats)) {
      expect(count).toBe(challenges.filter((c) => c.category === category).length);
    }

    // Only verified (known) slugs count; unknown ones are ignored.
    const withJunk = computeCategoryStats(["salom-base64", "not-a-real-slug"], challenges);
    expect(withJunk.Kriptografiya).toBe(1);
    expect(Object.values(withJunk).reduce((a, b) => a + b, 0)).toBe(1);
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

describe("005: class_name locked for the pilot (no classes)", () => {
  const sql = fs
    .readFileSync(
      path.join(process.cwd(), "supabase", "migrations", "005_lock_class_name.sql"),
      "utf-8",
    )
    .replace(/--.*$/gm, "");

  it("blocks students from setting class_name on insert and update", () => {
    expect(sql).toContain("new.class_name := null;");
    expect(sql).toContain("new.class_name is distinct from old.class_name");
    expect(sql).toContain("if current_user not in ('anon', 'authenticated')");
  });

  it("keeps role, xp, level and created_at locked as in 001", () => {
    for (const column of ["role", "xp", "level", "created_at"]) {
      expect(sql).toContain(`new.${column} is distinct from old.${column}`);
    }
  });

  it("closes the class leaderboard function to every client role", () => {
    expect(sql).toContain(
      "revoke all on function public.get_leaderboard_class(integer) from public, anon, authenticated;",
    );
    expect(sql.toLowerCase()).not.toContain("grant execute");
  });
});
