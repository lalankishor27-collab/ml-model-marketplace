@echo off
title ML Model Marketplace Launcher
color 0A

echo ===================================================
echo     Launching ML Model Marketplace Full Stack
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "ML Marketplace - Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "ML Marketplace - Frontend" cmd /k "cd /d %~dp0frontend && npx vite --port 5173"

timeout /t 3 /nobreak >nul

echo.
echo ===================================================
echo Application is now running!
echo - Frontend UI:  http://localhost:5173
echo - Backend API:  http://localhost:8000 (Docs: /docs)
echo ===================================================
echo.
echo Opening browser...
start http://localhost:5173
