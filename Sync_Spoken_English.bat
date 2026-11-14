@echo off
title Spoken English Auto-Sync (Sapthagiri School)
echo =====================================================================
echo           Spoken English Lesson Slicer and Database Sync
echo =====================================================================
echo.
echo Checking for new / updated Day PDFs in Downloads and source_pdfs...
echo.

python scripts\sync_spoken_drive.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Sync encountered an issue. See above for details.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Staging and pushing sliced PDFs and lessons data to GitHub...
git add Portal/spoken_pdf/ Portal/data/spoken-english-lessons.js scripts/
git commit -m "chore(spoken-english): auto-sync new day lessons and checklists"
git push origin main

echo.
echo =====================================================================
echo [SUCCESS] Spoken English lessons and checklists are fully synced!
echo Sliced PDFs, Portal checklist data, and database have been updated.
echo =====================================================================
echo.
pause
