## 2025-03-09 - Memoizing List Items to Prevent Mass Re-renders

**Learning:** When rendering lists of components that contain local interaction state or are subject to frequent updates (like `loadingAudioId` and `playingAudioId` in `VentSessionLog.tsx`), passing those states directly to the map loop causes the entire list to re-render whenever *one* item's state changes.

**Action:** Extract list items into their own components wrapped in `React.memo()`. Crucially, when passing callbacks (like `onPlayAudio`) that depend on the parent's latest state, use the `useRef` + `useCallback` latest-ref pattern to provide a stable function reference without introducing stale closures. This allows `React.memo` to effectively bypass re-rendering for items whose props have not meaningfully changed.
