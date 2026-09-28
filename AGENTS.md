## Agent skills

## Git workflow

Every task must use its own git worktree and branch. Codex creates worktrees at
`.agents/worktrees/<task-slug>`; this keeps all agent worktrees inside the repository. When the
task is complete, merge the branch into `main`, then remove both the task branch and its worktree.

## Versioning

Increment the version in `package.json` (and its matching root entry in `package-lock.json`) on
every commit. The index footer displays this version.

## UI components

Build components as reusable, composable units whenever practical. Prefer Radix primitives as
their foundation when a suitable primitive exists.

### Issue tracker

Local markdown — issues/specs live under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels, plus an `Agent:` line per ticket so tickets can be picked up by Claude, Codex, or Google Antigravity to split token cost. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
