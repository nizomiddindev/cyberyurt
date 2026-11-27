"use client";

import type { FormEvent, ReactNode } from "react";
import { CornerDownLeft, PlayCircle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

export interface CommandBarProps {
  prompt: string;
  value: string;
  placeholder: string;
  ariaLabel: string;
  submitLabel: string;
  feedback?: string | null;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CommandBar({
  prompt,
  value,
  placeholder,
  ariaLabel,
  submitLabel,
  feedback,
  onChange,
  onSubmit,
}: CommandBarProps) {
  return (
    <div className="animate-rise rounded-2xl border border-line bg-deep p-2 transition-colors focus-within:border-accent/60">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
      >
        <span className="shrink-0 pl-2 font-mono text-sm font-medium text-accent">
          {prompt}
        </span>
        <input
          type="text"
          aria-label={ariaLabel}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 py-2 font-mono text-sm text-ink caret-accent placeholder:text-ink-subtle focus-visible:outline-none"
        />
        <Button type="submit" variant="secondary" aria-label={submitLabel}>
          <CornerDownLeft size={16} aria-hidden="true" />
          <span>{submitLabel}</span>
        </Button>
      </form>
      {feedback ? (
        <p
          role="status"
          key={feedback}
          className="animate-rise px-2 pb-1 pt-2 font-mono text-xs text-ink-muted"
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
  );
}

export function ContinueCard({
  sectionTitle,
  lessonTitle,
  completedTasks,
  totalTasks,
  buttonLabel,
  href,
}: {
  sectionTitle: string;
  lessonTitle: string;
  completedTasks: number;
  totalTasks: number;
  buttonLabel: string;
  href: string;
}) {
  return (
    <section
      aria-label={sectionTitle}
      className="animate-rise rounded-2xl border border-line bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:inline-flex"
        >
          <PlayCircle size={26} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium text-ink-subtle">
              {sectionTitle}
            </span>
            <span className="font-mono text-xs text-ink-muted">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <span className="truncate text-lg font-semibold text-ink">
            {lessonTitle}
          </span>
          <ProgressBar
            value={completedTasks}
            max={totalTasks || 1}
            label={lessonTitle}
          />
        </div>
        <div className="shrink-0">
          <LinkButton href={href} variant="primary" fullWidth>
            {buttonLabel}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
