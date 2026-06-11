@echo off
REM opencode-desktop launcher
REM - Loads repo .env via opencode.ps1
REM - Spawns `opencode web` in background
REM - Opens Electron shell that embeds it
REM
REM Usage:
REM   scripts\opencode-desktop\opencode-desktop.bat
REM   scripts\opencode-desktop\opencode-desktop.bat "C:\path\to\project"

setlocal ENABLEEXTENSIONS
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."
pushd "%REPO_ROOT%"

REM --- 1) sanity check --------------------------------------------------------
where opencode >nul 2>nul
if errorlevel 1 (
  echo [opencode-desktop] ERROR: 'opencode' not found in PATH.
  echo                  Run:  npm install -g opencode-ai
  popd
  exit /b 1
)

REM --- 2) determine working dir ----------------------------------------------
set "TARGET=%REPO_ROOT%"
if not "%~1"=="" set "TARGET=%~1"
if not exist "%TARGET%" (
  echo [opencode-desktop] ERROR: folder not found: %TARGET%
  popd
  exit /b 1
)

REM --- 3) install electron deps once -----------------------------------------
if not exist "%SCRIPT_DIR%node_modules\electron" (
  echo [opencode-desktop] first run, installing electron ^(one-time^) ...
  call npm install --no-audit --no-fund --loglevel=error
  if errorlevel 1 (
    echo [opencode-desktop] npm install failed.
    popd
    exit /b 1
  )
)

REM --- 4) launch electron ----------------------------------------------------
echo [opencode-desktop] starting shell for: %TARGET%
set "ELECTRON_RUN_AS_NODE="
npx --prefix "%SCRIPT_DIR%" --no-install electron "%SCRIPT_DIR%." "%TARGET%"
set "RC=%ERRORLEVEL%"

popd
endlocal & exit /b %RC%
