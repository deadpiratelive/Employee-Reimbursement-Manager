@echo off
cd /d "%~dp0"
echo ==========================================
echo  Employee Reimbursement Manager
echo  Launch Script
echo ==========================================
echo.

REM Check if backend venv exists, create if not
if not exist "backend\venv\Scripts\activate.bat" (
    echo [INFO] Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
    echo [OK] Virtual environment created
    echo.
)

REM Install backend dependencies
echo [INFO] Checking backend dependencies...
cd backend
call venv\Scripts\activate
pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies ready
cd ..

REM Install frontend dependencies
echo [INFO] Checking frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies ready
cd ..

echo.
echo ==========================================
echo  Starting Servers...
echo ==========================================
echo.

REM Start Backend Server
start "Backend Server - Port 8000" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend Server
start "Frontend Server - Port 3000" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo  Servers Started Successfully!
echo ==========================================
echo.
echo  Backend API:   http://localhost:8000
echo  Frontend App:  http://localhost:3000
echo  API Docs:      http://localhost:8000/docs
echo.
echo  Press any key to close this window...
echo  (Servers will continue running)
echo.
pause >nul
