## 2026-07-07 - Custom Toggle Switches in Dark Mode
**Learning:** Custom toggle controls lack default screen reader semantics and focus outlines. The dark theme necessitates explicit focus-visible rings with offsets to maintain contrast for keyboard users.
**Action:** Always include `role="switch"`, `aria-checked`, `aria-label`, and explicit dark-mode compatible focus utilities on custom interactive elements.
