"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
    <div className="rounded-md border border-neutral-300 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
          <span>{title}</span>
        </span>
        {badge ? <span>{badge}</span> : null}
      </button>
      {open ? (
        <div className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-800">
          {children}
        </div>
      ) : null}
    </div>
  );
}
