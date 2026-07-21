@echo off
chcp 65001 >nul
echo 🎭=====================================
echo   VENT MACHINE v4 - KIMI EDITION
echo =====================================
echo.

:: Check for Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Install from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js found

:: Check Moonshot API Key
if "%MOONSHOT_API_KEY%"=="" (
    echo ❌ MOONSHOT_API_KEY environment variable is not set!
    echo Please set it before running the script.
    pause
    exit /b 1
) else (
    echo 🔑 Using environment MOONSHOT_API_KEY
)

echo.
echo 🚀 Starting services...
echo.

:: Start Backend Proxy
echo [1/3] Starting Backend Proxy on port 3002...
start "Vent Machine Proxy" cmd /c "cd /d "%~dp0api" && set MOONSHOT_API_KEY=%MOONSHOT_API_KEY% && node proxy.cjs && pause"

timeout /t 2 /nobreak >nul

:: Test backend
echo [2/3] Testing backend health...
curl -s http://localhost:3002/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Backend not responding yet, continuing anyway...
) else (
    echo ✅ Backend is healthy!
)

:: Start Frontend
echo [3/3] Starting Frontend dev server...
start "Vent Machine Frontend" cmd /c "cd /d "%~dp0" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo =====================================
echo 🎉 VENT MACHINE IS RUNNING!
echo =====================================
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔌 Backend:  http://localhost:3002/health
echo.
echo Provider: MOONSHOT (Kimi AI)
echo Model: moonshot-v1-8k
echo.
echo Press any key to open browser...
pause >nul

:: Open browser
start http://localhost:3000

echo.
echo ✨ Browser opened! Pull the lever!
echo.
pause
