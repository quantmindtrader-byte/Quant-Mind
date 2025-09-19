@echo off
echo Creating GitHub Release v1.2.1
echo ================================

REM Check if GitHub CLI is installed
gh --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: GitHub CLI (gh) is not installed or not in PATH
    echo Please install GitHub CLI from: https://cli.github.com/
    echo Or use the manual upload method below
    goto :manual
)

REM Check if logged in to GitHub
gh auth status >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not logged in to GitHub CLI
    echo Please run: gh auth login
    pause
    exit /b 1
)

echo Creating release v1.2.1...
gh release create v1.2.1 ^
    "dist/QuantMind Desktop Setup 1.2.1.exe" ^
    --title "QuantMind Desktop v1.2.1 - Enhanced Notification System" ^
    --notes-file "RELEASE_NOTES_v1.2.1.md" ^
    --repo quantmindtrader-byte/Quant-Mind

if errorlevel 1 (
    echo ERROR: Failed to create release
    goto :manual
)

echo.
echo ✅ Release v1.2.1 created successfully!
echo 📦 Installer uploaded: QuantMind Desktop Setup 1.2.1.exe
echo 🔗 Release URL: https://github.com/quantmindtrader-byte/Quant-Mind/releases/tag/v1.2.1
echo.
echo Users will now receive automatic updates to v1.2.1
goto :end

:manual
echo.
echo ========================================
echo MANUAL UPLOAD INSTRUCTIONS:
echo ========================================
echo 1. Go to: https://github.com/quantmindtrader-byte/Quant-Mind/releases/new
echo 2. Tag version: v1.2.1
echo 3. Release title: QuantMind Desktop v1.2.1 - Enhanced Notification System
echo 4. Upload file: dist\QuantMind Desktop Setup 1.2.1.exe
echo 5. Copy release notes from: RELEASE_NOTES_v1.2.1.md
echo 6. Click "Publish release"
echo.

:end
pause