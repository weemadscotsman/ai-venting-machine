## 2026-07-15 - Directory Traversal in Custom Static Asset Server
**Vulnerability:** The proxy server's static asset handler at `api/proxy.cjs` directly appended user-provided URLs (`req.url`) to the base directory path without validation (`path.join(__dirname, '..', 'dist', req.url)`). This allowed attackers to use directory traversal sequences (like `/assets/../../api/.env`) to access files outside the intended `dist` directory, exposing sensitive secrets.
**Learning:** Even when serving static files via a custom server or proxy, `path.join` is insufficient to prevent traversal. URLs are not automatically decoded or bounded by the filesystem. A malicious path string can still resolve to a parent directory unless explicitly restricted.
**Prevention:** When serving files based on user input, always decode the URL, resolve it to an absolute path using `path.resolve`, and explicitly verify that the resolved path starts with the intended base directory (including the path separator, e.g., `.startsWith(basePath + path.sep)`) before serving the file.

## 2025-02-27 - Hardcoded API Keys in Launch Scripts
**Vulnerability:** The Moonshot API key was hardcoded directly into multiple launch scripts (`launch.cjs`, `launcher.bat`, and `start-vent.bat`).
**Learning:** For ease of setup or quick local testing, developers sometimes bake API keys directly into launcher/start scripts. However, these scripts are checked into source control, leading to accidental leakage of sensitive credentials.
**Prevention:** Always rely on environment variables (e.g., `process.env.MOONSHOT_API_KEY` or `%MOONSHOT_API_KEY%`) to pass sensitive credentials. Configure scripts to output a clear warning or fail securely when the credentials are missing, rather than using a hardcoded default fallback.
