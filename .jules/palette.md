## 2024-05-24 - Symbol-based button accessibility
**Learning:** Buttons using text symbols like `[X]` or `[ESC]` for their label are announced confusingly by screen readers (e.g. "Left bracket X right bracket").
**Action:** Wrap symbol text in a `<span aria-hidden="true">` to hide the characters from screen readers, explicitly add a descriptive `aria-label` to the parent `<button>`, and ensure focus styles (`focus-visible`) are applied.
