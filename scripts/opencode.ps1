# opencode.ps1 - Wrapper that loads .env, manages sessions, and runs opencode
#
# Usage:
#   .\scripts\opencode.ps1                  # Launch web GUI (recommended default)
#   .\scripts\opencode.ps1 tui              # Launch terminal UI (old default)
#   .\scripts\opencode.ps1 chat [folder]    # Web GUI in given folder (defaults to repo root)
#   .\scripts\opencode.ps1 run "..."         # One-shot run with message
#   .\scripts\opencode.ps1 continue [sid]   # Resume last session (or given session id)
#   .\scripts\opencode.ps1 sessions         # List recent sessions
#   .\scripts\opencode.ps1 export [sid]     # Export session to JSON
#   .\scripts\opencode.ps1 snapshot [name]  # Snapshot workspace state (files, branch, etc.)
#   .\scripts\opencode.ps1 ide [folder]     # Launch Antigravity-style IDE shell
#   .\scripts\opencode.ps1 mcp auth supabase
#
# Notes:
#   - Loads variables from .env into the current process (does not overwrite existing).
#   - GitHub MCP token is loaded by opencode.jsonc from ~/.config/opencode/github-token
#   - Supabase MCP uses OAuth (run `opencode mcp auth supabase` on first use).
#   - Sessions are auto-persisted in ~/.local/share/opencode (SQLite). No code changes
#     required to keep history across runs.
#   - Use 'snapshot' before closing work to capture a textual reference of workspace
#     state alongside the auto-saved session. Helps if the SQLite db is ever lost.

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Command = "chat",

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$Rest
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

# ---------------------------------------------------------------------------
# 1) Load .env into current process (does not overwrite existing)
# ---------------------------------------------------------------------------
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
            $name = $matches[1]
            $val  = $matches[2].Trim('"').Trim("'")
            if (-not [System.Environment]::GetEnvironmentVariable($name, "Process")) {
                [System.Environment]::SetEnvironmentVariable($name, $val, "Process")
            }
        }
    }
}

# ---------------------------------------------------------------------------
# 2) Helper: print colored header
# ---------------------------------------------------------------------------
function Write-Header($text) {
    Write-Host ""
    Write-Host "=== $text ===" -ForegroundColor Cyan
    Write-Host ""
}

# ---------------------------------------------------------------------------
# 3) Helper: snapshot workspace state into .opencode-snapshots/<name>.txt
# ---------------------------------------------------------------------------
function Save-Snapshot([string]$name) {
    $snapDir = Join-Path $RepoRoot ".opencode-snapshots"
    if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Path $snapDir | Out-Null }

    if (-not $name) { $name = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss") }
    $outFile = Join-Path $snapDir "$name.txt"

    $gitBranch = "not a git repo"
    $gitStatus = ""
    try {
        $gitBranch = (& git rev-parse --abbrev-ref HEAD 2>$null) -join ""
        $gitStatus = (& git status --short 2>$null) -join "`n"
    } catch {}

    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $relPath   = (Resolve-Path $RepoRoot).Path

    $content = @"
# Workspace snapshot
timestamp: $timestamp
project:   $relPath
branch:    $gitBranch

# git status (short)
$gitStatus

# top-level files
$(Get-ChildItem $RepoRoot -Force | Where-Object { -not $_.PSIsContainer } | Select-Object -ExpandProperty Name | Sort-Object | Out-String)

# recent opencode sessions (from ~/.local/share/opencode)
$(& opencode session list 2>$null | Out-String)
"@

    Set-Content -LiteralPath $outFile -Value $content -Encoding UTF8
    Write-Host "[snapshot] saved to $outFile" -ForegroundColor Green
    return $outFile
}

# ---------------------------------------------------------------------------
# 4) Dispatch
# ---------------------------------------------------------------------------
switch ($Command.ToLower()) {

    "tui" {
        Write-Header "Launching opencode TUI"
        & opencode @Rest
    }

    { $_ -in "web", "chat", "gui" } {
        $target = if ($Rest.Count -gt 0) { $Rest[0] } else { $RepoRoot.Path }
        $resolved = Resolve-Path $target -ErrorAction SilentlyContinue
        if (-not $resolved) {
            Write-Host "[error] folder not found: $target" -ForegroundColor Red
            exit 1
        }
        Write-Header "Launching opencode web GUI in: $($resolved.Path)"
        Write-Host "Tip: open http://127.0.0.1:<port> in your browser." -ForegroundColor Yellow
        Write-Host "     Sessions are auto-saved. Re-run with 'continue' to resume." -ForegroundColor Yellow
        Write-Host ""
        & opencode web --cwd $resolved.Path @($Rest | Select-Object -Skip 1)
    }

    "run" {
        Write-Header "opencode run"
        if ($Rest.Count -eq 0) {
            Write-Host "[usage] .\scripts\opencode.ps1 run 'your message here'" -ForegroundColor Yellow
            exit 1
        }
        $msg = $Rest -join " "
        & opencode run --message $msg
    }

    { $_ -in "continue", "resume", "c", "r" } {
        Write-Header "Resuming session"
        if ($Rest.Count -gt 0) {
            $sid = $Rest[0]
            Write-Host "Continuing session: $sid" -ForegroundColor Yellow
            & opencode --session $sid @($Rest | Select-Object -Skip 1)
        } else {
            Write-Host "Continuing last session (use Ctrl+C to pick a different one)..." -ForegroundColor Yellow
            & opencode --continue @($Rest | Select-Object -Skip 1)
        }
    }

    { $_ -in "sessions", "list", "ls" } {
        Write-Header "Recent sessions"
        & opencode session list
    }

    "export" {
        Write-Header "Export session"
        if ($Rest.Count -eq 0) {
            Write-Host "[usage] .\scripts\opencode.ps1 export <sessionID> [outfile.json]" -ForegroundColor Yellow
            exit 1
        }
        $sid = $Rest[0]
        $out = if ($Rest.Count -gt 1) { $Rest[1] } else { "session-$sid.json" }
        & opencode export $sid --output $out
        Write-Host "[export] saved to $out" -ForegroundColor Green
    }

    "snapshot" {
        Write-Header "Snapshot workspace"
        $name = if ($Rest.Count -gt 0) { $Rest[0] } else { "" }
        Save-Snapshot -name $name
    }

    { $_ -in "ide", "desktop" } {
        $target = if ($Rest.Count -gt 0) { $Rest[0] } else { $RepoRoot.Path }
        $resolved = Resolve-Path $target -ErrorAction SilentlyContinue
        if (-not $resolved) {
            Write-Host "[error] folder not found: $target" -ForegroundColor Red
            exit 1
        }
        Write-Header "Launching OpenCode IDE (Antigravity-style shell) in: $($resolved.Path)"
        $bat = Join-Path $RepoRoot "scripts\opencode-ide/opencode-ide.bat"
        & $bat $resolved.Path
    }

    "mcp" {
        Write-Header "opencode mcp $($Rest -join ' ')"
        & opencode mcp @Rest
    }

    default {
        # Pass-through for any other opencode subcommand (acp, attach, debug,
        # providers, agent, upgrade, uninstall, serve, models, stats, import,
        # github, pr, session, plugin, db, completion, etc.)
        & opencode $Command @Rest
    }
}
