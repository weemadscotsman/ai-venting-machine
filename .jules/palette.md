## 2024-05-18 - Missing label associations in Modals
**Learning:** Found a pattern of missing `htmlFor` attributes linking `<label>` elements to inputs in modal components like `UserCrisisModal.tsx`, reducing form accessibility for screen readers and click-to-focus behaviors.
**Action:** Always ensure custom forms and modals include proper explicit associations using matching `id` and `htmlFor` attributes, especially when dealing with native input elements wrapped in custom styling.
