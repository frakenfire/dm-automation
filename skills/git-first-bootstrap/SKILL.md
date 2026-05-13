---
name: git-first-bootstrap
description: Use for GitHub-first setup, cross-machine restore, Claude/Codex bootstrap, context/token cleanup, /done workflows, and enforcing repo-only coding with commit/push discipline.
---

# Git-first Bootstrap

Use GitHub private repo as the source of truth. Local folders are checkouts. `~/.claude/` and `~/.codex/` are application locations.

## Process

1. Verify repo root, branch, remote, status, and pull state.
2. Diagnose environment with `scripts/diagnose-env.ps1`.
3. Restore settings from repo with `scripts/sync-from-repo.ps1`.
4. Verify with `scripts/verify-setup.ps1`.
5. End with `/done`, Git status/diff, commit/push decision, and user-triggered `/clear`.

## Prohibited

No automatic clear, commit, push, deploy, delete, or secret handling.
