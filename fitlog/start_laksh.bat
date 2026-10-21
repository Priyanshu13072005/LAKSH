@echo off
title Launch LAKSH Application
echo Starting LAKSH Backend and Frontend...
start "LAKSH Backend" cmd /k "%~dp0run_backend.bat"
timeout /t 2 >nul
start "LAKSH Frontend" cmd /k "%~dp0run_frontend.bat"
echo.
echo ========================================================
echo   LAKSH is starting!
echo   Backend:  http://localhost:8000 (Docs: /docs)
echo   Frontend: http://localhost:5173
echo ========================================================
pause
