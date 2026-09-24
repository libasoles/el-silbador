# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| --------------------------- | --------------------- | ----------------------------------------- |
| `needs-triage`               | `needs-triage`         | Maintainer needs to evaluate this issue  |
| `needs-info`                 | `needs-info`           | Waiting on reporter for more information |
| `ready-for-agent`            | `ready-for-agent`      | Fully specified, ready for an AFK agent  |
| `ready-for-human`            | `ready-for-human`      | Requires human implementation            |
| `wontfix`                    | `wontfix`              | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Asignación de agente

Además del `Status:` de triage, cada ticket con label `ready-for-agent` lleva una línea `Agent:` indicando
quién lo va a implementar, ya que Claude Code actúa como orquestador pero puede delegar tickets a otras IAs
para repartir el costo de tokens:

- `Agent: claude` — subagente de Claude Code
- `Agent: codex` — Codex (OpenAI)
- `Agent: antigravity` — Google Antigravity
- `Agent: unassigned` — todavía no asignado (default al crear el ticket)

Un ticket puede tomarse (self-claim) por cualquier agente listado si `Agent: unassigned` y `Status: ready-for-agent`.
