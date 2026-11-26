You are building "CyberYurt", a cybersecurity education platform for teenagers (13-17)
in Uzbekistan. Its main difference from TryHackMe: beginner-first EDUCATION (every term
explained, visual explanations). I am a beginner relearning programming and will show
this project in university portfolios, so I must understand every part.

HOW TO WORK
- First write docs/SPEC.md (everything below), docs/DECISIONS.md (table: Date | Decision |
  Why | Alternatives rejected) and docs/IDEAS.md (backlog below).
- Then build Milestones 1-6 IN ORDER. After EACH milestone: run lint, tests and build, make
  a git commit, then STOP and give me: (a) every file you created/changed with a 1-2
  sentence plain explanation, (b) how to test it myself in 3 steps. Wait for "continue".
- Re-read docs/SPEC.md before each milestone. Log new decisions in DECISIONS.md.
  Never build anything from IDEAS.md unless I ask.
- Never put secrets in code or chat. Create .env.example and tell me to fill .env.local
  myself. .env.local must be in .gitignore.

CONFIG
The name lives in ONE place: src/config/site.ts (siteName = "CyberYurt",
terminalHost = "yurt", domain = "cyberyurt.com"). Never hard-code it anywhere else.

STACK
Next.js (App Router, TypeScript, src/ folder), Tailwind CSS, Supabase (Postgres + Auth,
row-level security on EVERY table), xterm.js. npm. Deploy to Vercel later, not now.

LANGUAGE
All UI text in Uzbek Latin in src/locales/uz.json (no hard-coded UI strings) so Russian
and English can be added later. Use ‘ (U+2018) in o‘ and g‘.

DESIGN (TEMPORARY - IMPORTANT)
The final design system will be given to you later as ready files. So for now:
- Do NOT design anything. Use plain, minimal Tailwind styling (neutral grays).
- ALL visual UI must live in src/components/ui/ (Button, Card, Input, Badge, Header,
  Tile, TaskAccordion, Popover, Tabs, ProgressBar). Pages only use these components,
  never their own styling, so the design can be swapped in one place later.
- TEXT RULE: as little text as possible on every page (names, labels, buttons only).
  No description lines under titles, no marketing text, no "how it works" sections.
  The ONLY exception is lesson/docs content.
- Mobile-first: every page works at 390px width. Touch targets >= 44px. No emoji icons.

USERS & AUTH
Roles: student, teacher, admin. Login: email + Google (Telegram later).
Username: lowercase a-z, 0-9, _ and -, starts with a letter, 3-20 chars, unique; blocked:
root, admin, mehmon, system, guest. Separate display_name (any text). Public profile shows
only username, level, badges, stats; never real name/email/school. Guests are "mehmon"
and nothing is saved. Users are minors: collect only username, display_name, email, role,
class, progress.

