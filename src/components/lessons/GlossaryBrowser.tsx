"use client";

import { useMemo, useState } from "react";
import { GlossaryCard, Input, Notice, Stack } from "@/components/ui";
import type { GlossaryEntry } from "@/lib/lessons/types";
import { getMessages } from "@/locales";

export function GlossaryBrowser({ entries }: { entries: GlossaryEntry[] }) {
  const messages = getMessages();
  const t = messages.glossary;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.term.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.slug.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <Stack gap="md">
      <Input
        id="glossary-search"
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {filtered.length === 0 ? (
        <Notice>{t.empty}</Notice>
      ) : (
        <Stack gap="sm">
          {filtered.map((entry) => (
            <GlossaryCard
              key={entry.slug}
              term={entry.term}
              definition={entry.definition}
              analogy={entry.analogy}
              analogyLabel={t.analogyLabel}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
