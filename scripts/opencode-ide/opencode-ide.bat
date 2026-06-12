@echo off
REM opencode-ide launcher
REM - Loads .env via opencode.ps1
REM - Spawns `opencode serve` in background (handled by Electron main)
REM - Spawns Vite dev server (handled by Electron main)
REM - Opens Electron window that embeds http://localhost:5173
REM
REM Usage:
REM   scripts\opencode-ide\opencode-ide.bat
REM   scripts\opencode-ide\opencode-ide.bat "C:\path\to\project"

setlocal ENABLEEXTENSIONS
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."
pushd "%REPO_ROOT%"

REM --- 1) sanity check --------------------------------------------------------
where opencode >nul 2>nul
if errorlevel 1 (
  echo [opencode-ide] ERROR: 'opencode' not found in PATH.
  echo                  Run:  npm install -g opencode-ai
  popd
  exit /b 1
)

REM --- 2) determine working dir ----------------------------------------------
set "TARGET=%REPO_ROOT%"
if not "%~1"=="" set "TARGET=%~1"
if not exist "%TARGET%" (
  echo [opencode-ide] ERROR: folder not found: %TARGET%
  popd
  exit /b 1
)

REM --- 3) install deps once ---------------------------------------------------
if not exist "%SCRIPT_DIR%node_modules\electron" (
  echo [opencode-ide] first run, installing electron ^(one-time^) ...
  call npm install --no-audit --no-fund --loglevel=error
  if errorlevel 1 (
    echo [opencode-ide] npm install failed.
    popd
    exit /b 1
  )
)
if not exist "%SCRIPT_DIR%node_modules\vite" (
  echo [opencode-ide] first run, installing vite deps ^(one-time^) ...
  pushd "%SCRIPT_DIR%"
  call npm install --no-audit --no-fund --loglevel=error
  if errorlevel 1 (
    echo [opencode-ide] npm install in opencode-ide failed.
    popd
    exit /b 1
  )
  popd
)

REM --- 4) load .env -----------------------------------------------------------
if exist ".env" (
  for /f "usebackq tokens=1* delims==" %%A in (".env") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" if not "%%A"=="" (
      set "%%A=%%B"
    )
  )
)

REM --- 5) launch electron -----------------------------------------------------
echo [opencode-ide] starting IDE for: %TARGET%

REM Locate the Electron binary directly. Calling `npx --no-install
REM electron ...` gets stuck in `npx`'s interactive prompt on
REM Windows ("Entering npm script environment"), so we go straight
REM to the binary that npm install drops in node_modules\.bin.
set "ELECTRON_EXE=%SCRIPT_DIR%node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON_EXE%" (
  echo [opencode-ide] electron.exe not found at %ELECTRON_EXE%.
  echo                  Run once manually:
  echo                    cd "%SCRIPT_DIR%" ^&^& npm install electron
  popd
  exit /b 1
)

set "ELECTRON_RUN_AS_NODE="
"%ELECTRON_EXE%" "%SCRIPT_DIR%." "%TARGET%"
set "RC=%ERRORLEVEL%"

popd
endlocal & exit /b %RC%
