@echo off
title LAKSH Backend (FastAPI)
cd /d "%~dp0backend"
echo ========================================================
echo       Starting LAKSH Backend (FastAPI on Port 8000)
echo ========================================================
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
