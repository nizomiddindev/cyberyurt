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

### Supabase migrations
- `001`–`005` have all been run on the live project (`004` and `005` run by Claude Code in the SQL Editor on 2026-11-27, editor text hash-checked against the files; verified afterwards with the anon key: leaderboards/profile stats return 200, `get_leaderboard_class` returns permission denied).
- Note: an earlier note here wrongly said `004` had been run; it had not until 2026-11-27.

### Pilot without classes (2026-11-27, by Claude Code)
- Owner decision: no classes for the pilot. Removed the "Sinfim" tab from `/reyting` (only Umumiy + Haftalik).
- `005_lock_class_name.sql`: adds `class_name` to `protect_profile_privileged_columns` (students can no longer set it; new profiles get `null`) and revokes `get_leaderboard_class` from every client role. `getLeaderboardClass()` in `queries.ts`, the `hasClass` viewer field, and the class strings in `uz.json` are left unused for future teacher tools.
- Re-enabling classes later needs teacher tools / join codes (SECURITY DEFINER) to set `class_name`, then a migration that grants `get_leaderboard_class` again.

### Known bugs / limitations
- Full live Supabase email signup flow still postponed from Milestone 1 (Supabase "Confirm email" email delivery).
- (Fixed 2026-11-28) Output/error order in chains: `CommandResult.display` now keeps stdout and stderr in the order they happened (`cat nope || echo ok` shows the error first; in a pipe, earlier commands' errors come before the final output and the last command's own error after it). `stdout`/`stderr` are unchanged for pipes and tests.
- Dev-server note: after editing a client component, `npm run dev` sometimes keeps serving the old server HTML (hydration-mismatch warnings in the console). Restarting `npm run dev` fixes it; production builds are not affected.

### Terminal line-editor & security hardening (2026-11-27)
- Moved terminal line editing into pure, unit-tested `src/lib/terminal/line-editor.ts` with proper multi-row wrapping, exact wrap-boundary handling, Uzbek character width (`o‘`, `g‘` = 1 col per char), resize reflow, and Ctrl+W / Ctrl+U / Ctrl+K shortcuts.
- Enforced upload limits (5 MB/file, 50 MB total in `src/lib/terminal/limits.ts`) before `file.arrayBuffer()`, caught upload write errors (e.g. uploading while `cwd` is `/`), restricted `MemoryFileSystem` writes to `~` and `/tmp`, hardened `wget` to HTTPS-only (except `http://localhost` in dev), and added comprehensive tests (`line-editor.test.ts`, `security.test.ts`).
- Added shell command chaining (`&&`, `||`, `;`) to `src/lib/terminal/parser.ts`, `shell.ts`, and `completion.ts` (combining with pipes and `>`/`>>`, preserving quoted operators, propagating `cd` across chains, reporting each executed command in `executedCommands` for lesson auto-complete, and returning bash-like syntax errors); tested in `src/lib/terminal/chaining.test.ts`.

### CTF draft staging bank (2026-11-28)
- Built 16 staged CTF challenges in `content/challenges-draft/` (2 per category across all 8 categories: 6 easy, 6 medium, 4 hard), separate from the 5 live challenges in `content/challenges/`.
- Added `--dir` support to `scripts/validate-challenges.mjs`, `npm run validate:drafts`, gitignored `content/challenges-draft/.flags.local.json`, fake `.flags.example.json`, `seed_drafts_preview.sql` (hashes only), and `src/lib/ctf/drafts.test.ts`. Zero plaintext flags exist in git.

### 13 more CTF challenges live (2026-11-28, by Claude Code)
- Antigravity wrote 16 drafts in `content/challenges-draft/` (2 per category). Review found that 3 of them (`xor-kalit`, `oddiy-tekshiruv`, `bayt-qulf`) can only be solved by programming (Antigravity's test solved them in JavaScript, not in our shell). Those 3 stay drafts until the terminal has Python (v86 idea) — so the Reverse category has no live challenge yet.
- The other 13 were moved to `content/challenges/` (18 live total) and inserted into Supabase with `supabase/migrations/006_more_challenges.sql` (applied and verified: 18 rows).
- Added real Linux commands so every live challenge is solvable in the browser shell: `rev`, `tr` (ranges, classes, `-d`, `-s`) in `src/lib/terminal/commands/transform.ts`. `base64 -d` now behaves like GNU: on missing `=` padding it still prints the decoded bytes, then `base64: invalid input`, exit 1 (needed for JWT payloads).
- `src/lib/ctf/drafts.test.ts` now solves every promoted challenge with shell commands only and checks `006` matches the yaml hashes/points. `ctf.test.ts` and `gamification.test.ts` count from data instead of hard-coded "5 challenges".
- Promoted flags were copied into the gitignored `content/challenges/.flags.local.json` so `generate.py` keeps working.
- Header: full nav only from `xl` (1280px); below that the menu button is used (nav + login buttons were wrapping/overlapping at ~1000–1250px).

### Deferred security fixes
- None open. (`class_name` is locked by `005`, which is applied.)

### Rules later milestones must keep
- XP/level can only change through a `SECURITY DEFINER` SQL function or `service_role` on the server; the `profiles` trigger blocks direct client writes.
- The GitHub repo is PUBLIC: plaintext flags must never be committed. Only SHA-256 hashes go in the repo/database, and `submit_ctf_flag` hashes `p_flag` inside Postgres.

## Next step
- Before the pilot class: test the full email signup flow live (decide on "Confirm email"; if turned off for testing it MUST be turned back on).

## Open questions
- Domain `cyberyurt.com` not bought yet.
