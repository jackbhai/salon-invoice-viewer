@echo off
title Salon Bill Watcher - Instant Trigger
cd /d "%~dp0"
echo ============================================
echo   Salon New-Bill Watcher (Instant Trigger)
echo   Is window ko bandh mat karna.
echo   Notifications aate rehne ke liye ye
echo   har 90 second me check trigger karega.
echo ============================================
echo.
:loop
python ping_watcher.py
echo.
echo Pinger ruka hai. 10 second me dobara start hoga... (bandh karne ke liye window close karo)
timeout /t 10 /nobreak >nul
goto loop
