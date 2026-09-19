## 2023-11-20 - Grouping Interactive Elements for Accessibility
**Learning:** For generic grouped interactive elements (like a list of buttons for color selection or provider options) that are incorrectly wrapped in a `<label>`, screen readers may announce them confusingly or associate them incorrectly.
**Action:** Replace the `<label>` with a `div id="..."` and wrap the interactive group in a container with `role="group"` and `aria-labelledby="..."` to comply with semantic grouping rules and provide clear context for screen reader users.
