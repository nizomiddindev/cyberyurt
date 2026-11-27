# Handoff

## Status (2026-11-27)
- **Milestone 1 completed** (`4ff9cf9`, `c75389b`).
- **Milestone 2 completed** (`2f4394d`).
- **Milestone 3 completed** (`4813017`).
- **Milestone 4 completed** (`83baeeb`, security fix `7b1420e`).
- **Milestone 5 completed** (`39cfadf`).
- **Milestone 6 completed** (all 6 core milestones from `docs/SPEC.md` built; lint, validators, 45 unit tests, and production build all pass).
- Design: Still TEMPORARY plain neutral-gray Tailwind inside `src/components/ui/`. Final design system will replace `src/components/ui/` later.

### What was done in Milestone 5
- Built home page command bar parser (`src/lib/home/command-bar.ts`) supporting `cd <category>` (all 8 CTF categories + `darslar`, `mashq`, `lugat`, `terminal`, `reyting`) and `ls`, plus continue-lesson selector (`src/lib/home/continue.ts`).
- Added plain UI components `CommandBar`, `TileGrid`, and `ContinueCard` in `src/components/ui/HomeLayout.tsx` and client bar `src/components/home/HomeCommandBar.tsx`.
- Updated `/` (`src/app/page.tsx`) to show minimal greeting (`Salom, <username>`), terminal-style command bar, Continue card with progress bar, and all 8 CTF category tiles (icon + name only).
- Updated `/mashq` to honor `?kategoriya=<Category>` query parameter from category tiles and `cd <category>` navigation.
- Added unit tests (`src/lib/home/home.test.ts`).

### What was done in Milestone 6
- Created `supabase/migrations/004_xp_leaderboard.sql`:
  - `calculate_level(p_xp)` (`floor(xp / 200) + 1`, starting at level 1) and updated `submit_ctf_flag` so verified CTF solves atomically update both `profiles.xp` and `profiles.level`. No XP is awarded from student-writable `lesson_progress`.
  - Narrow `SECURITY DEFINER` leaderboard RPCs (`get_leaderboard_overall`, `get_leaderboard_weekly`, `get_leaderboard_class` revoked from `public, anon` and restricted to `role = 'student'` in the viewer's own class) and `get_public_profile_stats` returning ONLY `username`, `level`, `xp`, `solves_count`, `solved_slugs`, `created_at` (never `display_name`, `email`, `class_name`, or `school`). No broad `SELECT` policy added to `profiles`.
- Built XP/level/badge/stat helpers (`src/lib/gamification/xp.ts`), Supabase RPC loaders (`src/lib/gamification/queries.ts`), plain UI components (`src/components/ui/GamificationLayout.tsx`), `/reyting` leaderboard page (tabs: `Umumiy`, `Haftalik`, `Sinfim`), and `/profil/[username]` public profile page.
- Updated `SiteHeader` with `Reyting` nav link, clickable username profile link, and level/XP badges for signed-in users.
- Added unit + SQL privacy/security invariant tests (`src/lib/gamification/gamification.test.ts`).

### Owner SQL migrations pending in Supabase Dashboard (run in order)
1. `supabase/migrations/002_lesson_progress.sql`
2. `supabase/migrations/003_ctf.sql`
3. `supabase/migrations/004_xp_leaderboard.sql`

### Known bugs / limitations
- Live Supabase writes/reads for `002`, `003`, and `004` migrations are pending owner running those 3 SQL files in Supabase SQL Editor.
- Full live Supabase email signup flow still postponed from Milestone 1 (Supabase "Confirm email" email delivery).

### Deferred security fixes from the M2 review (owner chose: build first, fix later — DO NOT FORGET)
- Upload has NO size limit yet (required: 5 MB per file, 50 MB total, check before `file.arrayBuffer()`) — `src/components/terminal/Terminal.tsx` `handleUploadChange`.
- Upload errors are not caught (uploading while cwd is `/` fails silently).
- Path-escape tests are missing (code is safe by reading, but tests trying `../../`, `/users/<other-id>`, `/home/otheruser` must be added).
- `wget` accepts `http://`; should be https-only except `http://localhost` in dev.

### Rules later milestones must keep
- XP/level can only change through a `SECURITY DEFINER` SQL function or `service_role` on the server; the `profiles` trigger blocks direct client writes.
- The GitHub repo is PUBLIC: plaintext flags must never be committed. Only SHA-256 hashes go in the repo/database, and `submit_ctf_flag` hashes `p_flag` inside Postgres.

## Next step
- Wait for owner to run `002_lesson_progress.sql`, `003_ctf.sql`, and `004_xp_leaderboard.sql` in Supabase and test M5 & M6. Next priorities after that: fix the deferred M2 security items above and/or swap in the final design system in `src/components/ui/`.

## Open questions
- Domain `cyberyurt.com` not bought yet.
