import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type {
  ChallengeHint,
  CtfCategory,
  CtfDifficulty,
  PublicChallengeDetail,
  ServerChallenge,
} from "@/lib/ctf/types";

const CHALLENGES_ROOT = path.join(process.cwd(), "content", "challenges");

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function verifyFlagHash(
  submittedFlag: string,
  expectedSha256: string,
): boolean {
  const actualHex = sha256Hex(submittedFlag.trim());
  const actualBuf = Buffer.from(actualHex, "hex");
  const expectedBuf = Buffer.from(expectedSha256, "hex");
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function getAllServerChallenges(): ServerChallenge[] {
  if (!fs.existsSync(CHALLENGES_ROOT)) return [];

  const challenges: ServerChallenge[] = [];

  for (const catEntry of fs.readdirSync(CHALLENGES_ROOT, {
    withFileTypes: true,
  })) {
    if (!catEntry.isDirectory() || catEntry.name.startsWith(".")) continue;
    const catDir = path.join(CHALLENGES_ROOT, catEntry.name);

    for (const slugEntry of fs.readdirSync(catDir, { withFileTypes: true })) {
      if (!slugEntry.isDirectory() || slugEntry.name.startsWith(".")) continue;
      const challengeDir = path.join(catDir, slugEntry.name);
      const yamlPath = path.join(challengeDir, "challenge.yaml");
      if (!fs.existsSync(yamlPath)) continue;

      const raw = fs.readFileSync(yamlPath, "utf-8");
      const data = YAML.parse(raw) as Record<string, unknown>;
      const filesDir = path.join(challengeDir, "files");
      const files = fs.existsSync(filesDir)
        ? fs
            .readdirSync(filesDir)
            .filter((name) =>
              fs.statSync(path.join(filesDir, name)).isFile(),
            )
            .sort()
        : [];

      const rawHints = Array.isArray(data.hints) ? data.hints : [];
      const hints: ChallengeHint[] = rawHints.map((h) => {
        const obj = h as Record<string, unknown>;
        return {
          id: String(obj.id ?? ""),
          cost: Number(obj.cost ?? 0),
          text: String(obj.text ?? ""),
        };
      });

      challenges.push({
        slug: String(data.slug ?? slugEntry.name),
        categoryFolder: catEntry.name,
        title: String(data.title ?? slugEntry.name),
        category: String(data.category ?? "Linux") as CtfCategory,
        difficulty: String(data.difficulty ?? "easy") as CtfDifficulty,
        points: Number(data.points ?? 100),
        description: String(data.description ?? ""),
        flagSha256: String(data.flag_sha256 ?? ""),
        hints,
        files,
      });
    }
  }

  challenges.sort(
    (a, b) =>
      a.category.localeCompare(b.category, "uz") ||
      a.points - b.points ||
      a.title.localeCompare(b.title, "uz"),
  );

  return challenges;
}

export function getServerChallengeBySlug(slug: string): ServerChallenge | null {
  return getAllServerChallenges().find((c) => c.slug === slug) ?? null;
}

export function readChallengeFileBytes(
  slug: string,
  fileName: string,
): Uint8Array | null {
  const challenge = getServerChallengeBySlug(slug);
  if (!challenge) return null;

  // Allow ONLY files explicitly listed in the challenge's files/ directory
  if (!challenge.files.includes(fileName)) {
    return null;
  }

  const fullPath = path.join(
    CHALLENGES_ROOT,
    challenge.categoryFolder,
    challenge.slug,
    "files",
    fileName,
  );
  if (!fs.existsSync(fullPath)) return null;
  return new Uint8Array(fs.readFileSync(fullPath));
}

export function toPublicChallengeDetail(
  challenge: ServerChallenge,
  unlockedHintIds: Set<string>,
  solvedInfo: { solved: boolean; pointsAwarded: number | null },
): PublicChallengeDetail {
  return {
    slug: challenge.slug,
    title: challenge.title,
    category: challenge.category,
    difficulty: challenge.difficulty,
    points: challenge.points,
    description: challenge.description,
    files: challenge.files,
    solved: solvedInfo.solved,
    pointsAwarded: solvedInfo.pointsAwarded,
    hints: challenge.hints.map((hint) => {
      const unlocked = unlockedHintIds.has(hint.id);
      return {
        id: hint.id,
        cost: hint.cost,
        unlocked,
        text: unlocked ? hint.text : null,
      };
    }),
  };
}
