@echo off
title LAKSH Frontend (React + Vite)
cd /d "%~dp0frontend"
set PATH=C:\Program Files\nodejs;%PATH%
echo ========================================================
echo       Starting LAKSH Frontend (Vite on Port 5173)
echo ========================================================
npm run dev
pause
