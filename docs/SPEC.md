# Project Specification

This document is the source of truth for the cybersecurity education platform for kids in Uzbekistan. Read this file before starting every task.

## Language & Localization
- **Primary language:** Uzbek (Latin script) first.
- **Translation files:** All UI text must live in translation files (`src/locales/uz.json`) so Russian and English can be added later.
- **Rule:** No hard-coded UI strings in components or pages.

## Users & Roles
- Supported roles: `student`, `teacher`, `admin`.

## Tech Stack
- **Frontend & Backend:** Next.js (App Router) + TypeScript, deployed on Vercel.
- **Database & Auth:** Supabase (PostgreSQL + Auth) with Row-Level Security (RLS) enabled.

## Platform Modules
- **Learn:** Paths > modules > lessons + quizzes.
- **Practice:** CTF challenges organized by category and difficulty, with hints that cost points.
- **Labs:** Interactive hands-on exercises.
- **Compete:** Leaderboards, events, and teams.
- **Teacher tools:** Classes with join codes, student progress tracking, and CSV export.
- **Gamification:** XP, levels, streaks, badges, and certificates.
- **Admin content panel:** Interface for managing platform content.

## Flags & Security
- Only a hash of each flag is stored in the database (never plaintext).
- Flags are checked on the server only.
- Rate limit: maximum 5 flag submission attempts per minute per user.
- The correct flag must never appear in client-side code.

## Browser Terminal
- **Phase 1–2:** `xterm.js` with a simulated shell written in TypeScript.
- **Phase 3 (optional):** Real Linux in the browser via `v86`.
- **Forbidden:** Do not use WebVM / CheerpX due to licensing restrictions.

## Terminal File Storage
- Terminal files are stored in the browser only using OPFS (Origin Private File System), never in cloud storage.
- Per-user folder is keyed by Supabase user ID (`/users/<id>/`) and displayed inside the terminal as `/home/<username>`.
- Standard folders:
  - `~/challenges/<challenge-id>/`
  - `/tmp` (cleared on each visit)
- UI controls: **Upload**, **Download**, and **Reset** buttons.
- Learning progress, XP, and challenge solves live in Supabase, never in OPFS.

## Terminal Identity & Prompt
- The terminal username equals the username the user picked at registration.
- Prompt format: `"<username>@<platform>:~$"`.
- Guests use the username `"mehmon"`, and guest progress is not saved.

## Username & Display Name Rules
- **Username:**
  - Allowed characters: lowercase `a-z`, `0-9`, `_`, and `-`.
  - Must start with a letter.
  - Length: 3 to 20 characters.
  - Must be unique across the platform.
  - Reserved names blocked: `root`, `admin`, `mehmon`, `system`.
- **Display name:** Separate field that allows any text (e.g., `O'tkir Karimov`).

## Challenge Files & Network Restrictions
- Challenge files are static files served directly by the site.
- The terminal's `wget` command only allows downloading from our own domain.

## Privacy
- Collect minimum data only: username, display name, class, and learning progress.
