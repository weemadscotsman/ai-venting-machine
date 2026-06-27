## 2024-05-24 - Toggle Switch Accessibility Insight
**Learning:** Discovered that icon-only toggle buttons (like the Eternal Mode switch) need both `aria-pressed` to reflect state to screen readers and `aria-label` because they lack semantic text content.
**Action:** Always ensure custom toggle controls have explicitly bound `aria-pressed` tied to their boolean state alongside clear `aria-label` properties.
