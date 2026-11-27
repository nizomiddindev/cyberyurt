# Handoff

## Status (2026-11-27)
- **Milestone 1 completed** (`4ff9cf9`, `c75389b`).
- **Milestone 2 completed** (`2f4394d`).
- **Milestone 3 completed** (`4813017`).
- **Milestone 4 completed** (`83baeeb`, security fix `7b1420e`).
- **Milestone 5 completed** (`39cfadf`).
- **Milestone 6 completed** (all 6 core milestones from `docs/SPEC.md` built; lint, validators, 45 unit tests, and production build all pass).
- **Design system applied** (2026-11-27, by Claude Code): owner picked variant B "deep blue + coral" with light motion. See `docs/DESIGN.md` for the rules.

### What was done in the design pass
- `src/components/ui/theme.css`: all colors (`page`, `deep`, `card`, `line`, `ink`, `accent`, `ok`, `bad`, ...) and animations (`animate-rise`, `animate-pop`, `animate-shake`, `animate-flash`) as Tailwind v4 `@theme` tokens; imported from `src/app/globals.css`. Respects `prefers-reduced-motion`.
- Restyled every component in `src/components/ui/` (same props as before). New optional props: `Badge tone`, `Notice tone` (`info` | `success` | `error`).
- Diagrams animate: `::steps` has a sliding progress track, tree/flow cards appear one by one, `::compare` diff rows flash once.
- Header highlights the active page (`usePathname` inside `Suspense`, required by Next.js 16 cache components).
- xterm colors and font moved to `ui/TerminalFrame.tsx` (`terminalTheme`, `getTerminalFontFamily()`), fixing the terminal falling back to Courier.
- Outside `ui/` only tiny prop changes: `LessonRunner` and `ChallengeRunner` pass `tone` to `Notice`/`Badge`; `SiteHeader` XP badge uses `tone="accent"`; `layout.tsx` body lost its gray classes.

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

### Terminal line-editor & security hardening (2026-11-27)
- Moved terminal line editing into pure, unit-tested `src/lib/terminal/line-editor.ts` with proper multi-row wrapping, exact wrap-boundary handling, Uzbek character width (`o‘`, `g‘` = 1 col per char), resize reflow, and Ctrl+W / Ctrl+U / Ctrl+K shortcuts.
- Enforced upload limits (5 MB/file, 50 MB total in `src/lib/terminal/limits.ts`) before `file.arrayBuffer()`, caught upload write errors (e.g. uploading while `cwd` is `/`), restricted `MemoryFileSystem` writes to `~` and `/tmp`, hardened `wget` to HTTPS-only (except `http://localhost` in dev), and added comprehensive tests (`line-editor.test.ts`, `security.test.ts`).
- Added shell command chaining (`&&`, `||`, `;`) to `src/lib/terminal/parser.ts`, `shell.ts`, and `completion.ts` (combining with pipes and `>`/`>>`, preserving quoted operators, propagating `cd` across chains, reporting each executed command in `executedCommands` for lesson auto-complete, and returning bash-like syntax errors); tested in `src/lib/terminal/chaining.test.ts`.

### Deferred security fixes (owner chose: build first, fix later — DO NOT FORGET)
- (From M6 review) `profiles.class_name` is still editable by the student (own-row update policy; the trigger only locks role/xp/level/created_at). A stranger could set any class_name from the browser console and see that class's "Sinfim" list, linking usernames to a real class/school. Before any class gets real students: add `class_name` to `protect_profile_privileged_columns` (new migration) so only teacher tools / join codes (SECURITY DEFINER) can set it.

### Rules later milestones must keep
- XP/level can only change through a `SECURITY DEFINER` SQL function or `service_role` on the server; the `profiles` trigger blocks direct client writes.
- The GitHub repo is PUBLIC: plaintext flags must never be committed. Only SHA-256 hashes go in the repo/database, and `submit_ctf_flag` hashes `p_flag` inside Postgres.

## Next step
- Wait for owner to run `002_lesson_progress.sql`, `003_ctf.sql`, and `004_xp_leaderboard.sql` in Supabase and test M5 & M6. Next priorities after that: fix the deferred M2 security items above and/or swap in the final design system in `src/components/ui/`.

## Open questions
- Domain `cyberyurt.com` not bought yet.
