@echo off
cd /d "%~dp0"
echo Starting Employee Reimbursement Manager...
echo.
echo This will open two separate windows for the servers.
echo.
pause

start "Backend Server" cmd /k "cd /d D:\6sem\proj\Employee-Reimbursement-Manager\backend && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak
start "Frontend Server" cmd /k "cd /d D:\6sem\proj\Employee-Reimbursement-Manager\frontend && npm run dev"

echo.
echo Servers starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause
