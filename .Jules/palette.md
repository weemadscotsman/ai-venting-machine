## 2024-07-13 - Add custom switch accessibility
**Learning:** Custom UI switches in dark-themed apps require explicit focus-visible utilities (e.g., `focus-visible:ring-cyan-500 focus-visible:ring-offset-gray-900`), `role="switch"`, `aria-checked`, and `aria-label` for proper screen reader and keyboard accessibility.
**Action:** Ensure all custom toggle/switch controls use these attributes and explicit focus-visible utilities against dark backgrounds.
