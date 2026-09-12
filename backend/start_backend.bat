@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
echo Starting CodeCrawl backend on http://localhost:8000
echo (API docs at http://localhost:8000/docs)
echo Press Ctrl+C to stop.
echo.
uvicorn main:app --reload --port 8000
echo.
echo Backend stopped.
pause
