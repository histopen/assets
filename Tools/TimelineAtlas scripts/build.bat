@echo off
cd /d "%~dp0..\.."
node "Tools/TimelineAtlas scripts/buildTimelineAtlas.mjs"
pause
