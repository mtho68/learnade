# Risks and Blockers

> Track only real delivery risks, dependencies, or blockers. Remove resolved entries after recording their resolution in the relevant status/decision note.

## Large client bundle warning
- Severity: low
- Owner: Matt
- Impact on deliverable: No functional failure. Initial load may benefit from future code splitting.
- Mitigation / next action: Defer code splitting until after submission to avoid destabilizing the verified release.
- Status: monitoring

## Public deployment pending
- Severity: medium
- Owner: Codex
- Impact on deliverable: The verified changes are not complete until the public URL is updated.
- Mitigation / next action: Save a Sites version, deploy it, and verify the public URL before handoff.
- Status: open
