@echo off
echo QuantMind Desktop - Building Windows Installer
echo ============================================

echo.
echo Checking for NSIS installation...
where makensis >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: NSIS not found in PATH
    echo Please install NSIS from: https://nsis.sourceforge.io/Download
    echo After installation, add NSIS to your PATH or run this from NSIS folder
    pause
    exit /b 1
)

echo NSIS found, building installer...
echo.

cd /d "%~dp0"

echo Building installer with NSIS...
makensis QuantMind-Installer.nsi

if %errorlevel% equ 0 (
    echo.
    echo ✓ SUCCESS: Installer created successfully!
    echo.
    echo Installer location: %~dp0QuantMind-Desktop-Setup.exe
    echo.
    echo The installer includes:
    echo - Complete QuantMind Desktop application
    echo - Start Menu shortcuts
    echo - Desktop shortcut
    echo - Uninstaller
    echo - Registry entries for Add/Remove Programs
    echo.
) else (
    echo.
    echo ✗ ERROR: Failed to build installer
    echo Check the output above for errors
    echo.
)

pause