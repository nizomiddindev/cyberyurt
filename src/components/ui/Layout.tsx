import type { ReactNode } from "react";

export function PageContainer({
  narrow = false,
  children,
}: {
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={`mx-auto w-full flex-1 px-4 py-6 ${
        narrow ? "max-w-md" : "max-w-5xl"
      }`}
    >
      {children}
    </main>
  );
}

export function Stack({
  direction = "col",
  gap = "md",
  children,
}: {
  direction?: "col" | "row";
  gap?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const gapClass =
    gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4";
  const dirClass =
    direction === "row"
      ? "flex flex-wrap items-center"
      : "flex flex-col";

  return <div className={`${dirClass} ${gapClass}`}>{children}</div>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-2xl font-bold text-neutral-900">{children}</h1>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-md border border-neutral-400 bg-neutral-100 px-3 py-2 text-sm text-neutral-900"
    >
      {children}
    </div>
  );
}

export function Divider() {
  return <hr className="border-neutral-200" />;
}
