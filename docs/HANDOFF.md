# Handoff

## Status (2026-11-26)
- **Milestone 1 completed** (lint, unit tests, and production build all pass).
- Design: Still TEMPORARY plain neutral-gray Tailwind inside `src/components/ui/`. Final design system will replace `src/components/ui/` later.

### What was done in Milestone 1
- Fixed `.gitignore` to ignore `.env*` while keeping `!.env.example` tracked; logged in `docs/DECISIONS.md`.
- Created `.env.example` for Supabase environment variables.
- Added centralized site config (`src/config/site.ts`) with `siteName = "CyberYurt"`, `terminalHost = "yurt"`, `domain = "cyberyurt.com"`.
- Updated `src/locales/uz.json` to use `‘` (`U+2018`) in `o‘` and `g‘` and added `src/locales/index.ts`.
- Built all temporary plain neutral-gray UI components in `src/components/ui/` (`Button`, `LinkButton`, `Card`, `Input`, `Badge`, `Header`, `Tile`, `TaskAccordion`, `Popover`, `Tabs`, `ProgressBar`, `Layout` primitives).
- Added Supabase browser/server/proxy helpers (`src/lib/supabase/*`), Next.js 16 session refresh proxy (`src/proxy.ts`), and server viewer loader (`src/lib/auth/viewer.ts`).
- Built navigation header (`SiteHeader`), guest mode (`mehmon`, nothing saved), email + password login (`/kirish`), registration with username/display-name validation (`/royxat`), Google OAuth + callback (`/auth/callback`), profile completion after Google login (`/profil-sozlash`), and logout (`LogoutButton`).
- Created SQL migration `supabase/migrations/001_profiles.sql` with `profiles` table, username/role constraints, `handle_new_user` trigger, role self-escalation guard, strict own-row RLS, and narrow `SECURITY DEFINER` RPCs (`is_username_available`, `get_public_profile`).
- Configured Vitest (`vitest.config.mts`, `npm test`) with unit tests for username/display-name rules, `siteConfig`, and Uzbek `U+2018` locale rules.

### Current state & owner action needed before live auth testing
- App runs locally right now in **guest mode** (`mehmon`) even without Supabase keys.
- To enable real registration, login, and Google OAuth, the owner needs to:
  1. Create a Supabase project, copy `.env.example` to `.env.local`, and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  2. Run `supabase/migrations/001_profiles.sql` in the Supabase Dashboard SQL Editor.
  3. (Optional for Google login) Enable Google provider in Supabase Auth -> Providers and add `http://localhost:3000/auth/callback` to Supabase Auth -> URL Configuration -> Redirect URLs.

### Known bugs / limitations
- None found in build, lint, or unit tests. Live Supabase signup/login/Google OAuth has not been exercised against a live Supabase project yet (waiting on owner's Supabase project and `.env.local`).

## Next step
- Wait for owner to configure Supabase (`.env.local` + `001_profiles.sql`) and verify Milestone 1, then say `"continue"` to start **Milestone 2** (browser terminal component with `xterm.js`, OPFS file system keyed by `/users/<user-id>/`, all shell commands, upload/download/reset buttons, and unit tests for every command).

## Open questions
- Domain `cyberyurt.com` not bought yet.
- Supabase project not created yet.
