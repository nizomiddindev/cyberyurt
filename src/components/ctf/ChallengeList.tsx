"use client";

import { useMemo, useState } from "react";
import { ChallengeRow, FilterButton, Notice, Stack } from "@/components/ui";
import {
  CTF_CATEGORIES,
  type CtfCategory,
  type CtfDifficulty,
  type PublicChallengeSummary,
} from "@/lib/ctf/types";
import { getMessages } from "@/locales";

export function ChallengeList({
  challenges,
}: {
  challenges: PublicChallengeSummary[];
}) {
  const messages = getMessages();
  const t = messages.ctf;

  const [selectedCategory, setSelectedCategory] = useState<CtfCategory | "all">(
    "all",
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    CtfDifficulty | "all"
  >("all");

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      if (selectedCategory !== "all" && c.category !== selectedCategory) {
        return false;
      }
      if (selectedDifficulty !== "all" && c.difficulty !== selectedDifficulty) {
        return false;
      }
      return true;
    });
  }, [challenges, selectedCategory, selectedDifficulty]);

  const difficulties: (CtfDifficulty | "all")[] = [
    "all",
    "easy",
    "medium",
    "hard",
  ];

  return (
    <Stack gap="md">
      <Stack direction="row" gap="sm">
        <FilterButton
          label={t.allCategories}
          active={selectedCategory === "all"}
          onClick={() => setSelectedCategory("all")}
        />
        {CTF_CATEGORIES.map((category) => (
          <FilterButton
            key={category}
            label={category}
            active={selectedCategory === category}
            onClick={() => setSelectedCategory(category)}
          />
        ))}
      </Stack>

      <Stack direction="row" gap="sm">
        {difficulties.map((diff) => (
          <FilterButton
            key={diff}
            label={t.difficulty[diff]}
            active={selectedDifficulty === diff}
            onClick={() => setSelectedDifficulty(diff)}
          />
        ))}
      </Stack>

      {filtered.length === 0 ? (
        <Notice>{t.empty}</Notice>
      ) : (
        <Stack gap="sm">
          {filtered.map((challenge) => (
            <ChallengeRow
              key={challenge.slug}
              href={`/mashq/${challenge.slug}`}
              title={challenge.title}
              category={challenge.category}
              difficultyLabel={t.difficulty[challenge.difficulty]}
              pointsLabel={`${challenge.points} ${t.pointsUnit}`}
              solved={challenge.solved}
              solvedLabel={t.solved}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
