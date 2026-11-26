"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export interface HeaderNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
}

export interface HeaderProps {
  brandName: string;
  navItems: HeaderNavItem[];
  menuLabel: string;
  closeLabel: string;
  actions?: ReactNode;
}

export function Header({
  brandName,
  navItems,
  menuLabel,
  closeLabel,
  actions,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-neutral-300 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-base font-bold text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {brandName}
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 sm:flex">{actions}</div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? closeLabel : menuLabel}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-neutral-300 text-neutral-900 hover:bg-neutral-100 sm:hidden"
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 sm:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          {actions ? (
            <div
              className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3"
              onClick={() => setMenuOpen(false)}
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
