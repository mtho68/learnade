# Decision Log

> Record decisions that future work could otherwise reopen. One entry per consequential decision.

## 2026-07-20: Keep the release focused
- Status: accepted
- Decision: Polish onboarding, accessibility, first-run truthfulness, metadata, and submission documentation without changing the Terra API or adding product scope.
- Why: These changes address the judge experience directly and avoid release risk before the submission deadline.
- Consequences / constraints: Existing learning modes and generation architecture remain unchanged.
- Evidence or links: K:\AI Handoff\2026-07-20_Learnade-Codex-Submission-Polish_AI-Handoff.md

## 2026-07-20: Make demo content opt-in
- Status: accepted
- Decision: A fresh browser starts with an empty learning library and offers explicit Anatomy and Computer Science demo choices.
- Why: Automatically seeded courses looked like fake learner history.
- Consequences / constraints: Demo content is created only after the visitor chooses it.
- Evidence or links: app/LearnadeApp.tsx

## 2026-07-20: Show generation provenance without overstating AI use
- Status: accepted
- Decision: Every course dashboard states whether its study materials came from GPT-5.6 Terra, on-device AI, or the deterministic local generator.
- Why: Learners and judges should be able to see when AI actually ran, while built-in demos must not be mislabeled.
- Consequences / constraints: Account-free memory is described as browser-only storage with no cloud sync.
- Evidence or links: lib/courseLibrary.ts and app/LearnadeApp.tsx
