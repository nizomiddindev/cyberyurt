import Link from "next/link";
import { CheckCircle2, Download, Flag, Lightbulb, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function ChallengeRow({
  href,
  title,
  category,
  difficultyLabel,
  pointsLabel,
  solved,
  solvedLabel,
}: {
  href: string;
  title: string;
  category: string;
  difficultyLabel: string;
  pointsLabel: string;
  solved: boolean;
  solvedLabel: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-sm font-medium text-ink transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:bg-card-hover ${
        solved ? "border-ok/30" : "border-line hover:border-line-strong"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            solved ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"
          }`}
        >
          {solved ? <CheckCircle2 size={18} /> : <Flag size={18} />}
        </span>
        <span className="text-base">{title}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Badge>{category}</Badge>
        <Badge>{difficultyLabel}</Badge>
        <Badge tone="accent">{pointsLabel}</Badge>
        {solved ? <Badge tone="success">{solvedLabel}</Badge> : null}
      </span>
    </Link>
  );
}

export function ChallengeFileLink({
  href,
  fileName,
}: {
  href: string;
  fileName: string;
}) {
  return (
    <a
      href={href}
      download={fileName}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-deep px-3 py-2 font-mono text-xs text-ink transition-colors hover:border-line-strong hover:text-accent"
    >
      <Download size={14} aria-hidden="true" />
      <span>{fileName}</span>
    </a>
  );
}

export function HintRow({
  costLabel,
  unlockLabel,
  unlocked,
  text,
  loading,
  onUnlock,
}: {
  costLabel: string;
  unlockLabel: string;
  unlocked: boolean;
  text: string | null;
  loading: boolean;
  onUnlock: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-deep/70 p-3">
      {unlocked && text ? (
        <div className="animate-rise flex items-start gap-2 text-sm leading-6 text-ink">
          <Lightbulb size={16} aria-hidden="true" className="mt-1 shrink-0 text-accent" />
          <p>{text}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Lock size={16} aria-hidden="true" className="text-ink-subtle" />
            <Badge tone="accent">{costLabel}</Badge>
          </span>
          <Button variant="secondary" onClick={onUnlock} disabled={loading}>
            {unlockLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-card text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
