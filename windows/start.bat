@echo off
title Replit Hub
cd /d "%~dp0"

:: Check if node_modules installed
if not exist "node_modules" (
    echo  Dependencies not installed. Running setup...
    call setup.bat
)

echo  Starting Replit Hub (Desktop)...
npx electron . 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  [WARN] Electron failed. Falling back to browser mode...
    call start-browser.bat
)
