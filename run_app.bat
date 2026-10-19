@echo off
title DERMAClass-Net Platform Launcher
echo ========================================================
echo Starting DERMAClass-Net Doctor Medical AI Platform...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching FastAPI Backend (Port 8000)...
start "DERMAClass Backend API" cmd /k "python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching React Vite Frontend (Port 5173)...
start "DERMAClass Frontend" cmd /k "npm run dev"

echo.
echo Both servers are launching in separate windows!
echo Once loaded, open your browser at:
echo http://localhost:5173
echo.
pause
