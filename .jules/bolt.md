## 2024-05-18 - React.memo on large arrays (Terminal Logs)
**Learning:** Rendering a continuously growing array like Terminal output without memoizing the list items results in O(N) re-renders, causing severe performance drops as the list grows, especially for long-running sessions. The `getPriorityColor` static helper being re-created on each list item also added overhead.
**Action:** Extract large array list items into their own components wrapped in `React.memo()`. Also move static utility functions outside the component to prevent recreating the function reference on every render.
