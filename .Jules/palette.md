## 2024-05-18 - Accessible Visual Selectors
**Learning:** Custom visual-only selectors (like color dots) need semantic labels (`aria-label`), pressed states (`aria-pressed`), and keyboard focus (`focus-visible`) to be accessible to keyboard and screen reader users. They should also be logically grouped (e.g. `role="group"`).
**Action:** When implementing custom visual selection UI components, ensure they have proper ARIA attributes, semantic grouping, and visible focus states instead of relying solely on visual cues like colors and borders.
