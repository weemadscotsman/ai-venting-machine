## 2024-10-27 - Icon-Only Button Accessibility
**Learning:** Found multiple instances of icon-only buttons (like `[X]`, `[ESC]`, `✕`) functioning as modal close buttons without proper ARIA labels or keyboard focus indication, breaking accessibility.
**Action:** Always add `aria-label` to the `<button>`, `aria-hidden="true"` to the decorative text/icon within, and explicit `focus-visible` outline styles (especially important on dark themes) for keyboard users.
