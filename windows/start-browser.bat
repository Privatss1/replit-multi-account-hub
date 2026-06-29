@echo off
title Replit Hub — Browser Mode
cd /d "%~dp0"
color 0A

echo.
echo  ==========================================
echo   Replit Hub — Starting...
echo  ==========================================
echo.

:: Check node_modules
if not exist "node_modules\sql.js" (
    echo  [!] Running first-time setup...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] npm install failed!
        echo  Make sure Node.js is installed: https://nodejs.org
        echo.
        pause
        exit /b 1
    )
)

echo  [OK] Starting server on http://localhost:7891
echo  [OK] Opening browser...
echo.
echo  Keep this window open while using Replit Hub.
echo  Press Ctrl+C to stop.
echo.

:: Open browser after short delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start "" http://localhost:7891"

:: Run server in foreground (shows errors clearly)
node server.cjs

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Server crashed! See error above.
    echo.
    pause
)
