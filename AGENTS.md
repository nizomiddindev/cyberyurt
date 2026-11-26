# CyberYurt – rules for AI agents
- Before any work, read in order: docs/HANDOFF.md, docs/CONTEXT.md, docs/SPEC.md,
  docs/DESIGN.md. docs/SPEC.md is the source of truth.
- The owner is a beginner relearning programming and will show this project in
  university portfolios. After every task: list each file created/changed with a 1-2
  sentence plain explanation, and give 3 steps to test it.
- Work milestone by milestone (see SPEC). After each milestone: lint, tests, build,
  git commit with a clear message, then STOP and wait for "continue".
- At the end of EVERY session, update docs/HANDOFF.md (what was done, current state,
  known bugs, exact next step). Log any new decision as a row in docs/DECISIONS.md.
- Never build items from docs/IDEAS.md unless the owner asks.
- Never put secrets in code, chat or git. Use .env.example; the owner fills .env.local.
- Do not invent design. Follow docs/DESIGN.md. All visual UI only in src/components/ui/.
- Text rule: minimal text everywhere except lesson/docs content.
- Users are minors: collect minimum data; never expose real names, emails or schools.
- If something in SPEC is unclear or contradictory, ask the owner instead of guessing.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
