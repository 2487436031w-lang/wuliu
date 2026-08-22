---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

## Save location (this repo)

Save under `docs/agents/handoffs/` with name:

`YYYY-MM-DD-<short-slug>.md`

Create the directory if missing. Also update `docs/agents/HANDOFF-LATEST.md` as a copy or short pointer to the newest file so a fresh agent can `@docs/agents/HANDOFF-LATEST.md` in one shot.

Do **not** rely on OS temp for this project.

Include a "suggested skills" section, naming which skills the next agent should invoke (e.g. `/team-contract-align`, `/to-spec`, `/implement`).

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information (API keys, passwords, tokens, private keys).

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
