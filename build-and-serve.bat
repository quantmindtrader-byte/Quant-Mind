@echo off
echo Building QuantMind Desktop with Auto-Update...
echo =============================================

echo.
echo Installing dependencies...
call npm install

echo.
echo Building renderer...
call npm run build:renderer

echo.
echo Building application...
call electron-builder

echo.
echo Build complete! Files are in dist/ folder
echo.
echo Starting update server on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

call npm run serve-updates