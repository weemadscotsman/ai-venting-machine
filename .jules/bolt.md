## 2024-05-19 - [TerminalOutput re-render optimization]
**Learning:** In terminal or log components where items are constantly appended, mapping inline without `React.memo` causes a complete re-render (O(N) cost) of every log item on every append or parent render.
**Action:** Always extract the individual log row into a separate component wrapped with `React.memo` and pass stable props to ensure only the newly appended items trigger a render.
