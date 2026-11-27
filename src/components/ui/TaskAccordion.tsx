"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface TaskAccordionProps {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function TaskAccordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: TaskAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-card transition-colors ${
        open ? "border-line-strong" : "border-line"
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-ink hover:bg-card-hover cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex min-w-0 items-center gap-3">
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-ink-subtle transition-transform duration-200 ${
              open ? "rotate-0 text-accent" : "-rotate-90"
            }`}
          />
          <span className="text-base">{title}</span>
        </span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </button>
      {open ? (
        <div className="animate-rise border-t border-line px-4 py-4 text-sm text-ink">
          {children}
        </div>
      ) : null}
    </div>
  );
}
