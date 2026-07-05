## 2026-07-05 - Custom UI Toggles Require Explicit Accessibility
**Learning:** Custom UI toggles (switches) created with standard buttons lack semantic meaning for screen readers and their default focus outlines are often invisible against the app's dark theme backgrounds.
**Action:** Always include `role="switch"`, `aria-checked`, and `aria-label` on custom toggles, and use explicit focus-visible utilities (e.g., `focus-visible:ring-cyan-500 focus-visible:ring-offset-[#050505]`) to ensure keyboard users have clear visual feedback in dark-themed UI.
