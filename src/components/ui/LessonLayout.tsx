import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function ProseParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[68ch] text-base leading-8 text-ink">{children}</p>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-line bg-deep px-1.5 py-0.5 font-mono text-sm text-accent">
      {children}
    </code>
  );
}

export function LessonSplitLayout({
  left,
  right,
  showRight,
}: {
  left: ReactNode;
  right?: ReactNode;
  showRight: boolean;
}) {
  return (
    <div
      className={
        showRight
          ? "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
          : "mx-auto max-w-3xl"
      }
    >
      <div className="flex min-w-0 flex-col gap-4">{left}</div>
      {showRight && right ? (
        <div className="animate-rise min-w-0 lg:sticky lg:top-20">{right}</div>
      ) : null}
    </div>
  );
}

export function ChoiceList({
  options,
  selected,
  onSelect,
  disabled = false,
}: {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {options.map((option) => {
        const active = selected === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(option)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              active
                ? "border-accent bg-accent-soft text-ink"
                : "border-line bg-deep text-ink hover:border-line-strong hover:bg-card-hover"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                active ? "border-accent" : "border-line-strong"
              }`}
            >
              {active ? (
                <span className="animate-pop h-2.5 w-2.5 rounded-full bg-accent" />
              ) : null}
            </span>
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function DoneIcon({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 size={18} aria-hidden="true" className="animate-pop shrink-0 text-ok" />
  ) : (
    <Circle size={18} aria-hidden="true" className="shrink-0 text-ink-subtle" />
  );
}

export function PrereqLink({
  href,
  title,
  done,
  doneLabel,
  notDoneLabel,
}: {
  href: string;
  title: string;
  done: boolean;
  doneLabel: string;
  notDoneLabel: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-deep px-3 py-2 text-sm text-ink transition-colors hover:border-line-strong hover:bg-card-hover"
    >
      <DoneIcon done={done} />
      <span>{title}</span>
      <Badge tone={done ? "success" : "neutral"}>
        {done ? doneLabel : notDoneLabel}
      </Badge>
    </Link>
  );
}

export function LessonLinkRow({
  href,
  title,
  statusLabel,
  done,
}: {
  href: string;
  title: string;
  statusLabel: string;
  done: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium text-ink transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-card-hover"
    >
      <span className="flex min-w-0 items-center gap-3">
        <DoneIcon done={done} />
        <span className="text-base">{title}</span>
      </span>
      <Badge tone={done ? "success" : "neutral"}>{statusLabel}</Badge>
    </Link>
  );
}

export function GlossaryCard({
  term,
  definition,
  analogy,
  analogyLabel,
}: {
  term: string;
  definition: string;
  analogy?: string;
  analogyLabel: string;
}) {
  return (
    <article className="animate-rise rounded-2xl border border-line bg-card p-4">
      <h2 className="text-base font-semibold text-accent">{term}</h2>
      <p className="mt-1.5 text-sm leading-6 text-ink">{definition}</p>
      {analogy ? (
        <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-ink-muted">
          <strong className="font-medium text-ink">
            {analogyLabel}:{" "}
          </strong>
          {analogy}
        </p>
      ) : null}
    </article>
  );
}

export function QuestionBox({
  prompt,
  children,
}: {
  prompt: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-deep/70 p-4">
      <p className="mb-3 text-base font-medium text-ink">{prompt}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
