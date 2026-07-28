## 2023-11-20 - [Denial of Service in Custom Proxy Server]
**Vulnerability:** Unbounded payload reading in POST API endpoints allows a Denial of Service via memory exhaustion.
**Learning:** Naively accumulating request bodies via `req.on('data', chunk => body += chunk);` without bounds checking in Node.js HTTP servers exposes the server to DoS attacks. Additionally, error handling in asynchronous event callbacks (like `end`) needs to check if the connection was already destroyed (e.g. `if (req.destroyed) return;`) to prevent downstream parsing failures when the request is forcefully aborted.
**Prevention:** Always implement payload size limits on incoming requests (e.g., limit bodies to 1MB) and gracefully handle aborted request lifecycle events when rejecting malformed payloads.
