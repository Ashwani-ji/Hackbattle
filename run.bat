@echo off
setlocal EnableExtensions
title CodeCrawl Launcher
cd /d "%~dp0"

echo ==========================================
echo    CodeCrawl Launcher
echo ==========================================
echo.

REM ---------------------------------------------------------------
REM  Check for Python (try "python" first, then the "py" launcher)
REM ---------------------------------------------------------------
set "PYTHON_CMD="
where python >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON_CMD=py -3"
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found on PATH.
    echo         Install Python 3.10+ from https://www.python.org/downloads/
    echo         and make sure "Add Python to PATH" is checked during setup.
    echo         Then run this script again.
    echo.
    pause
    exit /b 1
)
echo [OK] Python found: %PYTHON_CMD%

REM ---------------------------------------------------------------
REM  Check for Node.js / npm
REM ---------------------------------------------------------------
where npm >nul 2>nul
if not %errorlevel%==0 (
    echo [ERROR] Node.js / npm was not found on PATH.
    echo         Install Node.js 18+ LTS from https://nodejs.org/
    echo         Then run this script again.
    echo.
    pause
    exit /b 1
)
echo [OK] npm found.
echo.

REM ---------------------------------------------------------------
REM  Backend setup
REM ---------------------------------------------------------------
echo [Backend] Preparing...
cd /d "%~dp0backend"

if not exist venv (
    echo [Backend] Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)

if not exist venv\Scripts\activate.bat (
    echo [ERROR] Failed to create the Python virtual environment in backend\venv.
    echo         Delete the "backend\venv" folder if it exists and try again,
    echo         or check that your Python install is not a Microsoft Store stub.
    echo.
    pause
    exit /b 1
)

if not exist .env (
    copy /y .env.example .env >nul
    echo [Backend] Created backend\.env
    echo [Backend] Optional: edit backend\.env and add ANTHROPIC_API_KEY for real AI
    echo           refactors. CodeCrawl works fully without it too.
)

echo [Backend] Installing Python dependencies (first run can take a minute)...
call venv\Scripts\activate.bat
python -m pip install --disable-pip-version-check -q -r requirements.txt
if not %errorlevel%==0 (
    echo [ERROR] pip install failed. Scroll up for details, fix the issue, then
    echo         run this script again.
    echo.
    pause
    exit /b 1
)
call venv\Scripts\deactivate.bat
echo [Backend] Dependencies ready.
echo.

echo [Backend] Launching FastAPI on http://localhost:8000 ...
start "CodeCrawl Backend" cmd /k "start_backend.bat"

REM ---------------------------------------------------------------
REM  Frontend setup
REM ---------------------------------------------------------------
cd /d "%~dp0frontend"
echo [Frontend] Preparing...

if not exist node_modules (
    echo [Frontend] Running npm install, first run can take a few minutes...
    call npm install
    if not %errorlevel%==0 (
        echo [ERROR] npm install failed. Scroll up for details, fix the issue,
        echo         then run this script again.
        echo.
        pause
        exit /b 1
    )
)
echo [Frontend] Dependencies ready.
echo.

echo [Frontend] Launching Next.js on http://localhost:3000 ...
start "CodeCrawl Frontend" cmd /k "start_frontend.bat"

cd /d "%~dp0"
echo.
echo ==========================================
echo   Both servers are starting in separate windows:
echo     Backend  (API docs) -^> http://localhost:8000/docs
echo     Frontend (the app)  -^> http://localhost:3000
echo.
echo   Give them a few seconds to finish starting, then open
echo   http://localhost:3000 in your browser.
echo.
echo   To stop CodeCrawl, close those two windows (or press Ctrl+C
echo   inside each one).
echo ==========================================
echo.
pause
