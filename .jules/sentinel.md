## 2026-07-06 - Path Traversal in Static Asset Server
**Vulnerability:** The proxy server's static asset handler concatenated `req.url` directly using `path.join` without bounds checking, allowing arbitrary file read via path traversal payloads (`/assets/../../../../etc/passwd`).
**Learning:** Naively using `path.join` with user-controlled input fails to validate that the resolved path stays within intended directory bounds, especially when serving static assets manually.
**Prevention:** Always decode user input (`decodeURIComponent`), prepend `.` to prevent absolute path injection, resolve the absolute path (`path.resolve`), and enforce a strict bounds check (`resolvedPath.startsWith(basePath + path.sep)`).
