## 2024-05-18 - Memoizing Interval-Driven Lists
**Learning:** Interval-driven parent components (like `App` rendering based on frequent updates to `systemPressure` and `cooldown`) cause cascading re-renders across expensive list items (`agents.map`).
**Action:** Always extract list items into a separate component and wrap them with `React.memo` to prevent O(N) rendering work when unrelated parent state changes frequently.
