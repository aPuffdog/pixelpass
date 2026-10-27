@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-autostart.ps1" %*
exit /b %ERRORLEVEL%
