@echo off
REM opencode-ide web launcher (browser mode)
REM ----------------------------------------------------------------
REM Simpler alternative to the Electron app. Starts a Vite dev server
REM and tells the user to open the URL in their browser.
REM
REM Usage:
REM   scripts\opencode-ide\opencode-web.bat
REM
REM Pros over the Electron build:
REM   - No electron.exe to install / download (~188MB saved)
REM   - No `npx` interactive prompt on Windows
REM   - One process, no IPC, no race conditions
REM   - Browser DevTools is better than Electron DevTools
REM
REM Cons:
REM   - Not a "native" desktop app (lives in a browser tab)
REM   - No system tray / global hotkeys
REM   - The .lnk Desktop shortcut needs a different target

setlocal ENABLEEXTENSIONS
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

REM Sanity check: vite must be installed.
set "VITE=%SCRIPT_DIR%node_modules\.bin\vite.cmd"
if not exist "%VITE%" (
  echo [opencode-ide web] vite not found. Installing...
  call npm install --no-audit --no-fund --loglevel=error
  if errorlevel 1 (
    echo [opencode-ide web] npm install failed.
    popd
    exit /b 1
  )
)

REM Sanity check: opencode must be on PATH.
where opencode >nul 2>nul
if errorlevel 1 (
  echo [opencode-ide web] WARNING: 'opencode' not found in PATH.
  echo                  Run: npm install -g opencode-ai
  echo                  Continuing anyway — the renderer will show
  echo                  'Cannot reach opencode' if it's not running.
)

echo.
echo ============================================================
echo  opencode-ide web (browser mode)
echo ============================================================
echo.
echo  Vite will start on http://127.0.0.1:5173
echo  opencode serve will be spawned by your browser session
echo  (or run 'opencode serve --port 4096' in another terminal)
echo.
echo  Press Ctrl+C to stop the dev server.
echo ============================================================
echo.

REM Use 127.0.0.1 (loopback) instead of 0.0.0.0 so the opencode proxy
REM in the browser has a stable target.
"%VITE%" --port 5173 --host 127.0.0.1 --strictPort

popd
endlocal
