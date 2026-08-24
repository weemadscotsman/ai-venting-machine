
## 2024-08-24 - Modal Close Button Accessibility
**Learning:** Found an accessibility issue pattern where modal close buttons using textual symbols (like `[X]` and `[ESC]`) lacked explicit ARIA labels and focus visibility states. This pattern appeared consistently across both `AddAgentModal.tsx` and `SettingsModal.tsx`.
**Action:** Always add explicit `aria-label` attributes to icon-only or symbol-only buttons, wrap decorative textual symbols in `<span aria-hidden="true">`, and include focus-visible utility classes (like `focus-visible:ring-2 focus-visible:ring-cyan-500`) to ensure proper screen reader interpretation and keyboard navigation support.
