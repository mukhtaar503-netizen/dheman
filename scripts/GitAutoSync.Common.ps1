# Shared helpers for git-auto-sync.ps1 and git-auto-sync-stop.ps1.
# Dot-sourced, not run directly.

function Get-RepoRoot {
    $root = git rev-parse --show-toplevel 2>$null
    if ([string]::IsNullOrWhiteSpace($root)) {
        throw "Not inside a Git repository (run this from within the cloned project)."
    }
    return $root.Trim()
}

function Get-LockFilePath {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)
    $safeName = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($RepoRoot)) -replace '[^a-zA-Z0-9]', ''
    return Join-Path $env:TEMP "git-auto-sync-$safeName.lock"
}

function Get-LogFilePath {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)
    $logDir = Join-Path $RepoRoot "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    return Join-Path $logDir "git-auto-sync.log"
}

function Write-SyncLog {
    param(
        [Parameter(Mandatory = $true)][string]$LogFile,
        [Parameter(Mandatory = $true)][string]$Message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Add-Content -Path $LogFile -Value $line -Encoding utf8
    Write-Host $line
}

function Test-ProcessAlive {
    param([Parameter(Mandatory = $true)][int]$ProcessId)
    return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}
