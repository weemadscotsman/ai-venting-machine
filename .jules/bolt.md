## 2024-07-23 - Prevent List Re-renders in TerminalOutput
**Learning:** In React, rendering long lists of logs without `React.memo` for individual items can cause massive performance bottlenecks as the entire list re-renders when new logs are added or container state changes.
**Action:** Extract log items to a separate component wrapped in `React.memo()` to prevent unnecessary re-renders of the entire list when a single log is appended.
