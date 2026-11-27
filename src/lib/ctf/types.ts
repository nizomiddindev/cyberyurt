export const CTF_CATEGORIES = [
  "Kriptografiya",
  "Forensika",
  "Veb",
  "Linux",
  "OSINT",
  "Tarmoq",
  "Reverse",
  "Fishing",
] as const;

export type CtfCategory = (typeof CTF_CATEGORIES)[number];

export type CtfDifficulty = "easy" | "medium" | "hard";

export interface ChallengeHint {
  id: string;
  cost: number;
  text: string;
}

export interface ServerChallenge {
  slug: string;
  categoryFolder: string;
  title: string;
  category: CtfCategory;
  difficulty: CtfDifficulty;
  points: number;
  description: string;
  flagSha256: string;
  hints: ChallengeHint[];
  files: string[];
}

export interface PublicChallengeHint {
  id: string;
  cost: number;
  unlocked: boolean;
  text: string | null;
}

export interface PublicChallengeSummary {
  slug: string;
  title: string;
  category: CtfCategory;
  difficulty: CtfDifficulty;
  points: number;
  solved: boolean;
}

export interface PublicChallengeDetail extends PublicChallengeSummary {
  description: string;
  files: string[];
  hints: PublicChallengeHint[];
  pointsAwarded: number | null;
}
