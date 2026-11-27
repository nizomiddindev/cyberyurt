import Link from "next/link";
import { CheckCircle2, Circle, Download, Lightbulb } from "lucide-react";
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
      className="flex min-h-14 flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
    >
      <span className="flex items-center gap-2">
        {solved ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : (
          <Circle size={16} aria-hidden="true" />
        )}
        <span>{title}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Badge>{category}</Badge>
        <Badge>{difficultyLabel}</Badge>
        <Badge>{pointsLabel}</Badge>
        {solved ? <Badge>{solvedLabel}</Badge> : null}
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
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-900 hover:bg-neutral-100"
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
    <div className="rounded-md border border-neutral-300 bg-neutral-50 p-3">
      {unlocked && text ? (
        <div className="flex items-start gap-2 text-sm leading-6 text-neutral-900">
          <Lightbulb size={16} aria-hidden="true" className="mt-1 shrink-0" />
          <p>{text}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge>{costLabel}</Badge>
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
      className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
      }`}
    >
      {label}
    </button>
  );
}
