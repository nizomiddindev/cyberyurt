import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAllServerChallenges,
  readChallengeFileBytes,
  sha256Hex,
  toPublicChallengeDetail,
  verifyFlagHash,
} from "@/lib/ctf/loader";
import { SlidingWindowRateLimiter } from "@/lib/ctf/rate-limit";
import { validateChallenges } from "../../../scripts/validate-challenges.mjs";

describe("CTF Challenges & Security", () => {
  it("loads the 5 original M4 easy challenges plus the promoted ones, covering all 8 categories", () => {
    const challenges = getAllServerChallenges();
    const bySlug = new Map(challenges.map((c) => [c.slug, c]));

    // The 5 Milestone 4 challenges are still there and still easy.
    for (const slug of ["salom-base64", "sezar-shifri", "yashirin-fayl", "log-ichida", "sirli-rasm"]) {
      expect(bySlug.get(slug)?.difficulty).toBe("easy");
    }

    // 2026-11-28: 13 more promoted from drafts. Reverse has none live yet: both
    // Reverse drafts need Python, which the browser terminal does not have.
    expect(challenges).toHaveLength(18);
    const categories = new Set(challenges.map((c) => c.category));
    expect(categories.size).toBe(7);
    expect(categories.has("Reverse")).toBe(false);
    expect(new Set(challenges.map((c) => c.slug)).size).toBe(challenges.length);
  });

  it("passes scripts/validate-challenges (every solve.py matches flag_sha256 and no plaintext flags in git)", () => {
    expect(validateChallenges()).toEqual([]);
  });

  it("strips flag_sha256 and locked hint text before sending to the browser", () => {
    const first = getAllServerChallenges()[0];
    const pub = toPublicChallengeDetail(first, new Set(["h1"]), {
      solved: false,
      pointsAwarded: null,
    });

    expect("flagSha256" in pub).toBe(false);
    expect(pub.hints[0]?.unlocked).toBe(true);
    expect(pub.hints[0]?.text).toBeTruthy();
    expect(pub.hints[1]?.unlocked).toBe(false);
    expect(pub.hints[1]?.text).toBeNull();
  });

  it("verifies flags by SHA-256 hash using synthetic non-production inputs", () => {
    const syntheticValue = "SYNTHETIC_SAMPLE_VALUE_FOR_UNIT_TEST";
    const hash = sha256Hex(syntheticValue);
    expect(verifyFlagHash(syntheticValue, hash)).toBe(true);
    expect(verifyFlagHash(`  ${syntheticValue}  `, hash)).toBe(true);
    expect(verifyFlagHash("WRONG_VALUE", hash)).toBe(false);
  });

  it("prevents pass-the-hash: knowing flag_sha256 alone must not solve a challenge", () => {
    // Submitting the public SHA-256 hash string itself as the flag must always fail
    for (const challenge of getAllServerChallenges()) {
      expect(verifyFlagHash(challenge.flagSha256, challenge.flagSha256)).toBe(
        false,
      );
    }

    // Confirm SQL RPC hashes p_flag inside Postgres rather than accepting a pre-computed hash
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase", "migrations", "003_ctf.sql"),
      "utf-8",
    );
    expect(sql).toContain("p_flag text");
    expect(sql).toContain("extensions.digest(");
    expect(sql).not.toContain("p_submitted_hash");
    expect(sql).toContain(
      "revoke all on function public.submit_ctf_flag(text, text) from public, anon;",
    );

    const routeSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src",
        "app",
        "api",
        "ctf",
        "submit",
        "route.ts",
      ),
      "utf-8",
    );
    expect(routeSource).toContain("p_flag: flag");
    expect(routeSource).not.toContain("p_submitted_hash");
  });

  it("enforces max 5 attempts per 60 seconds per user", () => {
    const limiter = new SlidingWindowRateLimiter(5, 60_000);
    const t0 = 1_700_000_000_000;

    for (let i = 0; i < 5; i++) {
      expect(limiter.checkAndRecord("user-1", t0 + i * 1000).allowed).toBe(
        true,
      );
    }

    const sixth = limiter.checkAndRecord("user-1", t0 + 10_000);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);

    // Different user is unaffected
    expect(limiter.checkAndRecord("user-2", t0 + 10_000).allowed).toBe(true);

    // After 60 seconds the window opens again
    expect(limiter.checkAndRecord("user-1", t0 + 61_000).allowed).toBe(true);
  });

  it("serves only files listed in files/ and blocks path traversal", () => {
    expect(readChallengeFileBytes("salom-base64", "xabar.txt")).not.toBeNull();
    expect(readChallengeFileBytes("salom-base64", "../challenge.yaml")).toBeNull();
    expect(readChallengeFileBytes("salom-base64", "../solve.py")).toBeNull();
    expect(
      readChallengeFileBytes("salom-base64", "../../.flags.local.json"),
    ).toBeNull();
  });
});
