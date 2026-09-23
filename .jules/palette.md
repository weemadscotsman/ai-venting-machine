## 2024-05-18 - Missing label htmlFor associations in SettingsModal and UserCrisisModal
**Learning:** Found multiple instances where labels were not associated with their inputs using the `htmlFor` attribute.
**Action:** Always verify that `<label>` elements have an `htmlFor` attribute that strictly matches the `id` of their target input element.
