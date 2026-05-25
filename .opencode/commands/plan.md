---
description: Create a plan file from a Gitea ticket
---

You are in planning mode. Create a plan for ticket #$1.

1. Fetch ticket details: `tea issue show $1` — use the title for the plan title.
2. Determine plan type: single-phase (simple, contained change) or multi-phase
   (needs subtickets, multiple branches).
3. Ask me if you need to decide between single-phase vs multi-phase, or if the
   scope is unclear.
4. Create a plan file at `.plans/$1-plan.md` with this structure:

```markdown
# <plan-title>

**Ticket:** #$1 **Type:** single-phase | multi-phase

## Rationale

Describe the reasoning behind the change, the problem it solves, and any
relevant context.

## Phase X (single-phase plans only have this section once with X=1)

- **Branch:** <user>/<ticket#>-<short-name>
- **Subticket:** #<subticket-number> (multi-phase only)
- **Steps:**
  1. <detailed description of what to do>
  2. <...>
- **Version:** <semver-bump> (e.g. patch, minor, major)
- **Commit:** <commit message summary>
```

For multi-phase, repeat the Phase section for each phase.

**General guidelines:**

Follow these rules:

- Branch naming: `micurs/<ticket#>-<short-name>` per repo convention
- Version bumps follow semver 2.0 based on the change scope
- Each step must be concrete and actionable (files to edit, functions to change,
  etc.)
- Build and test at every step to ensure correctness
- Commit at each step with a clear message summarizing the change
- Implement unit tests for all new functionality and edge cases
- Commit messages should reference the ticket number
