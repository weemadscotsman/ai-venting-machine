## 2025-03-09 - Avoid Unnecessary List Re-renders
**Learning:** Returning inline callback functions inside large mapped lists causes unnecessary React re-renders on every iteration when any state changes (like an individual audio playback state), significantly degrading frontend performance in real-time streaming components.
**Action:** Extract list items into their own standalone components wrapped with `React.memo()`, and pass down stable callbacks utilizing `useCallback()` and the latest-ref pattern (`useRef`) to maintain the same function reference without encountering stale closures.
