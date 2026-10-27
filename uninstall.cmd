@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-autostart.ps1" %*
exit /b %ERRORLEVEL%
