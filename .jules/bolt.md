## 2024-05-18 - First Read
**Learning:** Found an existing `.jules/bolt.md` logic that I need to preserve. Wait, checking if it exists.
## 2024-05-18 - Memoize Vent Session Log
**Learning:** Found that `VentSessionLog` was re-rendering the entire historical log every time a new character was appended or a new message arrived because of how React handles state updates in arrays. Since `VentSessionLog` maps over all messages, replacing it with a `React.memo` component (`VentMessageItem`) prevents unnecessary re-rendering of all historical messages.
**Action:** Extract list items to their own `React.memo` component when rendering chat history or log streams that update frequently, and stabilize functions using `useCallback`.
