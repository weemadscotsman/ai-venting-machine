## 2024-06-27 - [Agent Roster O(N) Re-render Bottleneck]
**Learning:** Frequent state changes (`activeSpeaker` updates every 2.5 seconds during a vent session) in a parent component (`App.tsx`) caused the entire 12-agent roster list to re-render, despite individual agent data not changing.
**Action:** Extract list items into separate components wrapped in `React.memo` to prevent unnecessary re-renders when parent state unrelated to the child item updates.
