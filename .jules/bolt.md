## 2024-05-18 - Avoid Callback Dependency Invalidations with Latest-Ref Pattern

**Learning:** When passing callbacks as props to `React.memo` components, using dependencies inside `React.useCallback` that change frequently (like state variables or API keys) defeats the memoization, as the function reference updates and triggers re-renders anyway.

**Action:** Use the "latest-ref" pattern (`const ref = useRef(value); useEffect(() => { ref.current = value }, [value])`) inside the parent component. This allows the memoized callback (with an empty dependency array) to access the latest value via `ref.current` without ever changing its own function reference, successfully preserving child memoization.
