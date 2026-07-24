## 2024-05-18 - List Item Re-renders

**Learning:** When dealing with rapidly updating lists (like a live chat log), passing inline functions or unstable callbacks (like one updating state directly) to list items causes the entire list to re-render every time a single item updates (e.g. playback state changes) or a new item is added, leading to severe performance bottlenecks.
**Action:** Extract list items into their own components and wrap them with `React.memo()`. Provide stable callbacks using `useCallback` and the "latest-ref pattern" (`useRef` to store the latest state value) so the function reference does not change on every render, allowing `React.memo` to effectively prevent unnecessary list item re-renders.
