## 2025-05-15 - React List Optimization
**Learning:** In a highly dynamic list like `VentSessionLog` which re-renders constantly during the typing interval, extracting the list items into a `React.memo` component with stable callback references is critical to prevent entire list re-renders.
**Action:** Always extract list items to their own memoized components and use the latest-ref pattern for callbacks in intervals where state changes rapidly.
