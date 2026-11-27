import { CTF_CATEGORIES, type CtfCategory } from "@/lib/ctf/types";

export type CommandBarAction =
  | { kind: "navigate"; href: string }
  | { kind: "list"; items: string[] }
  | { kind: "error"; target: string };

const CATEGORY_ALIASES: Record<string, CtfCategory> = {
  kriptografiya: "Kriptografiya",
  crypto: "Kriptografiya",
  forensika: "Forensika",
  forensics: "Forensika",
  veb: "Veb",
  web: "Veb",
  linux: "Linux",
  osint: "OSINT",
  tarmoq: "Tarmoq",
  network: "Tarmoq",
  reverse: "Reverse",
  fishing: "Fishing",
  phishing: "Fishing",
};

const PAGE_SHORTCUTS: Record<string, string> = {
  darslar: "/darslar",
  mashq: "/mashq",
  lugat: "/lugat",
  terminal: "/terminal",
  reyting: "/reyting",
  "~": "/",
  "/": "/",
};

export function resolveCommandBarNavigation(
  rawInput: string,
): CommandBarAction | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === "ls") {
    return {
      kind: "list",
      items: [
        ...CTF_CATEGORIES.map((c) => c.toLowerCase()),
        "darslar",
        "mashq",
        "lugat",
        "terminal",
      ],
    };
  }

  if (cmd !== "cd") {
    return { kind: "error", target: trimmed };
  }

  const rawTarget = parts[1]?.trim().toLowerCase() ?? "";
  if (!rawTarget) {
    return { kind: "navigate", href: "/mashq" };
  }

  const cleanTarget = rawTarget.replace(/^\/+|\/+$/g, "") || "/";

  const category = CATEGORY_ALIASES[cleanTarget];
  if (category) {
    return {
      kind: "navigate",
      href: `/mashq?kategoriya=${encodeURIComponent(category)}`,
    };
  }

  const pageHref = PAGE_SHORTCUTS[cleanTarget];
  if (pageHref) {
    return { kind: "navigate", href: pageHref };
  }

  return { kind: "error", target: parts[1] ?? "" };
}
