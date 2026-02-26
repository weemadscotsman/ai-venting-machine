@echo off
echo ==========================================
echo AI VENTING MACHINE - STARTUP
echo ==========================================
echo.

REM Check if API key is set
if "%~1"=="" (
  echo ERROR: No API key provided!
  echo.
  echo Usage: start-with-api.bat YOUR_MOONSHOT_API_KEY
  echo.
  echo Get your API key at: https://platform.moonshot.ai/console/api-keys
  pause
  exit /b 1
)

set MOONSHOT_API_KEY=%~1
echo API Key set: %MOONSHOT_API_KEY:~0,10%...
echo.

cd /d "%~dp0"

echo Starting proxy server...
start "Vent Machine Proxy" cmd /k "cd api && node proxy.cjs"

timeout /t 3 >nul

echo Starting frontend...
npm run dev
