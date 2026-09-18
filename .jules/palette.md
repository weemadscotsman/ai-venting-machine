## 2024-05-24 - Text-based Icon Accessibility
**Learning:** Text-based icons like `[X]` or `[ESC]` inside buttons without explicit aria-labels can cause confusing screen reader announcements, especially because `[ESC]` is a key name and `[X]` can be pronounced confusingly.
**Action:** When adding generic text-based symbols for close buttons in modals, wrap the text with a `<span aria-hidden="true">` to prevent it from being announced, and apply an explicit `aria-label="Close..."` on the parent `<button>` for screen readers to accurately read the button's action.
