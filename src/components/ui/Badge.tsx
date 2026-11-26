import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
}

export function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex min-h-7 items-center rounded border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">
      {children}
    </span>
  );
}
