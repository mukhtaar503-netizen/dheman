<#
.SYNOPSIS
    Watches the current Git branch's remote counterpart and automatically pulls
    new commits into the working tree, stashing/restoring any uncommitted local
    changes around the pull. Designed to run as a VS Code background task
    (see .vscode/tasks.json), started once per VS Code window via a lock file.

.PARAMETER IntervalSeconds
    How often to poll the remote for new commits. Default 30 seconds.

.PARAMETER Remote
    Git remote name to sync against. Default "origin".
#>
param(
    [int]$IntervalSeconds = 30,
    [string]$Remote = "origin"
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot "GitAutoSync.Common.ps1")

$repoRoot = Get-RepoRoot
Set-Location $repoRoot

$logFile = Get-LogFilePath -RepoRoot $repoRoot
$lockFile = Get-LockFilePath -RepoRoot $repoRoot

# Refuse to run a second copy against the same repo (e.g. two VS Code windows open).
if (Test-Path $lockFile) {
    $existingPid = (Get-Content $lockFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($existingPid -and (Test-ProcessAlive -ProcessId ([int]$existingPid))) {
        Write-Host "Git Auto-Sync is already running for this repo (PID $existingPid). Exiting."
        exit 0
    }
}
$PID | Out-File -FilePath $lockFile -Encoding ascii -Force

Write-SyncLog -LogFile $logFile -Message "Git Auto-Sync started (PID $PID, interval ${IntervalSeconds}s, remote '$Remote')"

try {
    while ($true) {
        try {
            $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
            if ($branch) { $branch = $branch.Trim() }

            if ([string]::IsNullOrWhiteSpace($branch) -or $branch -eq "HEAD") {
                # Detached HEAD (e.g. mid-rebase) — nothing sensible to sync against.
                Start-Sleep -Seconds $IntervalSeconds
                continue
            }

            git fetch $Remote $branch --quiet 2>$null

            $localHash = (git rev-parse HEAD 2>$null)
            $remoteHash = (git rev-parse "$Remote/$branch" 2>$null)
            if ($localHash) { $localHash = $localHash.Trim() }
            if ($remoteHash) { $remoteHash = $remoteHash.Trim() }

            if ([string]::IsNullOrWhiteSpace($remoteHash) -or $localHash -eq $remoteHash) {
                # Nothing new, or fetch couldn't reach the remote — stay quiet, per spec.
                Start-Sleep -Seconds $IntervalSeconds
                continue
            }

            # Remote is ahead. Capture what's new before we move HEAD.
            $newCommitsRaw = git log "$localHash..$remoteHash" --pretty=format:"%H|%s" 2>$null

            $dirtyStatus = git status --porcelain 2>$null
            $hasLocalChanges = -not [string]::IsNullOrWhiteSpace($dirtyStatus)
            $stashed = $false

            if ($hasLocalChanges) {
                $stashLabel = "auto-sync-" + (Get-Date -Format "yyyyMMddHHmmss")
                git stash push -u -m $stashLabel --quiet 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $stashed = $true
                    Write-SyncLog -LogFile $logFile -Message "Uncommitted changes detected on '$branch' — stashed as '$stashLabel'"
                }
                else {
                    Write-SyncLog -LogFile $logFile -Message "ERROR: Failed to stash local changes on '$branch'; skipping this sync cycle to avoid overwriting work."
                    Start-Sleep -Seconds $IntervalSeconds
                    continue
                }
            }

            # --ff-only: an automated background process should never invent a merge
            # commit on the user's behalf. If history has diverged, this fails loudly
            # (logged below) instead of silently rewriting the branch.
            git pull $Remote $branch --ff-only --quiet 2>$null
            $pullExitCode = $LASTEXITCODE

            if ($pullExitCode -ne 0) {
                Write-SyncLog -LogFile $logFile -Message "ERROR: git pull --ff-only failed for branch '$branch' (local history has diverged from $Remote/$branch). Resolve manually with 'git pull' or 'git rebase'."
                if ($stashed) {
                    Write-SyncLog -LogFile $logFile -Message "Local changes remain safely stashed (run 'git stash list' / 'git stash pop')."
                }
                Start-Sleep -Seconds $IntervalSeconds
                continue
            }

            if ($newCommitsRaw) {
                foreach ($line in ($newCommitsRaw -split "`r?`n")) {
                    if ([string]::IsNullOrWhiteSpace($line)) { continue }
                    $parts = $line -split '\|', 2
                    $hash = $parts[0]
                    $message = if ($parts.Length -gt 1) { $parts[1] } else { "" }
                    Write-SyncLog -LogFile $logFile -Message "Synced commit $hash on branch '$branch': $message"
                }
            }

            if ($stashed) {
                git stash pop --quiet 2>$null
                if ($LASTEXITCODE -ne 0) {
                    Write-SyncLog -LogFile $logFile -Message "CONFLICT: Reapplying stashed local changes failed after pulling '$branch'. Your changes are preserved in the stash — run 'git stash list' then 'git stash pop' and resolve conflicts manually."
                }
                else {
                    Write-SyncLog -LogFile $logFile -Message "Reapplied stashed local changes successfully after syncing '$branch'."
                }
            }
        }
        catch {
            Write-SyncLog -LogFile $logFile -Message "ERROR: $($_.Exception.Message)"
        }

        Start-Sleep -Seconds $IntervalSeconds
    }
}
finally {
    Remove-Item -Path $lockFile -ErrorAction SilentlyContinue
    Write-SyncLog -LogFile $logFile -Message "Git Auto-Sync stopped."
}
