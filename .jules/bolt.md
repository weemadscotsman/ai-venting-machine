## 2024-05-19 - List rendering optimization
**Learning:** In React, rendering long lists of complex components without memoization causes unnecessary re-renders of the entire list whenever a single item changes or when the parent component re-renders (e.g. during a typing effect or adding a new message).
**Action:** Extract list items into their own components wrapped in `React.memo()`. Pass stable callbacks using `useCallback()` to avoid breaking memoization.
