## 2026-06-30 - Custom Switch Accessibility
**Learning:** Custom UI switches (like the Eternal Mode toggle) in this app lack native semantic roles (like switch) and focus-visible styling against the dark background, making them inaccessible to screen readers and keyboard users.
**Action:** Always add `role="switch"`, `aria-checked`, `aria-label`, and explicit focus-visible utilities (e.g., `focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`) to custom toggle controls.
