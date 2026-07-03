## 2024-05-18 - Avoid unnecessary React state re-renders in setInterval
**Learning:** Returning a new array reference from `map()` inside a state setter (like `setAgents`) called by an interval triggers a React re-render even if values haven't changed, leading to unnecessary CPU and disk I/O (from useEffect watchers).
**Action:** Always use a `hasChanges` flag inside the setter's callback to determine if a new array reference should be returned, otherwise return the previous state reference.
