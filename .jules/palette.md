
## 2026-09-27 - Text-based Symbol Screen Reader Issues
**Learning:** Text-based symbols like `[X]`, `[ESC]`, or `✕` inside close buttons cause confusing screen reader announcements.
**Action:** Wrap these text-based symbols in a `<span aria-hidden="true">`, add an explicit `aria-label` to the parent `<button>`, and ensure `focus-visible` utility classes are applied for keyboard accessibility.
