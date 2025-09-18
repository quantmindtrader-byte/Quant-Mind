@echo off
echo Publishing QuantMind Desktop to GitHub Releases...
echo ================================================

if "%GH_TOKEN%"=="" (
    echo ERROR: GH_TOKEN environment variable not set
    echo Please set your GitHub token: set GH_TOKEN=your_token_here
    pause
    exit /b 1
)

echo Building and publishing...
call npm run release

echo.
echo Release published to GitHub!
echo Users will receive the update automatically.
pause