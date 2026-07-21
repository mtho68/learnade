# AI Handoff

> This file is the vendor-neutral continuity record for this repository. It is intentionally concise. Treat the repository, git state, and verification output as authoritative over any old chat transcript.

## Current objective
Finish the manual OpenAI Build Week submission using the verified public Learnade release.

## Immediate next action
Record the narrated demo video, add the YouTube URL and remaining personal fields to Devpost, then review and submit before the deadline.

## Work completed
- Added a 12-step adaptive guided tour with dynamic target filtering and placement.
- Added keyboard focus trapping, Escape handling, focus restoration, mobile positioning, dark mode support, and reduced-motion behavior.
- Removed automatic demo seeding and fake first-run progress while keeping explicit Anatomy and Computer Science demos.
- Corrected production metadata tests and documented the ChatGPT-origin/Codex-polish history truthfully.
- Fixed focus-session navigation so the timer and checklist remain active while opening sources or switching modes, with a clear return path.
- Added visible per-course generation provenance and an explicit explanation of browser-only memory without an account.
- Published Sites version 32 from commit d8bfb8b800c95f56539009e268e20e0322c1274b and verified the public URL.
- Standardized the five course-management actions to equal icon-over-label buttons with a responsive mobile grid, removed a global secondary-button offset, and gave all three course-card actions the same icon-plus-label structure.
- Added a Build Week-ready README, MIT license, and DEVPOST_SUBMISSION.md.
- Published the public GitHub repository at https://github.com/mtho68/learnade and recorded it in the submission copy.
- Updated the Devpost project page with accurate GPT-5.6 and Codex history and the live application URL.
- Submitted Codex feedback and recorded session ID 019f819c-1609-72c2-b866-8b00dcc676c8.

## Decisions and constraints
- The protected GPT-5.6 Terra API path was not modified.
- No accounts, cloud sync, providers, learning modes, transcription expansion, or large on-device model work were added.
- Demo courses remain explicit user choices instead of appearing as learner progress.
- Course dashboards describe the generation method that actually ran; deterministic demo courses are not mislabeled as AI-generated.

## Changed areas
- app/LearnadeApp.tsx: tour, first-run flow, demo selection, focus-session continuity, generation provenance, and local-memory explanation.
- app/globals.css: tour overlay, placement, responsive behavior, focus timer dock, provenance banner, and memory notice.
- lib/focusSession.ts and lib/courseLibrary.ts: persistent focus state and truthful generation summaries.
- lib/guidedTour.ts: available-step filtering.
- tests/guided-tour.test.mjs and tests/rendered-html.test.mjs: release coverage.
- app/layout.tsx and README.md: production metadata and submission history.

## Verification
- Command: npm test through Git Bash
  Result: Passed on 2026-07-21. Production build and Sites artifact validation succeeded; all 30 tests passed. One pre-existing lint warning and the existing bundle-size warning remain.
- Hands-on browser QA
  Result: Passed fresh empty state, explicit demo selection, Reader, Flashcards, Quiz, Mock Exam, focus trap and return, dark mode, completion persistence, and all 12 tour steps at 375px width without horizontal overflow or tooltip/control overlap. The final button audit also passed at 1280 and 375 pixels with aligned control groups and no horizontal overflow.

## Known issues, risks, and blockers
- The narrated YouTube video, required personal fields, and final Devpost submission are still pending.
- The existing large-client-bundle warning is deferred until after submission.

## Continuation metadata
- Last active agent: Codex
- Stop reason / handoff reason: Code, GitHub, and live site are ready; only Matt's video and final Devpost submission remain.
- Last updated by: Codex
- Last updated at: 2026-07-21

<!-- BEGIN GENERATED SNAPSHOT -->
Generated at: 2026-07-21T00:39:23-07:00
Project root: K:\Projects\learnade
Git branch: main
HEAD: d8bfb8b

Git status:
```text
M .project/PROJECT_STATUS.md
 M AI_HANDOFF.md
 M DEVPOST_SUBMISSION.md
 M README.md
```

Diff stat (working tree):
```text
warning: in the working copy of '.project/PROJECT_STATUS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AI_HANDOFF.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'DEVPOST_SUBMISSION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
 .project/PROJECT_STATUS.md | 6 +++---
 AI_HANDOFF.md              | 8 ++++----
 DEVPOST_SUBMISSION.md      | 2 +-
 README.md                  | 9 +++++----
 4 files changed, 13 insertions(+), 12 deletions(-)
```
<!-- END GENERATED SNAPSHOT -->
