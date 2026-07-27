## 2025-02-28 - VentSessionLog List Rendering Optimization
**Learning:** In React components with rapidly growing lists (like chat logs), mapping inline elements causes full list re-renders. A stable callback alone is not enough if the item isn't memoized.
**Action:** Extract list items into separate components wrapped in React.memo and use the latest-ref pattern for stable callbacks.
