@echo off
title MySafePlay Bridge
echo ========================================
echo MySafePlay Bridge - Local Camera Service
echo ========================================
echo.

REM Check if executable exists
if not exist "mysafeplay-bridge-windows.exe" (
    echo ERROR: mysafeplay-bridge-windows.exe not found!
    echo Please ensure the executable is in the same directory as this batch file.
    echo.
    pause
    exit /b 1
)

REM Kill any existing processes on port 3000-3010
echo Checking for processes using ports 3000-3010...
for /L %%i in (3000,1,3010) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%i') do (
        if not "%%a"=="" (
            echo Killing process %%a on port %%i
            taskkill /F /PID %%a >nul 2>&1
        )
    )
)

echo.
echo Starting MySafePlay Bridge...
echo If you see "ERR_CONNECTION_REFUSED", the service may still be starting.
echo Please wait a few seconds and try refreshing your browser.
echo.
echo Web Interface will be available at: http://localhost:3000
echo (or the next available port if 3000 is in use)
echo.
echo To stop the service, close this window or press Ctrl+C
echo ========================================
echo.

REM Start the executable and capture output
mysafeplay-bridge-windows.exe 2>&1

REM If we get here, the executable has exited
echo.
echo ========================================
echo MySafePlay Bridge has stopped.
echo.
if %ERRORLEVEL% neq 0 (
    echo Exit code: %ERRORLEVEL%
    echo This may indicate an error occurred.
    echo.
    echo Common solutions:
    echo - Run as Administrator
    echo - Check Windows Firewall settings
    echo - Ensure no antivirus is blocking the application
    echo - Try a different port by setting PORT environment variable
    echo.
)

echo Press any key to exit...
pause >nul
