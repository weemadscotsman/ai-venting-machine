
## 2026-08-29 - Enhanced Modal Accessibility
**Learning:** Icon-only close buttons like [X] and [ESC] were inaccessible to screen readers and difficult to navigate via keyboard.
**Action:** Applied `aria-label`, `aria-hidden` on the text symbols, and explicit `focus-visible` utility classes to modal close buttons.
