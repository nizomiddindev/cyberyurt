import type { ReactNode } from "react";

export interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white p-4 sm:p-6">
      {title ? (
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
