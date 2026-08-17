## 2024-03-24 - Accessibility: Form Labelling Pattern
**Learning:** Found a recurring pattern in the app's components (`UserCrisisModal`) where standard `<label>` tags were missing the `htmlFor` attribute linking to input `id`s. This causes screen readers to not announce the inputs correctly and breaks clicking on the label text to focus the input.
**Action:** Always verify new forms strictly adhere to `htmlFor` to `id` mappings for all inputs (text, select, textarea, range). Added this mapping to custom crisis inputs.
