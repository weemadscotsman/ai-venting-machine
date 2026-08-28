## 2024-10-26 - Memoizing React List Items
**Learning:** Updating a single item's state (like playback state) in a large list causes the entire list to re-render in React, leading to performance bottlenecks.
**Action:** Extract list items into their own components wrapped in `React.memo()`. Pass stable callbacks using `useCallback()`, combined with the latest-ref pattern (`useRef`) when needed to avoid stale closures while maintaining a stable function reference.
