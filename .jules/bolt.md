## 2024-05-24 - Unconditional Array Mapping in Intervals Causes Disk I/O
**Learning:** Unconditionally returning new array references via `map()` in a `setState` interval causes constant React re-renders and, crucially, triggers unnecessary side-effects like localStorage disk I/O, creating a significant performance bottleneck.
**Action:** When updating arrays in intervals, always iterate with a `hasChanges` flag and return the previous array reference (`prev`) if no values actually changed, short-circuiting the update cycle.
