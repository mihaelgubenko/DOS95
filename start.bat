@echo off
chcp 65001 >nul
title DOS95 - Server Launch

echo ╔════════════════════════════════════════════════════════════╗
echo ║               DOS95 v1.1.0 - Windows 95                   ║
echo ║              Starting server...                            ║
echo ║                                                            ║
echo ║   Windows 95: http://localhost:3000                       ║
echo ║   DOS:        http://localhost:3000/dos                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Download and install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check for node_modules
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check for .env file
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo.
    echo [INFO] Edit the .env file and add your OpenAI API key
    echo       (or leave empty to work with local ELIZA)
    echo.
    pause
)

echo.
echo [OK] Starting server...
echo [OK] Browser will open automatically...
echo.
echo Press Ctrl+C to stop
echo.

REM Open browser after 2 seconds - Windows 95 interface
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/win95.html"

node server.js

pause

