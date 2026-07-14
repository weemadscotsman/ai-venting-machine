## 2024-05-31 - Safe Path Resolution in Custom File Server
**Vulnerability:** Path traversal (Directory Traversal) vulnerability in the custom Node.js proxy server serving static files via `path.join`.
**Learning:** `path.join` does not prevent path traversal if user input contains `../` sequences. A malicious user could request `/assets/../../api/.env` and retrieve sensitive environment variables.
**Prevention:** Always decode user input URLs, resolve absolute paths using `path.resolve` and `path.normalize`, and explicitly validate that the resolved path starts with the intended base directory (including a path separator, e.g., `.startsWith(basePath + path.sep)`) to prevent traversal and sibling directory bypass.
