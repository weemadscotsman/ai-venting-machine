## 2026-07-15 - Directory Traversal in Custom Static Asset Server
**Vulnerability:** The proxy server's static asset handler at `api/proxy.cjs` directly appended user-provided URLs (`req.url`) to the base directory path without validation (`path.join(__dirname, '..', 'dist', req.url)`). This allowed attackers to use directory traversal sequences (like `/assets/../../api/.env`) to access files outside the intended `dist` directory, exposing sensitive secrets.
**Learning:** Even when serving static files via a custom server or proxy, `path.join` is insufficient to prevent traversal. URLs are not automatically decoded or bounded by the filesystem. A malicious path string can still resolve to a parent directory unless explicitly restricted.
**Prevention:** When serving files based on user input, always decode the URL, resolve it to an absolute path using `path.resolve`, and explicitly verify that the resolved path starts with the intended base directory (including the path separator, e.g., `.startsWith(basePath + path.sep)`) before serving the file.
## 2025-03-05 - Remove hardcoded API keys from launch scripts
**Vulnerability:** Hardcoded Moonshot API keys were found in launch.cjs, launcher.bat, and start-vent.bat.
**Learning:** Hardcoded credentials in source code can easily be leaked to version control or third parties. They were likely added for convenience during development.
**Prevention:** Always use environment variables or a configuration manager for sensitive credentials. Do not commit secrets to the repository.
