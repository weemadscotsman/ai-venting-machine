## 2026-07-05 - Fix Path Traversal in Static Asset Proxy
**Vulnerability:** Path traversal vulnerability in `api/proxy.cjs` where `req.url` was concatenated with `path.join` allowing attackers to fetch any file on the filesystem using `../../../` payload.
**Learning:** `path.join` on user-supplied paths, even if prefixed with an expected base directory (like `/assets/`), allows arbitrary file access.
**Prevention:** Use `decodeURIComponent` for encoded payloads, then use `path.resolve` concatenating explicitly with the base path, and finally enforce that the resolved absolute path starts with `basePath + path.sep`.
