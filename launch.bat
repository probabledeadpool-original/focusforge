@echo off
setlocal enabledelayedexpansion
title FocusForge Launcher
cd /d "%~dp0"

echo ===================================================
echo             Launching FocusForge...
echo ===================================================

:: Check if server is already running on port 3000
netstat -ano | findstr ":3000.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Server is already running. Opening FocusForge...
    goto open_browser
)

:: Start Next.js development server minimized
echo [INFO] Starting FocusForge server...
start "FocusForge Server" /min cmd /c "npm run dev"

:: Wait for server to become ready
echo [INFO] Waiting for server to initialize...
:wait_loop
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":3000.*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    goto wait_loop
)

:open_browser
echo [INFO] Opening FocusForge App Window...

:: Try launching in Edge App Mode
start msedge --app=http://localhost:3000 2>nul
if %errorlevel% equ 0 goto done

:: Fallback to Chrome App Mode
start chrome --app=http://localhost:3000 2>nul
if %errorlevel% equ 0 goto done

:: Fallback to default browser
start http://localhost:3000

:done
echo [SUCCESS] FocusForge is ready!
exit /b 0
