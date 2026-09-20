
## 2024-05-15 - Terminal-style Close Buttons Accessibility
**Learning:** Text-based symbols used for UI actions (like `[X]` or `[ESC]` for closing modals) to fit a terminal or cyber theme cause confusing experiences for screen reader users, who hear literal bracket characters instead of an action description.
**Action:** Always wrap these text symbols in a `<span aria-hidden="true">` to hide them from assistive technologies, and add an explicit `aria-label` (e.g., `aria-label="Close modal"`) to the parent button, along with visible focus styles for keyboard users.
