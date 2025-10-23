@echo off
echo Starting GrainHero Application...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd farmHomeBackend-main && npm run dev"

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd farmHomeFrontend-main && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
