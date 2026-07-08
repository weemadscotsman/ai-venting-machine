## 2024-06-03 - Added ARIA labels and focus outlines to buttons
**Learning:** Icon-only and non-descriptive buttons across the app lacked ARIA labels and focus-visible outlines, making them inaccessible for keyboard navigation and screen readers.
**Action:** Added `aria-label` and explicit `focus-visible` classes (e.g. `focus-visible:ring-cyan-500`) to improve keyboard and screen reader accessibility on multiple buttons.
