@echo off
setlocal
title Portfolio - Local Preview
cd /d "%~dp0"
if errorlevel 1 goto failed

where node.exe >nul 2>&1
if errorlevel 1 (
    echo Node.js is missing. Install Node.js 22 or newer from https://nodejs.org/
    goto failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo npm is missing. Reinstall Node.js with npm enabled.
    goto failed
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
    echo This project requires Node.js 22 or newer.
    goto failed
)

call npm.cmd ls --depth=0 >nul 2>&1
if errorlevel 1 (
    echo Installing project dependencies...
    call npm.cmd ci --include=dev
    if errorlevel 1 goto failed
)

echo Building the portfolio...
call npm.cmd run build
if errorlevel 1 goto failed

node -e "const server = require('net').createServer(); server.once('error', () => process.exit(1)); server.listen(8765, '127.0.0.1', () => server.close());"
if errorlevel 1 (
    echo Port 8765 is unavailable. Close the existing preview or other server and try again.
    goto failed
)

echo.
echo Starting http://127.0.0.1:8765
echo Keep this window open. Press Ctrl+C to stop the preview.
echo If the browser does not open automatically, open the URL above.
start "" /b powershell.exe -NoProfile -Command "for ($i = 0; $i -lt 30; $i++) { try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8765' -UseBasicParsing -TimeoutSec 1; if ($response.StatusCode -eq 200) { Start-Process 'http://127.0.0.1:8765'; exit } } catch { }; Start-Sleep -Seconds 1 }"
call npm.cmd run preview
if errorlevel 1 goto failed
endlocal
exit /b 0

:failed
echo.
echo The local preview could not start. See the error above.
pause
endlocal
exit /b 1
