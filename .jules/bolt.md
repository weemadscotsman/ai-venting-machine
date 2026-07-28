## 2026-07-28 - Extract MessageItem to Prevent Unnecessary List Renders
**Learning:** Extracting list items into separate components and wrapping them in `React.memo()` prevents the entire list from re-rendering when a single item's state changes.
**Action:** Extract list items into their own components wrapped in `React.memo()` and use stable callbacks (e.g., `useCallback`) to avoid stale closures while maintaining a stable function reference.
