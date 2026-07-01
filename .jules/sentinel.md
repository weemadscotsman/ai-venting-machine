## 2025-03-01 - Fix Path Traversal in Static File Server
**Vulnerability:** The proxy server (`api/proxy.cjs`) served static assets by directly passing `req.url` to `path.join`, allowing path traversal attacks via `../` to access unauthorized files outside the `dist` directory.
**Learning:** Naively joining paths with unsanitized user input (like `req.url`) is dangerous.
**Prevention:** Always decode the URL, resolve to an absolute path, and explicitly verify that the resolved path starts with the intended base directory using `.startsWith()`.
