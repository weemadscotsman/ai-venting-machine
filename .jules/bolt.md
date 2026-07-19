## 2025-03-08 - React.memo in Chat List
**Learning:** Re-rendering an entire list of chat items in a React component every time a single item updates its state (e.g. playing audio) or a new item is appended can lead to significant main thread blocking and lag. By default React updates all children elements if the parent re-renders.
**Action:** Extract list items into their own memoized component (e.g., `VentMessageItem` wrapped in `React.memo()`) and pass stable callback references using `useCallback()` to prevent unnecessary re-renders of list items that haven't changed.
