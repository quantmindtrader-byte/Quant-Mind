@echo off
echo QuantMind Desktop Auto-Update Test Script
echo ==========================================

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building initial version (1.0.0)...
call npm run dist

echo.
echo Step 3: Starting update server...
echo Please install the app from dist/ folder, then press any key to continue...
pause

echo.
echo Step 4: Creating new version (1.0.1)...
echo Updating package.json version...

powershell -Command "(Get-Content package.json) -replace '\"version\": \"1.0.0\"', '\"version\": \"1.0.1\"' | Set-Content package.json"

echo.
echo Step 5: Building new version...
call npm run dist

echo.
echo Step 6: Update server should now serve v1.0.1
echo Open the installed v1.0.0 app to test auto-update
echo.
echo Starting update server...
call npm run serve-updates