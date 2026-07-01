## 2025-10-24 - Accessibility for Eternal Mode Switch
**Learning:** The custom toggle switch for 'Eternal Mode' in `LeverControl.tsx` was missing vital ARIA attributes, causing screen readers to be unaware of its function and state. Explicit focus-visible utilities are also needed for keyboard navigation, particularly in dark-themed applications.
**Action:** Always add `role="switch"`, `aria-checked`, and an `aria-label` to custom UI switches. Additionally, provide clear `focus-visible` classes to ensure keyboard accessibility.
