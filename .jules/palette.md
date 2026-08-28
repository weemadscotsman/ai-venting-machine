## 2026-08-28 - Screen Reader Accessibility for Text-Based Icons
**Learning:** Screen readers attempt to read decorative text symbols like `[ESC]`, `[X]`, and `✕` verbatim, which leads to confusing auditory experiences for users expecting clear interactive controls.
**Action:** When using text characters or symbols as visual icons inside interactive elements (like close buttons), explicitly wrap them in `<span aria-hidden="true">` and provide a semantic `aria-label` (e.g., `aria-label="Close"`) on the parent `<button>` to ensure proper accessibility.
