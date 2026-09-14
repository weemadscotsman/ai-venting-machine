## 2024-05-20 - Accessible text-based icon buttons
**Learning:** Text-based symbols used as icons (like `[X]` or `[ESC]`) are read aloud awkwardly by screen readers, confusing users who expect standard actionable descriptions.
**Action:** When a button's content is purely a text symbol, provide a descriptive `aria-label` on the `<button>` and wrap the symbol itself in `<span aria-hidden="true">` to prevent it from being incorrectly announced while preserving visual styling.
