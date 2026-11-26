# Handoff

## Status (2026-11-26)
- Planning done. Full documentation and agent rules are in place (`AGENTS.md`, `CLAUDE.md`, `docs/SPEC.md`, `docs/CONTEXT.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/IDEAS.md`, `docs/HANDOFF.md`).
- Design: NOT final. Owner rejected 2 mockup directions (dark hacker look; Uzbek tile pattern + pixel icons). Next direction: TryHackMe-like (dark navy, one bright accent, clean cards, icon top nav) but our own. Final design system will be delivered as files.

### What already exists (matches SPEC)
- Next.js 16.4.6 project with App Router (`src/app/`).
- TypeScript (`tsconfig.json`, `@/*` mapped to `src/*`).
- `src/` folder structure.
- Tailwind CSS v4 (`src/app/globals.css`).
- ESLint (`eslint.config.mjs`, passes `npm run lint`).
- `npm` package manager (`package.json`, `package-lock.json`).
- `src/locales/uz.json` translation file (no hard-coded UI strings in `src/app/page.tsx` or `src/app/layout.tsx`).
- Git repository initialized with initial setup commit (`2ada153`).

### Items that do NOT match SPEC yet (fix in Milestone 1)
- **Uzbek apostrophe (`U+2018`)**: `src/locales/uz.json` currently uses ASCII `'` (`o'rgan`, `O'zbekiston`) instead of `‘` (`U+2018`) in `o‘` and `g‘`.
- **Missing `src/config/site.ts`**: Site name (`CyberYurt`), `terminalHost` (`yurt`), and `domain` (`cyberyurt.com`) are not yet defined in a single config file.
- **Temporary styling & UI components**: `src/app/layout.tsx`, `src/app/globals.css`, and `src/app/page.tsx` currently use custom dark slate/emerald Tailwind classes directly instead of plain neutral grays inside `src/components/ui/` (`Button`, `Card`, `Input`, `Badge`, `Header`, `Tile`, `TaskAccordion`, `Popover`, `Tabs`, `ProgressBar`).
- **Missing `.env.example`**: Needs to be created for Supabase environment variables (owner will fill `.env.local`).
- **Missing auth, database, and navigation**: No Supabase client, no `profiles` table with RLS, no registration/login/logout/Google/guest mode, and no header/navigation yet.
- **Missing test runner**: No unit test framework configured yet (needed to run tests after every milestone).

## Next step
- Milestone 1 from `docs/SPEC.md` (fix the setup mismatches above + config + locales + plain `src/components/ui/` components + header/navigation + Supabase auth + `profiles` table with RLS + roles + guest mode), with plain temporary styling.

## Open questions
- Domain `cyberyurt.com` not bought yet.
- Supabase project not created yet.
