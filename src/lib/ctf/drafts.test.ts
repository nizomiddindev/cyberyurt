import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { CTF_CATEGORIES } from "@/lib/ctf/types";
import { validateChallenges } from "../../../scripts/validate-challenges.mjs";

const DRAFTS_DIR = path.join(process.cwd(), "content", "challenges-draft");

function readAllDraftYamls(): { file: string; raw: string; data: Record<string, unknown> }[] {
  const results: { file: string; raw: string; data: Record<string, unknown> }[] = [];
  for (const cat of fs.readdirSync(DRAFTS_DIR, { withFileTypes: true })) {
    if (!cat.isDirectory() || cat.name.startsWith(".")) continue;
    const catPath = path.join(DRAFTS_DIR, cat.name);
    for (const slug of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!slug.isDirectory() || slug.name.startsWith(".")) continue;
      const yamlPath = path.join(catPath, slug.name, "challenge.yaml");
      if (!fs.existsSync(yamlPath)) continue;
      const raw = fs.readFileSync(yamlPath, "utf-8");
      results.push({
        file: path.relative(DRAFTS_DIR, yamlPath),
        raw,
        data: YAML.parse(raw) as Record<string, unknown>,
      });
    }
  }
  return results;
}

describe("CTF Draft Challenges (content/challenges-draft/)", () => {
  it("passes validateChallenges on all 16 draft challenges (solve.py hash match + zero plaintext flags)", () => {
    expect(validateChallenges(DRAFTS_DIR)).toEqual([]);
  });

  it("covers all 8 categories (2 each) with balanced easy/medium/hard difficulty and Uzbek U+2018 typography", () => {
    const drafts = readAllDraftYamls();
    expect(drafts).toHaveLength(16);

    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};

    for (const item of drafts) {
      const cat = String(item.data.category ?? "");
      const diff = String(item.data.difficulty ?? "");
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      byDifficulty[diff] = (byDifficulty[diff] ?? 0) + 1;
      expect(item.raw).not.toMatch(/[oOgG]'/);
    }

    for (const category of CTF_CATEGORIES) {
      expect(byCategory[category]).toBe(2);
    }
    expect(byDifficulty.easy).toBe(6);
    expect(byDifficulty.medium).toBe(6);
    expect(byDifficulty.hard).toBe(4);
  });
});
