"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export interface PopoverProps {
  trigger: ReactNode;
  closeLabel: string;
  children: ReactNode;
}

export function Popover({ trigger, closeLabel, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const contentId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setPinned(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => {
          setPinned((prev) => {
            const next = !prev;
            setOpen(next);
            return next;
          });
        }}
        className="inline-flex min-h-11 items-center underline decoration-accent/70 decoration-dotted decoration-2 underline-offset-4 font-medium text-ink hover:text-accent cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {trigger}
      </button>

      {open ? (
        <span
          id={contentId}
          role="dialog"
          className="animate-rise absolute left-0 top-full z-20 mt-1 block w-72 max-w-[85vw] rounded-xl border border-line-strong bg-card-hover p-3 text-left text-sm text-ink shadow-lg shadow-black/30"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="block flex-1 leading-6">{children}</span>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => {
                setOpen(false);
                setPinned(false);
              }}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-card hover:text-ink cursor-pointer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </span>
        </span>
      ) : null}
    </span>
  );
}
