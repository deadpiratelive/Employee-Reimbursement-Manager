@echo off
echo Pushing changes to GitHub...
echo.

cd /d "D:\6sem\proj\Employee-Reimbursement-Manager"

echo Step 1: Checking status...
git status

echo.
echo Step 2: Adding changes...
git add .

echo.
set /p msg="Enter commit message: "

echo.
echo Step 3: Committing...
git commit -m "%msg%"

echo.
echo Step 4: Pushing to GitHub...
git push origin master

echo.
echo Done! Changes pushed to GitHub.
pause
