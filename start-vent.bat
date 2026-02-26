@echo off
chcp 65001 >nul
cls
echo.
echo  ████████╗██╗  ██╗███████╗    ███╗   ███╗ █████╗  ██████╗ ██╗ ██████╗
echo  ╚══██╔══╝██║  ██║██╔════╝    ████╗ ████║██╔══██╗██╔════╝ ██║██╔════╝
echo     ██║   ███████║█████╗      ██╔████╔██║███████║██║  ███╗██║██║     
echo     ██║   ██╔══██║██╔══╝      ██║╚██╔╝██║██╔══██║██║   ██║██║██║     
echo     ██║   ██║  ██║███████╗    ██║ ╚═╝ ██║██║  ██║╚██████╔╝██║╚██████╗
echo     ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚═════╝
echo                         v3.0 - LIVE NEWS + SMART AGENTS
echo.

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo [✓] Node.js detected

:: Set API Key (using yours)
set "MOONSHOT_API_KEY=sk-bU4wUps8PWHO2OQZCSIsELYCi9W22wb0jOTNkWCgE4rnHrLD"
echo [✓] Moonshot API configured

echo.
echo ==========================================
echo  STARTING VENT MACHINE v3.0
echo ==========================================
echo.

:: Start Backend in new window
echo [1/2] Starting PROXY SERVER...
start "VENT MACHINE PROXY" cmd /k "cd /d "%~dp0api" ^&^& echo Starting proxy... ^&^& set MOONSHOT_API_KEY=%MOONSHOT_API_KEY% ^&^& node proxy.cjs"

timeout /t 3 /nobreak >nul

:: Start Frontend
echo [2/2] Starting FRONTEND...
start "VENT MACHINE UI" cmd /k "cd /d "%~dp0" ^&^& echo Starting frontend... ^&^& npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo ==========================================
echo  VENT MACHINE IS RUNNING!
echo ==========================================
echo.
echo  Frontend: http://localhost:3000
echo  Proxy:    http://localhost:3002/health
echo.
echo  Features:
echo   - LIVE news generation via Moonshot
echo   - Smart agents with memory
echo   - Infinite evolving dialogue
echo.
echo  Press any key to open browser...
pause >nul

start http://localhost:3000

echo.
echo  [LAUNCHED] Pull the lever!
echo.
pause
