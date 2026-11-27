import type { ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

export function PageContainer({
  narrow = false,
  children,
}: {
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={`mx-auto w-full flex-1 px-4 py-6 sm:py-8 ${
        narrow ? "max-w-md" : "max-w-6xl"
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
    <h1 className="animate-rise text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
      {children}
    </h1>
  );
}

export type NoticeTone = "info" | "success" | "error";

const noticeClasses: Record<NoticeTone, string> = {
  info: "animate-rise border-line bg-deep/60 text-ink-muted",
  success: "animate-pop border-ok/40 bg-ok-soft text-ink",
  error: "animate-shake border-bad/40 bg-bad-soft text-ink",
};

const noticeIcons: Record<NoticeTone, ReactNode> = {
  info: <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-subtle" />,
  success: <CheckCircle2 size={18} aria-hidden="true" className="mt-px shrink-0 text-ok" />,
  error: <XCircle size={18} aria-hidden="true" className="mt-px shrink-0 text-bad" />,
};

export function Notice({
  tone = "info",
  children,
}: {
  tone?: NoticeTone;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-6 ${noticeClasses[tone]}`}
    >
      {noticeIcons[tone]}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Divider() {
  return <hr className="border-line" />;
}
