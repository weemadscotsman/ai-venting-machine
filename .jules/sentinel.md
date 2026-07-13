## 2026-07-13 - Path Traversal in proxy.cjs
**Vulnerability:** Static asset serving logic in `api/proxy.cjs` used `path.join(__dirname, '..', 'dist', req.url)` which allowed an attacker to request paths like `/assets/../../api/proxy.cjs` to read files outside the `dist` directory.
**Learning:** `path.join` with unsanitized user input allows path traversal using `..`.
**Prevention:** Always decode the URI, securely resolve the path using `path.normalize(path.resolve(basePath, '.' + decodedUrl))`, and explicitly validate that the resolved path is within the intended base directory using `filePath.startsWith(basePath + path.sep)`.
