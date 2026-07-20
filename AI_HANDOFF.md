# AI Handoff

> This file is the vendor-neutral continuity record for this repository. It is intentionally concise. Treat the repository, git state, and verification output as authoritative over any old chat transcript.

## Current objective
Publish the focused Learnade submission-polish release with an accessible guided tour, honest first-run state, and accurate submission documentation.

## Immediate next action
Commit the verified source, save a Sites version, deploy it publicly, and verify the deployed URL.

## Work completed
- Added a 12-step adaptive guided tour with dynamic target filtering and placement.
- Added keyboard focus trapping, Escape handling, focus restoration, mobile positioning, dark mode support, and reduced-motion behavior.
- Removed automatic demo seeding and fake first-run progress while keeping explicit Anatomy and Computer Science demos.
- Corrected production metadata tests and documented the ChatGPT-origin/Codex-polish history truthfully.

## Decisions and constraints
- The protected GPT-5.6 Terra API path was not modified.
- No accounts, providers, learning modes, transcription work, or large on-device model work were added.
- Demo courses remain explicit user choices instead of appearing as learner progress.

## Changed areas
- app/LearnadeApp.tsx: tour, first-run flow, and demo selection.
- app/globals.css: tour overlay, placement, and responsive behavior.
- lib/guidedTour.ts: available-step filtering.
- tests/guided-tour.test.mjs and tests/rendered-html.test.mjs: release coverage.
- app/layout.tsx and README.md: production metadata and submission history.

## Verification
- Command: npm test through Git Bash
  Result: Passed on 2026-07-20. Production build succeeded and all 23 tests passed. One pre-existing lint warning and the existing bundle-size warning remain.
- Hands-on browser QA
  Result: Passed fresh empty state, explicit demo selection, Reader, Flashcards, Quiz, Mock Exam, focus trap and return, dark mode, completion persistence, and all 12 tour steps at 375px width without horizontal overflow or tooltip/control overlap.

## Known issues, risks, and blockers
- Public deployment and deployed-URL verification are still pending at this checkpoint.

## Continuation metadata
- Last active agent: Codex
- Stop reason / handoff reason: Pre-publication checkpoint
- Last updated by: Codex
- Last updated at: 2026-07-20

<!-- BEGIN GENERATED SNAPSHOT -->
Generated at: 2026-07-20T15:55:42-07:00
Project root: K:\Projects\learnade
Git branch: main
HEAD: e6ff1d2

Git status:
```text
M README.md
 M app/LearnadeApp.tsx
 M app/globals.css
 M app/layout.tsx
 M tests/guided-tour.test.mjs
 M tests/rendered-html.test.mjs
?? .project/
?? AI_HANDOFF.md
?? lib/guidedTour.ts
?? public/learnade-social-preview.png
```

Diff stat (working tree):
```text
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/LearnadeApp.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/globals.css', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/layout.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/guided-tour.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/rendered-html.test.mjs', LF will be replaced by CRLF the next time Git touches it
 README.md                    |   9 ++--
 app/LearnadeApp.tsx          | 112 +++++++++++++++++++++++++++++--------------
 app/globals.css              |  12 ++---
 app/layout.tsx               |  17 +++++--
 tests/guided-tour.test.mjs   |  20 +++++++-
 tests/rendered-html.test.mjs |   9 ++--
 6 files changed, 123 insertions(+), 56 deletions(-)
```
<!-- END GENERATED SNAPSHOT -->
