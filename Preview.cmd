@echo off
cd /d "%~dp0"
echo Mirror Protocol - browser design preview
echo Open http://127.0.0.1:8791/Demo.html after the server starts.
node tools\serve-preview.mjs
pause
