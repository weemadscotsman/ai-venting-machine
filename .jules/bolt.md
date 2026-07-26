## 2024-05-18 - React List Rendering Bottleneck
**Learning:** Appending messages to a list unconditionally triggers O(n) re-renders in React when list items are rendered inline, particularly causing lag in the typing effect of `VentSessionLog` when playback state toggles for individual items.
**Action:** Extract list items into separate components wrapped in `React.memo()`. When passing callbacks to memoized children, ensure the reference is stable using `useCallback` combined with the latest-ref pattern (using `useRef`) to prevent stale closures without breaking the memoization.
