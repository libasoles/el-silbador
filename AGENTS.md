## Agent skills

## Git workflow

Every task must use its own git worktree and branch. Codex creates worktrees at
`.agents/worktrees/<task-slug>`; this keeps all agent worktrees inside the repository. When the
task is complete, merge the branch into `main`, then remove both the task branch and its worktree.

### Issue tracker

Local markdown — issues/specs live under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels, plus an `Agent:` line per ticket so tickets can be picked up by Claude, Codex, or Google Antigravity to split token cost. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
