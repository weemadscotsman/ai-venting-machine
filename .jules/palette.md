
## 2024-05-14 - Textual Symbol Buttons Keyboard Accessibility
**Learning:** In dark-themed applications, interactive buttons that rely purely on text symbols (like `[ESC]` or `⚙`) often lack proper screen reader labels and clear keyboard focus states by default. Relying on default browser focus outlines may result in low contrast against dark backgrounds.
**Action:** Always add explicit `aria-label`s to symbol-only buttons, wrap the symbols in `<span aria-hidden="true">` to prevent screen readers from reading raw symbols, and apply explicit `focus-visible:ring-2` utility classes with appropriate offset colors (e.g., `focus-visible:ring-offset-gray-900`) for high-contrast keyboard navigation on dark surfaces.
