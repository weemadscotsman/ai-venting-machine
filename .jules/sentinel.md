## 2025-02-28 - Hardcoded Credentials in Launch Scripts
**Vulnerability:** A hardcoded `MOONSHOT_API_KEY` was embedded in multiple startup scripts (`launch.cjs`, `launcher.bat`, `start-vent.bat`) used as fallback when the environment variable was missing.
**Learning:** Hardcoded credentials are a critical security risk as they leak API access tokens to anyone with access to the source code, potentially leading to unauthorized usage or billing issues. It was added for developer convenience as a fallback but exposed the key to version control.
**Prevention:** Never use real API keys as fallback strings in source code. Enforce the presence of necessary secrets via environment variables and exit securely with a helpful error message if they are not provided at runtime.
