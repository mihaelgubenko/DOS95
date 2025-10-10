@echo off
chcp 65001 >nul
title DOS Web System - Installation

echo ╔════════════════════════════════════════════════════════════╗
echo ║                 DOS Web System v1.0                        ║
echo ║           Installation and Configuration                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js:
    echo 1. Go to https://nodejs.org
    echo 2. Download the LTS version
    echo 3. Install and restart this script
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version
echo.

REM Install dependencies
echo [1/3] Installing npm packages...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Create .env file
echo [2/3] Configuring settings...
if not exist ".env" (
    copy .env.example .env >nul
    echo [OK] Created .env file
) else (
    echo [INFO] .env file already exists
)
echo.

REM Instructions
echo [3/3] Final setup
echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │ IMPORTANT: OpenAI API Setup (optional)                     │
echo ├────────────────────────────────────────────────────────────┤
echo │                                                            │
echo │ To use the DOCTOR command with GPT-4O:                    │
echo │                                                            │
echo │ 1. Open the .env file in a text editor                    │
echo │ 2. Add your OpenAI API key:                               │
echo │    OPENAI_API_KEY=sk-your-key-here                        │
echo │                                                            │
echo │ Get your key at: https://platform.openai.com/api-keys     │
echo │                                                            │
echo │ Without an API key, DOCTOR will work as classic           │
echo │ ELIZA without GPT-4O                                       │
echo │                                                            │
echo └────────────────────────────────────────────────────────────┘
echo.
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║            Installation completed successfully! ✓          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo To start the server run:
echo   - start.bat (Windows)
echo   - npm start (any OS)
echo.
echo Then open your browser: http://localhost:3000
echo.

pause

