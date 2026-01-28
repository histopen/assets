@echo off
REM sfd2svg.bat - Run the SFD to SVG conversion script using FontForge

cd /d "%~dp0"

echo ============================================
echo SFD to SVG Converter
echo ============================================
echo.

setlocal enabledelayedexpansion

set "FONTFORGE_PATH=C:\Program Files (x86)\FontForge\bin\fontforge.exe"

if not exist "!FONTFORGE_PATH!" (
    echo ERROR: FontForge not found at:
    echo   !FONTFORGE_PATH!
    echo.
    echo Please update FONTFORGE_PATH in this script if installed elsewhere.
    pause
    exit /b 1
)

echo Running FontForge...
echo.


"!FONTFORGE_PATH!" -script sfd2svg.py test.sfd testicons

echo.
echo ============================================
pause