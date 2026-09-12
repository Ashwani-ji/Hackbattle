@echo off
cd /d "%~dp0"
echo Starting CodeCrawl frontend on http://localhost:3000
echo Press Ctrl+C to stop.
echo.
call npm run dev
echo.
echo Frontend stopped.
pause
