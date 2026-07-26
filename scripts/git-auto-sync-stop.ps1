<#
.SYNOPSIS
    Stops the Git Auto-Sync background loop for this repo, if running.
#>
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot "GitAutoSync.Common.ps1")

$repoRoot = Get-RepoRoot
$lockFile = Get-LockFilePath -RepoRoot $repoRoot

if (-not (Test-Path $lockFile)) {
    Write-Host "Git Auto-Sync is not running for this repo (no lock file found)."
    exit 0
}

$existingPid = (Get-Content $lockFile -ErrorAction SilentlyContinue | Select-Object -First 1)
if ($existingPid -and (Test-ProcessAlive -ProcessId ([int]$existingPid))) {
    Stop-Process -Id ([int]$existingPid) -Force
    Write-Host "Stopped Git Auto-Sync (PID $existingPid)."
}
else {
    Write-Host "Lock file was stale (process already gone)."
}

Remove-Item -Path $lockFile -ErrorAction SilentlyContinue
