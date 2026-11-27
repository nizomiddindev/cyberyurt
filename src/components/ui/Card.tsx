import type { ReactNode } from "react";

export interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="animate-rise rounded-2xl border border-line bg-card p-4 sm:p-6">
      {title ? (
        <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
