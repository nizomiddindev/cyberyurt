"use client";

import type { ReactNode } from "react";
import { InlineCode, Popover } from "@/components/ui";
import type { GlossaryEntry } from "@/lib/lessons/types";
import { getMessages } from "@/locales";

export interface RichTextProps {
  text: string;
  glossary: Record<string, GlossaryEntry>;
  firstUseSlugs: Set<string>;
}

const TOKEN_REGEX =
  /(\[\[[a-z0-9-]+(?:\|[^\]]+)?\]\]|\*\*[^*]+\*\*|`[^`]+`)/g;

export function renderRichTextTokens(
  text: string,
  glossary: Record<string, GlossaryEntry>,
  seenSlugs: Set<string>,
  closeLabel: string,
  analogyLabel: string,
): ReactNode[] {
  const parts = text.split(TOKEN_REGEX);
  const nodes: ReactNode[] = [];

  parts.forEach((part, index) => {
    if (!part) return;

    if (part.startsWith("[[") && part.endsWith("]]")) {
      const inner = part.slice(2, -2);
      const [slug, customLabel] = inner.split("|");
      const entry = glossary[slug];
      const displayLabel = customLabel ?? entry?.term ?? slug;

      if (entry && !seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        nodes.push(
          <Popover
            key={`gloss-${slug}-${index}`}
            trigger={displayLabel}
            closeLabel={closeLabel}
          >
            <strong>{entry.term}</strong>
            <br />
            {entry.definition}
            {entry.analogy ? (
              <>
                <br />
                <span>
                  {analogyLabel}: {entry.analogy}
                </span>
              </>
            ) : null}
          </Popover>,
        );
      } else {
        nodes.push(<span key={`txt-${index}`}>{displayLabel}</span>);
      }
      return;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={`b-${index}`}>{part.slice(2, -2)}</strong>);
      return;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(<InlineCode key={`c-${index}`}>{part.slice(1, -1)}</InlineCode>);
      return;
    }

    nodes.push(<span key={`t-${index}`}>{part}</span>);
  });

  return nodes;
}

export function RichText({ text, glossary, firstUseSlugs }: RichTextProps) {
  const messages = getMessages();
  return (
    <>
      {renderRichTextTokens(
        text,
        glossary,
        firstUseSlugs,
        messages.ui.close,
        messages.glossary.analogyLabel,
      )}
    </>
  );
}
