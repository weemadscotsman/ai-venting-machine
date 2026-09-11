## 2024-09-11 - Symbol-Only Buttons Accessibility
**Learning:** Found an accessibility pattern across modal dialogs where "close" functionality relied entirely on text characters (`[X]`, `✕`, `[ESC]`) without semantic descriptors. Screen readers would announce these literally (e.g., "Left bracket X right bracket") which creates a confusing UX for non-visual users.
**Action:** When using raw text characters as icons for buttons, they should be wrapped in an `aria-hidden="true"` span, and the parent button must receive a descriptive `aria-label` (e.g., "Close modal").
