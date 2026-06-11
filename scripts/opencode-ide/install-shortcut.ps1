# Install-OpenCode-IDE-Shortcut.ps1
# ----------------------------------------------------------------
# Creates a Desktop shortcut that launches the OpenCode IDE Electron
# app from a clean repo checkout. Safe to run multiple times — it
# overwrites the existing shortcut.
#
# Usage (from a PowerShell with ExecutionPolicy Bypass):
#   powershell -ExecutionPolicy Bypass -File scripts\opencode-ide\install-shortcut.ps1
#
# The shortcut points to scripts\opencode-ide\opencode-ide.bat,
# which in turn spawns the Electron shell + Vite dev server + the
# opencode serve subprocess on a random loopback port.

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ScriptDir = Join-Path $RepoRoot "scripts\opencode-ide"
$BatPath = Join-Path $ScriptDir "opencode-ide.bat"
$IcoPath = Join-Path $ScriptDir "assets\icon.ico"
$Desktop = [Environment]::GetFolderPath("Desktop")
$LnkPath = Join-Path $Desktop "OpenCode IDE.lnk"

if (-not (Test-Path $BatPath)) {
    Write-Host "ERROR: launcher not found: $BatPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $IcoPath)) {
    Write-Host "WARNING: icon not found: $IcoPath — shortcut will use default icon" -ForegroundColor Yellow
}

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($LnkPath)
$lnk.TargetPath = $BatPath
$lnk.WorkingDirectory = $RepoRoot
$lnk.IconLocation = "$IcoPath,0"
$lnk.Description = "OpenCode IDE — Antigravity-style chat"
$lnk.WindowStyle = 7  # 1=normal, 3=max, 7=min
$lnk.Save()

Write-Host "OK: $LnkPath" -ForegroundColor Green
Write-Host "  Target:  $BatPath"
Write-Host "  Icon:    $IcoPath"
Write-Host "  CWD:     $RepoRoot"
