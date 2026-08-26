## 2025-03-09 - Accessible Modal Close Buttons
**Learning:** Custom UI modal close buttons using textual icons like `[X]` or `[ESC]` without aria labels are a recurring accessibility issue in this app.
**Action:** When creating or auditing custom UI close buttons, always wrap textual icons in `<span aria-hidden="true">` and add an explicit `aria-label` to the parent button to ensure screen reader compatibility, alongside focus-visible styling for keyboard accessibility.
