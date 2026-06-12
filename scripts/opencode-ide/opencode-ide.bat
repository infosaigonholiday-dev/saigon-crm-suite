@echo off
REM opencode-ide launcher (multi-mode)
REM ----------------------------------------------------------------
REM Three launch modes for the Antigravity-style IDE. Pick by passing
REM the mode as the first argument (default: web).
REM
REM   scripts\opencode-ide\opencode-ide.bat                (same as `web`)
REM   scripts\opencode-ide\opencode-ide.bat web            (opencode web, port 5173)
REM   scripts\opencode-ide\opencode-ide.bat antigravity    (Vite UI, port 5174)
REM   scripts\opencode-ide\opencode-ide.bat both           (start both, open browser)
REM
REM In all modes the renderer needs an `opencode serve` running on a
REM loopback port. `opencode web` spawns one for you; `antigravity`
REM mode requires you to run `opencode serve --port 4096` in another
REM terminal, or we'll try to find one automatically.

setlocal ENABLEEXTENSIONS
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

set "MODE=web"
if not "%~1"=="" set "MODE=%~1"

REM Sanity check: vite must be installed.
set "VITE=%SCRIPT_DIR%node_modules\.bin\vite.cmd"
if not exist "%VITE%" (
  echo [opencode-ide] vite not found. Installing...
  call npm install --no-audit --no-fund --loglevel=error
  if errorlevel 1 (
    echo [opencode-ide] npm install failed.
    popd
    exit /b 1
  )
)

REM Sanity check: opencode must be on PATH.
where opencode >nul 2>nul
if errorlevel 1 (
  echo [opencode-ide] WARNING: 'opencode' not found in PATH.
  echo                  Run: npm install -g opencode-ai
)

if /i "%MODE%"=="web" goto :web_mode
if /i "%MODE%"=="antigravity" goto :antigravity_mode
if /i "%MODE%"=="both" goto :both_mode
echo [opencode-ide] unknown mode: %MODE%  ^(valid: web ^& antigravity ^& both^)
popd
exit /b 1

:web_mode
echo.
echo ============================================================
echo  opencode-ide :: WEB MODE
echo ============================================================
echo  Starting opencode web on http://127.0.0.1:5173
echo  (no Vite UI — uses the official opencode web SPA shell)
echo ============================================================
echo.
echo  When the server is ready, open this URL in your browser:
echo    http://127.0.0.1:5173
echo.
start "" "http://127.0.0.1:5173"
"opencode" web --port 5173 --hostname 127.0.0.1
popd
endlocal
exit /b %ERRORLEVEL%

:antigravity_mode
echo.
echo ============================================================
echo  opencode-ide :: ANTIGRAVITY MODE
echo ============================================================
echo  Starting Vite on http://127.0.0.1:5174
echo.
echo  Make sure you have an opencode serve running in another
echo  terminal:
echo    opencode serve --port 4096 --hostname 127.0.0.1
echo.
echo  Vite will proxy /api, /config, /session to the opencode port.
echo ============================================================
echo.
echo  When Vite is ready, open this URL in your browser:
echo    http://127.0.0.1:5174
echo.

REM Vite's proxy config (vite.config.ts) reads the opencode port
REM from %TEMP%\opencode-ide-port.txt. Default to 4096.
set "OC_PORT=4096"
if exist "%TEMP%\opencode-ide-port.txt" (
  for /f "usebackq delims=" %%P in ("%TEMP%\opencode-ide-port.txt") do (
    set "OC_PORT=%%P"
  )
)
echo  (using opencode port %OC_PORT% for the Vite proxy)

start "" "http://127.0.0.1:5174"
"%VITE%" --port 5174 --host 127.0.0.1
popd
endlocal
exit /b %ERRORLEVEL%

:both_mode
echo.
echo ============================================================
echo  opencode-ide :: BOTH MODES
echo ============================================================
echo  opencode web  : http://127.0.0.1:5173
echo  Antigravity UI: http://127.0.0.1:5174
echo ============================================================
echo.
start "" "http://127.0.0.1:5173"
start "" "http://127.0.0.1:5174"
"opencode" web --port 5173 --hostname 127.0.0.1
popd
endlocal
exit /b %ERRORLEVEL%
