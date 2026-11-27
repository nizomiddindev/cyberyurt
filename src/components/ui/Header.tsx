"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Tent, X } from "lucide-react";

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

type NavVariant = "desktop" | "mobile";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClasses(variant: NavVariant, active: boolean): string {
  if (variant === "desktop") {
    return `relative inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${focusRing} ${
      active
        ? "text-ink after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-accent"
        : "text-ink-muted hover:bg-card hover:text-ink"
    }`;
  }
  return `inline-flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
    active ? "bg-accent-soft text-accent" : "text-ink hover:bg-card"
  }`;
}

function NavList({
  items,
  pathname,
  variant,
  onNavigate,
}: {
  items: HeaderNavItem[];
  pathname: string | null;
  variant: NavVariant;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={navLinkClasses(variant, active)}
          >
            <span className={active ? "text-accent" : undefined}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

/** Reads the current URL to highlight the active link. Must sit inside Suspense (Next.js 16). */
function ActiveNavList(props: {
  items: HeaderNavItem[];
  variant: NavVariant;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return <NavList {...props} pathname={pathname} />;
}

function Nav(props: {
  items: HeaderNavItem[];
  variant: NavVariant;
  onNavigate?: () => void;
}) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <ActiveNavList {...props} />
    </Suspense>
  );
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
    <header className="sticky top-0 z-30 border-b border-line bg-page">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl text-base font-semibold text-ink ${focusRing}`}
          >
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent"
            >
              <Tent size={18} />
            </span>
            <span>{brandName}</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            <Nav items={navItems} variant="desktop" />
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">{actions}</div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? closeLabel : menuLabel}
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line text-ink hover:bg-card lg:hidden ${focusRing}`}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="animate-rise border-t border-line bg-page px-4 py-3 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            <Nav
              items={navItems}
              variant="mobile"
              onNavigate={() => setMenuOpen(false)}
            />
          </nav>
          {actions ? (
            <div
              className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
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
