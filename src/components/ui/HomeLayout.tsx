"use client";

import type { FormEvent, ReactNode } from "react";
import { CornerDownLeft } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <div className="rounded-md border border-neutral-300 bg-white p-3">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
      >
        <span className="shrink-0 font-mono text-sm font-medium text-neutral-700">
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
          className="min-h-11 min-w-0 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900"
        />
        <Button type="submit" variant="primary" aria-label={submitLabel}>
          <CornerDownLeft size={16} aria-hidden="true" />
          <span>{submitLabel}</span>
        </Button>
      </form>
      {feedback ? (
        <p
          role="status"
          className="mt-2 font-mono text-xs text-neutral-700"
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
    <Card title={sectionTitle}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-base font-medium text-neutral-900">
            {lessonTitle}
          </span>
          <span className="text-xs font-medium text-neutral-600">
            {completedTasks}/{totalTasks}
          </span>
        </div>
        <ProgressBar
          value={completedTasks}
          max={totalTasks || 1}
          label={lessonTitle}
        />
        <div>
          <LinkButton href={href} variant="primary">
            {buttonLabel}
          </LinkButton>
        </div>
      </div>
    </Card>
  );
}
