## 2026-07-09 - Fix Path Traversal in Static File Serving
**Vulnerability:** The custom Node.js proxy server allowed arbitrary file access via path traversal (`../`) in the URL.
**Learning:** Concatenating raw user input (`req.url`) directly into `path.join` without boundary checks allows attackers to escape the intended directory and read sensitive system files.
**Prevention:** Always decode user-provided paths, resolve them safely (prefixing with `.` prevents absolute path resolution), and explicitly verify that the resolved absolute path starts with the intended base directory including a path separator (`basePath + path.sep`).
