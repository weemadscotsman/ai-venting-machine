
## 2024-05-18 - Accessible Icon-Only Modal Close Buttons
**Learning:** Found a pattern in the app where symbolic text (`[X]`, `[ESC]`) was used for close buttons without semantic screen reader definitions, while simultaneously being exposed to screen readers as text that could be confusing out of context.
**Action:** When adding `aria-label` to these symbolic, text-based icon buttons, always wrap the inner symbolic text in a `span` with `aria-hidden="true"` to prevent redundant or confusing screen reader announcements, alongside the standard `focus-visible` styles.
