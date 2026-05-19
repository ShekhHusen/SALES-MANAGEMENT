@echo off
title Tally Prime Sync Connector
echo ==========================================
echo Starting Tally Prime Sync Connector...
echo ==========================================
echo.
node tally-connector.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Error: Node.js is not installed or not working.
    echo Please install Node.js from https://nodejs.org/ and try again.
)
echo.
pause
