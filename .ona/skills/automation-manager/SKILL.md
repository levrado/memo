---
name: automation-manager
description: >-
  Create, update, and delete factory automations that run in local Docker
  sandboxes (sbx). Use when creating a new automation, modifying triggers or
  prompts, or deleting an automation. Triggers on "create automation",
  "update automation", "delete automation", "change automation triggers",
  "add a new automation".
---

# Automation Manager

Automations are plain files: `.agents/automations/<slug>.md`. There is no
external registry — the local runner (`scripts/factory/factory.mjs`) reads the
directory on start, so a change is just a commit plus a daemon restart.

## File format

```markdown
---
name: Human-readable name
description: One-line description.
cron: ["0 */2 * * *"]          # JSON list of 5-field crons, [] for none
pr_events: [merged]            # any of: opened, updated, ready_for_review, merged
---

The agent prompt (markdown).
```

## Commands

```bash
node scripts/factory/factory.mjs list              # parsed triggers
node scripts/factory/factory.mjs run <slug>        # run once, in a sandbox
node scripts/factory/factory.mjs run <slug> --pr N # run with PR context
node scripts/factory/factory.mjs daemon            # cron + PR-event scheduler
```

Each run is `sbx exec -w <repo> factory-shell devin-cli -p <prompt> --permission-mode dangerous`
in the persistent `factory-shell` sandbox; logs land in `.factory/logs/`. Restart the daemon after
editing any automation.

## Trigger design rules

- One run per automation at a time (the runner enforces this); prompts should
  still check for existing work (open PRs, `status:in-progress` labels).
- Prefer cron over PR events unless the reaction time matters.
- Cron is evaluated in the host's local timezone (Ona used UTC); set `TZ=UTC`
  when starting the daemon to keep the original schedules.
