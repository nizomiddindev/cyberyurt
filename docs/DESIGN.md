# Design rules
Status: TEMPORARY. Use plain neutral Tailwind styling until the final design system files
are provided; then replace src/components/ui/ only.
Rules that will not change:
- Minimal text everywhere (names, labels, buttons). No descriptions under titles, no
  marketing sentences, no "how it works 1-2-3" sections. Exception: lesson/docs content.
- No gradients, glassmorphism, blur/glow, emoji icons, stock illustrations, lorem ipsum,
  centered hero + 3 feature cards.
- Category tiles: icon + name only.
- Mobile-first (390px), touch targets >= 44px, readable contrast.
- Lesson reading areas must be comfortable for long text.
- Diagrams are rendered from code (::diagram, ::steps, ::compare), never image files.
