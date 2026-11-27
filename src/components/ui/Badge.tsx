import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "success";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-deep/60 text-ink-muted",
  accent: "border-transparent bg-accent-soft text-accent",
  success: "border-transparent bg-ok-soft text-ok",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
