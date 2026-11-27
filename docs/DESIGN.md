# Design rules
Status: FINAL design system v1 (variant B, "deep blue + coral"), applied 2026-11-27.
All visual code lives in `src/components/ui/` (tokens in `src/components/ui/theme.css`).
Pages and logic never write their own Tailwind color/spacing classes; they compose ui components.

## Tokens (use these names, never raw hex in components)
- Surfaces: `page` (#0b1a2e), `deep` (#081424, inputs/terminal), `card` (#12273f), `card-hover`.
- Lines: `line`, `line-strong`. Text: `ink`, `ink-muted`, `ink-subtle`.
- One accent: `accent` (#ff7a59 coral), `accent-hover`, `accent-soft`, text on it `on-accent`.
- Status only: `ok` / `ok-soft` (correct, solved), `bad` / `bad-soft` (wrong answer, errors).
- Radius: controls `rounded-xl`, cards `rounded-2xl`. Font: Geist / Geist Mono.

## Motion
- Allowed: `animate-rise` (things appearing), `animate-pop` (success, rewards), `animate-shake`
  (wrong answer), `animate-flash` (highlight a difference once), short hover lifts and
  width/position transitions (progress bars, the `::steps` track).
- Motion only answers something the student did or something appearing. No looping decoration.
- Under 1 second. `prefers-reduced-motion` turns it off (handled in theme.css).
- CSS/SVG only; no animation libraries (must stay fast on cheap phones).

## Rules that will not change
- Minimal text everywhere (names, labels, buttons). No descriptions under titles, no
  marketing sentences, no "how it works 1-2-3" sections. Exception: lesson/docs content.
- No gradients, glassmorphism, blur/glow, emoji icons, stock or AI illustrations, lorem ipsum,
  centered hero + 3 feature cards, all-black "hacker" look.
- Category tiles: icon + name only.
- Mobile-first (390px), touch targets >= 44px, readable contrast.
- Lesson reading areas must be comfortable for long text (max ~68 characters per line).
- Diagrams are rendered from code (::diagram, ::steps, ::compare), never image files.
- Lesson page layout stays as SPEC: tasks (accordion) left, terminal right.
