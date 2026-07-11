## 2025-03-09 - Accessible Dark Theme Switch
**Learning:** Custom UI switches in dark-themed applications require explicit focus-visible utilities because default browser outlines often fail to provide sufficient contrast against dark backgrounds.
**Action:** When implementing custom toggles, always ensure `role="switch"`, `aria-checked`, `aria-label`, and high-contrast `focus-visible` styles are included.
