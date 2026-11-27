import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function ProseParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="text-base leading-7 text-neutral-900">{children}</p>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-900">
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
      <div className="flex flex-col gap-4">{left}</div>
      {showRight && right ? (
        <div className="lg:sticky lg:top-4">{right}</div>
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
            className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm cursor-pointer disabled:cursor-not-allowed ${
              active
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <span>{option}</span>
          </button>
        );
      })}
    </div>
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
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100"
    >
      {done ? (
        <CheckCircle2 size={16} aria-hidden="true" />
      ) : (
        <Circle size={16} aria-hidden="true" />
      )}
      <span>{title}</span>
      <Badge>{done ? doneLabel : notDoneLabel}</Badge>
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
      className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
    >
      <span className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : (
          <Circle size={16} aria-hidden="true" />
        )}
        <span>{title}</span>
      </span>
      <Badge>{statusLabel}</Badge>
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
    <article className="rounded-md border border-neutral-300 bg-white p-4">
      <h2 className="text-base font-semibold text-neutral-900">{term}</h2>
      <p className="mt-1.5 text-sm leading-6 text-neutral-800">{definition}</p>
      {analogy ? (
        <p className="mt-2 border-t border-neutral-200 pt-2 text-sm leading-6 text-neutral-700">
          <strong className="font-medium text-neutral-900">
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
    <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
      <p className="mb-3 text-sm font-semibold text-neutral-900">{prompt}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
