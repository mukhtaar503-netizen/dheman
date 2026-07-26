# Git Auto-Sync (Windows + VS Code)

Automatically pulls new commits from GitHub into your local working copy while
you have this project open in VS Code, without overwriting uncommitted work.

## How it works

There is no way for a local machine to be *pushed to* by GitHub without a
public HTTPS endpoint (that's what a webhook requires) — a laptop behind home
Wi-Fi/NAT can't receive one directly, and standing up a tunnel (ngrok, a VPS
relay) just to sync one dev machine is more infrastructure than the problem
warrants. Git hooks (`post-merge`, `post-checkout`) only fire in response to
local Git commands you already ran — they can't detect that the remote moved
on their own. A filesystem watcher only sees local file changes, not commits
that landed on GitHub.

So the reliable, low-overhead option for "watch the remote and sync my local
checkout" is a **polling background script**: a small PowerShell loop that
periodically runs `git fetch`, compares local `HEAD` against
`origin/<branch>`, and pulls when they differ. That's what's implemented here,
wired to start automatically via a **VS Code task** when you open the folder.

## Files

| File | Purpose |
|---|---|
| `scripts/git-auto-sync.ps1` | The polling loop: fetch → compare → stash (if dirty) → `pull --ff-only` → un-stash → log |
| `scripts/git-auto-sync-stop.ps1` | Stops the loop for this repo |
| `scripts/GitAutoSync.Common.ps1` | Shared helpers (lock file, logging) — dot-sourced, not run directly |
| `.vscode/tasks.json` | Defines the background task and starts it on folder open |
| `.vscode/settings.json` | `task.allowAutomaticTasks: on` — see the trust-prompt note below |
| `logs/git-auto-sync.log` | Created at runtime; gitignored (matches the existing `*.log` rule) |

## First-time setup

1. **Windows needs Git and PowerShell** (PowerShell 5.1, which ships with
   Windows, or PowerShell 7 — both work; `tasks.json` invokes `powershell.exe`
   on Windows).
2. Open the project folder in VS Code.
3. VS Code will show a one-time prompt:
   *"This folder has a task that runs on folder open. Do you want to allow
   it?"* — click **Allow**.

   This prompt **cannot be bypassed from inside the repository** — that's an
   intentional VS Code security control so a repo can't grant itself
   auto-execute rights. `.vscode/settings.json` sets
   `task.allowAutomaticTasks: on`, but VS Code only honors that key in your
   **User** settings, not workspace settings (same reason). To skip the
   prompt permanently for every workspace you open, add it to your own
   `settings.json` (Command Palette → *Preferences: Open User Settings
   (JSON)*):
   ```json
   { "task.allowAutomaticTasks": "on" }
   ```
4. Once allowed, the task starts silently (`presentation.reveal: "silent"` —
   it runs in a dedicated output panel that doesn't steal focus) and re-starts
   automatically every time you reopen the folder.

## What it does on every poll (default: every 30 seconds)

1. `git fetch origin <current-branch>` — detects the active branch itself, so
   it follows you if you switch branches (not hardcoded to `main`).
2. Compares local `HEAD` to `origin/<branch>`.
3. **If they match:** does nothing, logs nothing (per spec — no noise when
   already up to date).
4. **If the remote is ahead:**
   - If you have uncommitted changes (`git status --porcelain` is non-empty),
     stashes them first (`git stash push -u`, including untracked files) and
     logs that it did so.
   - Runs `git pull origin <branch> --ff-only`.
   - Re-applies the stash (`git stash pop`) if one was made.
   - Logs every synced commit: timestamp, hash, message, branch.
   - If the stash pop conflicts, your changes are **not lost** — they stay in
     the stash (`git stash list`) — and the log says so explicitly so you
     know to resolve it by hand.

### Why `--ff-only` instead of a plain `git pull`

The request asked for `git pull origin main`. A plain `git pull` will create
a merge commit automatically if your local branch has diverged from the
remote (e.g. you made local commits that weren't pushed). An unattended
background process silently creating merge commits on your behalf is the
kind of surprise that causes real problems later, so this script uses
`--ff-only`: if history has diverged, the pull fails loudly, gets logged as
an error, and leaves your branch untouched for you to reconcile manually
(`git pull` or `git rebase` yourself). If you'd rather it always auto-merge,
remove `--ff-only` from `scripts/git-auto-sync.ps1`.

## Managing it

- **Stop it:** Command Palette → *Tasks: Run Task* → **Git Auto-Sync: Stop**
  (or just close VS Code — the loop dies with the terminal it runs in).
- **Watch the log live:** Command Palette → *Tasks: Run Task* → **Git
  Auto-Sync: View Log**.
- **Change the poll interval:** edit the `-IntervalSeconds` argument in
  `.vscode/tasks.json`.
- **Multiple VS Code windows on the same repo:** a lock file in
  `%TEMP%\git-auto-sync-<hash>.lock` (keyed by the repo's absolute path)
  prevents a second copy from starting and racing the first.

## Limitations, honestly

- **Polling, not push-based.** Latency is bounded by the interval (default
  30s), not instant. A true webhook would be instant but needs a public
  endpoint reachable from GitHub, which a laptop doesn't have without extra
  infrastructure (see above).
- **The VS Code "allow this task" prompt is unavoidable on first open** of
  the folder on a given machine, by design — no configuration shipped in the
  repo can suppress it (that's the point of the control).
- Requires network access to `origin` on every poll; offline periods just mean
  no-op cycles until connectivity returns.
