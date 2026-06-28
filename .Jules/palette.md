## 2024-06-28 - Reusable Focus Visible Pattern for Custom Controls
**Learning:** Custom interactive elements (like the Lever controls) in this dark-themed app need highly visible focus states for keyboard users. The standard outline is often invisible against the complex backgrounds.
**Action:** Use a consistent `focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900` (or `ring-4` for larger elements) pattern on custom buttons/switches to ensure keyboard accessibility while maintaining the design language.
