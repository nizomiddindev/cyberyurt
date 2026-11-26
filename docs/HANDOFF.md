# Handoff

## Status (2026-11-27)
- **Milestone 1 completed** (reviewed and committed: `4ff9cf9`, `c75389b`).
- **Milestone 2 completed** (lint, 25 unit tests, and production build all pass).
- Design: Still TEMPORARY plain neutral-gray Tailwind inside `src/components/ui/`. Final design system will replace `src/components/ui/` later.

### What was done in Milestone 1 + live Supabase check
- Config (`src/config/site.ts`), Uzbek Latin (`U+2018`) locales, plain temporary UI components in `src/components/ui/`, Supabase auth + guest mode (`mehmon`), and `supabase/migrations/001_profiles.sql` with strict RLS and privileged-column protection (`protect_profile_privileged_columns`).
- Owner created the Supabase project (region Europe), filled `.env.local`, and ran `001_profiles.sql`.
- Read-only live check confirmed `is_username_available`, RLS on `profiles`, `get_public_profile`, and Auth keys work. Full signup flow is postponed until email confirmation is tested/configured (note: if "Confirm email" is turned off for local dev, it MUST be turned back ON before real students use the site).

### What was done in Milestone 2
- Installed `@xterm/xterm` and `@xterm/addon-fit` (loaded client-only via `TerminalLoader`).
- Built raw-byte `VirtualFileSystem` layer (`src/lib/terminal/types.ts`, `path.ts`, `memory-fs.ts`, `opfs-fs.ts`):
  - Logged-in users store files in browser OPFS keyed by Supabase user ID (`/users/<user-id>/home/`), shown as `/home/<username>`, with `~/challenges/` created by default and `navigator.storage.persist()` called.
  - Guests (`mehmon`) use in-memory storage only (nothing saved).
  - `/tmp` is ephemeral in-memory and cleared on every visit.
  - Progress/XP is never stored in OPFS.
- Built command parser (`parser.ts`), Tab completion (`completion.ts`), `ShellSession` (`shell.ts`), and all 27 commands (`commands/navigation.ts`, `files.ts`, `text.ts`, `analysis.ts`, `network.ts`, `index.ts`):
  - `ls (-a, -l)`, `cd`, `pwd`, `cat`, `echo`, `mkdir`, `rm`, `cp`, `mv`, `touch`, `head`, `tail`, `wc`, `grep`, `find`, `sort`, `uniq`, `file`, `strings`, `base64 (-d)`, `xxd`, `hexdump`, `wget`, `clear`, `help`, `history`, `whoami`.
  - Supports pipes (`|`), `>` and `>>` redirection, quotes, Tab completion, and Up/Down arrow history.
  - `wget` enforces our own domain (`cyberyurt.com` + current page origin) and blocks external URLs and redirects.
- Built plain neutral `TerminalFrame` in `src/components/ui/TerminalFrame.tsx` with Upload, Download, and Reset (with confirmation) buttons and 44px+ touch targets.
- Built `Terminal` component (`src/components/terminal/Terminal.tsx`), dynamic loader (`TerminalLoader.tsx`), `/terminal` page (`src/app/terminal/page.tsx`), and added `Terminal` navigation links in `SiteHeader` and `/`.
- Added unit tests for every command, shell features, and OPFS user-ID isolation / `/tmp` clearing (`src/lib/terminal/commands.test.ts`, `src/lib/terminal/opfs-fs.test.ts`).

### Known bugs / limitations
- Live browser OPFS persistence and xterm keyboard interaction have not yet been manually clicked through in a real browser (all 25 Vitest unit tests, ESLint, and Next.js production build pass).
- Full live Supabase email signup flow still postponed from Milestone 1 (Supabase "Confirm email" email delivery).

## Next step
- Wait for owner to test Milestone 2 and say `"continue"` to start **Milestone 3** (Lessons: Markdown loading, glossary + popovers + `scripts/validate-lessons` + `/lugat` page, `::diagram` / `::steps` / `::compare` components, lesson page with tasks + terminal, questions with wrong-answer explanations, `"Tushunmadim"`, prerequisites, progress saved in Supabase, and 3 real Uzbek lessons: `"Fayl nima?"`, `"Terminal bilan tanishuv"`, `"SOC nima?"`).

## Open questions
- Domain `cyberyurt.com` not bought yet.
