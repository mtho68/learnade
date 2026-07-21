# AI Handoff

> This file is the vendor-neutral continuity record for this repository. It is intentionally concise. Treat the repository, git state, and verification output as authoritative over any old chat transcript.

## Current objective
Complete the judge-accessible OpenAI Build Week submission package for the verified Learnade release.

## Immediate next action
Publish the current repository to Matt's GitHub account without rewriting history, verify public access, and add the repository URL to the Devpost draft.

## Work completed
- Added a 12-step adaptive guided tour with dynamic target filtering and placement.
- Added keyboard focus trapping, Escape handling, focus restoration, mobile positioning, dark mode support, and reduced-motion behavior.
- Removed automatic demo seeding and fake first-run progress while keeping explicit Anatomy and Computer Science demos.
- Corrected production metadata tests and documented the ChatGPT-origin/Codex-polish history truthfully.
- Published Sites version 29 from commit d9c71d793f8dadfdc129213a0c4c136a6dba69c3 and verified the public URL.
- Added a Build Week-ready README, MIT license, and DEVPOST_SUBMISSION.md.
- Updated the Devpost project page with accurate GPT-5.6 and Codex history and the live application URL.
- Submitted Codex feedback and recorded session ID 019f819c-1609-72c2-b866-8b00dcc676c8.

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
- GitHub publication and the required repository URL are still pending.
- The narrated YouTube video, required personal fields, and final Devpost submission are still pending.
- The existing large-client-bundle warning is deferred until after submission.

## Continuation metadata
- Last active agent: Codex
- Stop reason / handoff reason: Handing GitHub publication to Claude as requested by Matt
- Last updated by: Codex
- Last updated at: 2026-07-20

<!-- BEGIN GENERATED SNAPSHOT -->
Generated at: 2026-07-20T18:44:41-07:00
Project root: K:\Projects\learnade
Git branch: main
HEAD: 3d32d43

Git status:
```text
M .project/PLAN.md
 M .project/PROJECT_STATUS.md
 M .project/RISKS.md
 M AI_HANDOFF.md
 M README.md
?? DEVPOST_SUBMISSION.md
?? LICENSE
```

Diff stat (working tree):
```text
warning: in the working copy of '.project/PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.project/PROJECT_STATUS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.project/RISKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AI_HANDOFF.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
 .project/PLAN.md           |  16 ++++++
 .project/PROJECT_STATUS.md |  21 ++++----
 .project/RISKS.md          |  14 ++++++
 AI_HANDOFF.md              |  13 +++--
 README.md                  | 118 +++++++++++++++++++++++++++++++++------------
 5 files changed, 138 insertions(+), 44 deletions(-)
```
<!-- END GENERATED SNAPSHOT -->