TERMINAL
Simulated shell in TypeScript on xterm.js (not real Linux yet).
Prompt: "<username>@yurt:<cwd>$". whoami returns the username.
Files are stored ONLY in the browser via OPFS (never server/cloud storage).
Storage key = Supabase user ID: /users/<user-id>/ (2 kids on one school PC never see each
other's files; renaming a username keeps files). Shown as /home/<username>.
Folders: ~/challenges/<challenge-id>/, /tmp (cleared each visit). Call
navigator.storage.persist(). Buttons: Upload (from computer), Download, Reset.
Commands: ls (-a, -l), cd, pwd, cat, echo, mkdir, rm, cp, mv, touch, head, tail, wc,
grep, find, sort, uniq, file, strings, base64 (-d), xxd, hexdump, wget, clear, help,
history, whoami; pipes (|) and > redirection; Tab completion; up-arrow history.
wget may only download from our own domain. Progress/XP is never stored in OPFS.
Unit tests for every command.

LESSONS (TryHackMe-style structure, beginner-first content)
Hierarchy: Path > Module > Lesson > Task. Lessons are Markdown files in content/lessons/
so I can add lessons without code. Each task = short text + a question, or a terminal
task that completes automatically when the student runs the right command / finds a file.
Layout: tasks as an accordion on the left; terminal on the right (split view, can be
hidden, stacked under on mobile).
Beginner-first rules:
- GLOSSARY: each term is a file content/glossary/<term>.md (term, 1-sentence Uzbek
  definition, optional analogy). Lessons write terms as [[tor]]. First use in a lesson is
  underlined; tap/hover shows the definition in a popover. scripts/validate-lessons fails
  the build if a lesson uses a term with no glossary file. Page /lugat lists all terms
  A-Z with search.
- Every lesson starts with a real-life scenario (2-4 sentences) BEFORE any terminology.
- Every lesson declares prerequisites (lesson ids); show them with done/not-done + links.
- A question after each task. Every question has an "explanation" shown after a wrong
  answer (why it is wrong), not just "incorrect".
- A task may have a "simpler" version; a "Tushunmadim" button swaps to it.
- VISUALS: diagrams are written as code inside Markdown and rendered by our components
  (never as image files), so all diagrams look the same and Uzbek text is editable:
    ::diagram tree   (org charts, e.g. CISO > SOC menejeri > [A, B, C])
    ::diagram flow   (steps with arrows)
    ::steps          (step-by-step animation with a "Keyingi" button, e.g. how TOR works)
    ::compare        (real vs fake side by side, with highlighted differences)
  In ::diagram tree, each card is clickable and shows that card's description below.
- Add a "0-daraja" path before security topics: files, how the internet works, passwords.

CTF CHALLENGES
Each challenge is a folder content/challenges/<category>/<slug>/ with challenge.yaml
(title, category, difficulty, points, hints with point cost), generate.py, solve.py
(solves it and prints the flag), files/. scripts/validate-challenges runs every
solve.py; a challenge whose solve.py does not print the correct flag is rejected.
Flag format KIBER{...}. The database stores only a SHA-256 hash. Flags are checked only
on the server (API route), max 5 attempts per minute per user. The correct flag is never
sent to the browser. "Load into terminal" button copies challenge files into
~/challenges/<slug>/. Categories: Kriptografiya, Forensika, Veb, Linux, OSINT, Tarmoq,
Reverse, Fishing.

MILESTONES (functionality first, design later)
M1  Project setup, docs, config, locales, plain ui components, header/navigation,
    Supabase auth (register with username rules, login, logout, Google), profiles table
    with RLS, roles, guest mode.
M2  Terminal component + OPFS file system + all commands + upload/download/reset + tests.
M3  Lessons: Markdown loading, glossary + popovers + validate script + /lugat page,
    diagram/steps/compare components, lesson page with tasks + terminal, questions with
    explanations, "Tushunmadim", prerequisites, progress saved in Supabase.
    Add 3 real Uzbek lessons: "Fayl nima?", "Terminal bilan tanishuv", "SOC nima?".
M4  CTF: challenge format, validate script, list + challenge page, load into terminal,
    server-side flag check, rate limit, hints that cost points. Add 5 working easy
    challenges (Kriptografiya x2, Linux x2, Forensika x1).
M5  Home page after login: greeting, terminal-style command bar that navigates with
    "cd <category>", continue card, category tiles (icon + name only).
M6  XP + levels, leaderboard (tabs: Umumiy, Haftalik, Sinfim), public profile page.

IDEAS.md (backlog, do not build yet)
- Final design system (will be provided as files, then swap src/components/ui).
- 1v1 CTF battles: 3 challenges, 10 min, live opponent progress (Supabase Realtime), Elo
  rating, invite by code, ghost mode, per-player dynamic flags, no free chat (preset
  reactions only), rating counts only first 3 games/day vs same opponent.
- Challenge generators (random Caesar/Base64/XOR) for unlimited variants.
- Teacher tools: classes, join codes, progress view, CSV export.
- Real Linux in browser via v86 (not WebVM/CheerpX, license).
- Server-side attack labs in isolated Docker containers on a separate VPS.
- Telegram login, Russian language, certificates, badges, streaks, events, teams.
