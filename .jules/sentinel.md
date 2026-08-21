## 2025-02-28 - [DoS via Unbounded Request Bodies]
**Vulnerability:** The proxy server concatenated POST data without size limits, allowing attackers to exhaust memory (DoS).
**Learning:** Node.js native HTTP server `req.on('data')` streams data. It's critical to manually track accumulated length and abort (`req.destroy()`) if it exceeds reasonable bounds. Also, `req.on('end')` still fires after `destroy()`, requiring a `req.destroyed` check.
**Prevention:** Always enforce a payload limit (e.g., 1MB) on POST endpoints when buffering incoming request bodies.
