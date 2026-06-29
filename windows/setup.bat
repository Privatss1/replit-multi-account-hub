@echo off
title Replit Hub — Setup
color 0A
echo.
echo  ============================================
echo   Replit Hub — First-time Setup
echo  ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found!
    echo.
    echo  Please install Node.js 20+ from:
    echo  https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js:
node --version
echo.

:: Install dependencies
echo  Installing dependencies (sql.js, express, cors)...
echo  No native compilation needed - this should be fast.
echo.
cd /d "%~dp0"
npm install

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] npm install failed.
    echo  Try running as Administrator, or check internet connection.
    echo.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   Setup complete!
echo.
echo   Run start-browser.bat to launch Replit Hub
echo  ============================================
echo.
pause
