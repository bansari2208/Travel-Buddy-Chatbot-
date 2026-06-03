@echo off
echo ===================================================
echo      🚀 Launching AI Travel Buddy (Full Stack) 🚀
echo ===================================================

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "FastAPI Backend" /d "%~dp0" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [2/2] Starting React Frontend on http://localhost:5173 ...
start "React Frontend" /d "%~dp0frontend" cmd /k "npm run dev"

echo.
echo ✅ Both services are starting!
echo    Backend:  http://127.0.0.1:8000
echo    Frontend: http://localhost:5173
echo.
pause
