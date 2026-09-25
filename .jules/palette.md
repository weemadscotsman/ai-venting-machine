## 2024-05-23 - Text-Based Icon Buttons Accessibility
**Learning:** Text-based symbol buttons (like `[ESC]`) can be confusing for screen readers, which might announce them literally as "Left bracket E S C right bracket".
**Action:** When using text-based symbols or icons inside buttons, always wrap the content in a `<span aria-hidden="true">` and provide a clear, descriptive `aria-label` on the parent `<button>` to ensure proper accessibility. Additionally, add `focus-visible` classes to ensure the button is navigable via keyboard.
