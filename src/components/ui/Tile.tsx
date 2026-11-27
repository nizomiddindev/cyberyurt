import Link from "next/link";
import type { ReactNode } from "react";

export interface TileProps {
  name: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
}

const tileClasses =
  "group flex min-h-28 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-card px-3 py-4 text-center text-sm font-medium text-ink transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-card-hover active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function Tile({ name, icon, href, onClick }: TileProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-200 group-hover:scale-110 [&_svg]:h-[22px] [&_svg]:w-[22px]"
      >
        {icon}
      </span>
      <span className="max-w-full truncate">{name}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={tileClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${tileClasses} cursor-pointer`}>
      {content}
    </button>
  );
}
