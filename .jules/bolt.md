## 2026-07-10 - Array Reference Identity in Interval State Setters
**Learning:** Returning a new array reference from a state setter unconditionally during intervals causes unnecessary React re-renders and side-effects (like disk I/O from localStorage writes), even if the actual data hasn't changed.
**Action:** When mapping over state in an interval, use a `hasChanges` flag. If no items are modified, return the previous array reference (`prev`) to bail out of the re-render cycle and side-effects.
