## 2024-10-18 - Prevent Unnecessary Re-renders in Large Lists
**Learning:** Extracting list items into separate components wrapped with `React.memo` and using the latest-ref pattern for stable callbacks prevents the entire list from re-rendering when a single item changes (like playback state) or when a new item is appended.
**Action:** Always memoize list item components and use stable callbacks (via `useCallback` + `useRef` for latest state) when rendering large or frequently updated lists.
