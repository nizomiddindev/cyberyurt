import Link from "next/link";
import type { ReactNode } from "react";

export interface TileProps {
  name: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
}

const tileClasses =
  "flex min-h-14 w-full items-center gap-3 rounded-md border border-neutral-300 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

export function Tile({ name, icon, href, onClick }: TileProps) {
  const content = (
    <>
      <span aria-hidden="true" className="shrink-0 text-neutral-700">
        {icon}
      </span>
      <span className="truncate">{name}</span>
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
