## 2024-07-25 - Improve icon-only buttons accessibility
**Learning:** Icon-only buttons (like modal close buttons `[X]` or `[ESC]` or `⚙`) often lack proper `aria-label` attributes for screen readers, and screen readers may incorrectly announce decorative icons if `aria-hidden="true"` is missing.
**Action:** Always add `aria-label` to icon-only buttons and `aria-hidden="true"` to their internal textual icons/symbols.
