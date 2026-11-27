# Handoff

## Status (2026-11-27)
- **Milestone 1 completed** (reviewed and committed: `4ff9cf9`, `c75389b`).
- **Milestone 2 completed** (`2f4394d`).
- **Milestone 3 completed** (`4813017`).
- **Milestone 4 completed** (lint, `validate:lessons`, `validate:challenges`, 37 unit tests, and production build all pass).
- Design: Still TEMPORARY plain neutral-gray Tailwind inside `src/components/ui/`. Final design system will replace `src/components/ui/` later.

### What was done in Milestone 3
- Built Markdown lesson & glossary engine (`src/lib/lessons/types.ts`, `parser.ts`, `loader.ts`, `progress.ts`) supporting `Path > Module > Lesson > Task`, `[[slug]]` / `[[slug|label]]` first-use glossary popovers (hover + tap), `"Tushunmadim"` simpler versions, wrong-answer explanations, prerequisites with done/not-done badges, and terminal task auto-completion.
- Added code-rendered visual diagram components in `src/components/ui/Diagrams.tsx` (`::diagram tree` with clickable cards, `::diagram flow`, `::steps` with `"Keyingi"`/`"Oldingi"`, `::compare`) and lesson UI helpers in `src/components/ui/LessonLayout.tsx`.
- Added 13 Uzbek glossary files in `content/glossary/*.md` and 3 real beginner-first Uzbek lessons in `content/lessons/`: `"Fayl nima?"` (`0-daraja`), `"Terminal bilan tanishuv"` (`0-daraja`), and `"SOC nima?"` (`Kiberxavfsizlik asoslari`).
- Built `/darslar`, `/darslar/[slug]`, `/lugat` (A–Z with search), `POST /api/lessons/progress`, `supabase/migrations/002_lesson_progress.sql` (strict RLS), `scripts/validate-lessons.mjs` (runs in `prebuild`), and unit tests (`src/lib/lessons/lessons.test.ts`).

### What was done in Milestone 4
- Added `.gitignore` rule for `content/challenges/.flags.local.json` (`*.flags.local.json`) and created safe `content/challenges/.flags.example.json` with fake placeholders. Zero plaintext flags exist anywhere in git (`challenge.yaml`, `generate.py`, `solve.py`, `files/`, DB migration, or tests).
- Built 5 working easy CTF challenges under `content/challenges/<category>/<slug>/`:
  - Kriptografiya: `salom-base64`, `sezar-shifri`
  - Linux: `yashirin-fayl`, `log-ichida`
  - Forensika: `sirli-rasm`
- Built `scripts/validate-challenges.mjs` (wired into `prebuild`): scans for accidental `KIBER{` plaintext leaks and runs every `solve.py`, comparing `SHA-256(output)` against `flag_sha256` in `challenge.yaml`.
- Built server CTF loader (`src/lib/ctf/loader.ts`, stripping `flag_sha256` and locked hints from browser payloads), sliding-window rate limiter (`src/lib/ctf/rate-limit.ts`), progress loader (`src/lib/ctf/progress.ts`), file-serving route (`GET /api/challenges/[slug]/files/[filename]`), server-only flag verification route (`POST /api/ctf/submit`, max 5 attempts/min/user), and hint unlock route (`POST /api/ctf/hint`).
- Built `supabase/migrations/003_ctf.sql`: `ctf_challenges` (hashes only, zero client policies), `challenge_attempts`, `challenge_solves`, `challenge_hint_unlocks` (all RLS-protected, read-only for students), plus `SECURITY DEFINER` RPCs `submit_ctf_flag` and `unlock_ctf_hint` (revoked from `public, anon`, granted only to `authenticated`) that enforce rate limits, hash `p_flag` inside Postgres via `pgcrypto` (so knowing public `flag_sha256` from GitHub cannot solve a challenge), deduct unlocked hint costs, record solves, and award XP safely past the `profiles` trigger.
- Built `/mashq` (category + difficulty filters), `/mashq/[slug]` (split terminal view + `"Terminalga yuklash"` copying files to `~/challenges/<slug>/` + paid hints + flag form), plain UI helpers (`src/components/ui/ChallengeLayout.tsx`), and unit tests (`src/lib/ctf/ctf.test.ts`).

### Owner SQL migrations pending in Supabase Dashboard
1. Run `supabase/migrations/002_lesson_progress.sql` in Supabase SQL Editor (for saving logged-in lesson task progress).
2. Run `supabase/migrations/003_ctf.sql` in Supabase SQL Editor (for saving CTF solves, hint costs, 5/min DB rate limits, and XP awards).

### Known bugs / limitations
- Live browser click-through and live Supabase writes for `002_lesson_progress.sql` and `003_ctf.sql` are pending owner testing after running the two SQL migrations.
- Full live Supabase email signup flow still postponed from Milestone 1 (Supabase "Confirm email" email delivery).

### Deferred security fixes from the M2 review (owner chose: build first, fix later — DO NOT FORGET)
- Upload has NO size limit yet (required: 5 MB per file, 50 MB total, check before `file.arrayBuffer()`) — `src/components/terminal/Terminal.tsx` `handleUploadChange`.
- Upload errors are not caught (uploading while cwd is `/` fails silently).
- Path-escape tests are missing (code is safe by reading, but tests trying `../../`, `/users/<other-id>`, `/home/otheruser` must be added).
- `wget` accepts `http://`; should be https-only except `http://localhost` in dev.

### Rules later milestones must keep
- XP/level can only change through a `SECURITY DEFINER` SQL function or `service_role` on the server; the `profiles` trigger blocks direct client writes (M6).
- The GitHub repo is PUBLIC: plaintext flags must never be committed. Only SHA-256 hashes go in the repo/database (M4).

## Next step
- Wait for owner to review M3 & M4, run `002_lesson_progress.sql` and `003_ctf.sql` in Supabase, and say `"continue"` to start **Milestone 5** (Home page after login: greeting, terminal-style command bar navigating with `cd <category>`, continue card, category tiles with icon + name only).

## Open questions
- Domain `cyberyurt.com` not bought yet.
