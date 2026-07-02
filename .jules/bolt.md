## 2026-07-02 - Unnecessary Array References in Interval State Setters
**Learning:** Interval-based state setters that unconditionally use `.map()` generate new array references on every tick, even if no values change. In React, this triggers a re-render and, in this app, cascades into unnecessary disk I/O through `useEffect` hooks writing to localStorage on state change.
**Action:** Always use a `hasChanges` flag or similar mechanism to conditionally return the exact previous state reference if no mutations actually occurred, preventing redundant render cycles and side effects.
