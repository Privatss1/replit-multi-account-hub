@echo off
title Replit Hub — Build Windows Installer
cd /d "%~dp0"

echo  Building Windows installer (.exe)...
echo  This may take a few minutes...
echo.

npm install
npx electron-builder --win --x64

echo.
if %errorlevel% equ 0 (
    echo  [OK] Installer created in: dist\
    explorer dist
) else (
    echo  [ERROR] Build failed. Check the output above.
)
pause
