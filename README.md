# Learnade

Learnade turns readings, lecture notes, presentations, and recorded lectures into a flexible study workspace. Learners can use the same source material as accessible reading, focused review, flashcards, practice quizzes, mock exams, or a personalized study plan.

**Live app:** https://learnade.hannahandmattthorsen.chatgpt.site

## Why it exists

Long-form studying can make useful material difficult to enter. Reading needs, attention, and energy also change from one study session to the next. Learnade gives learners several honest ways to approach the same source without treating one study method as universally correct.

Learnade is an educational support tool. It does not claim to diagnose, treat, or guarantee learning outcomes.

## What it does

- Creates courses from PDFs, DOCX files, PPTX decks, TXT files, pasted notes, and lecture transcripts
- Provides an Accessible Reader with OpenDyslexic, adjustable type, contrast, spacing, and line focus
- Includes a fixed-focus RSVP Speed Reader, narration with captions, and manageable Focus Sessions
- Builds source-grounded study guides, flashcards, practice quizzes, diagnostics, and mock exams
- Tracks concept mastery, spaced review, and missed material to recommend what to study next
- Lets learners select the relevant course materials in supported study modes
- Stores courses and progress in that browser on that device without requiring an account. There is no cloud sync, and clearing site data removes the local library.
- Offers an instant deterministic generator, an optional browser-local Qwen model, and an optional protected GPT-5.6 Terra enhancement

## Try the complete demo

1. Open the [live app](https://learnade.hannahandmattthorsen.chatgpt.site) in a fresh browser.
2. Follow or skip the guided product tour.
3. Select **Try Anatomy & Physiology** or **Try Introduction to Computer Science**.
4. Use the Course Dashboard to start the diagnostic or open the personalized plan.
5. Use Quick Demo to enter Accessible Reader, Flashcards, Practice Quiz, or Mock Exam.

Demo selection is explicit. A fresh browser starts with an empty learning library and does not display invented learner progress.

## Adaptive learning loop

Learnade records outcomes from the diagnostic, flashcards, quizzes, and mock exams. Those results update concept mastery, return weak material for review, and change the recommended next activity. Recommendations are grounded in the selected course sources rather than a generic curriculum.

## How GPT-5.6 and Codex were used

Learnade was created during the OpenAI Build Week submission period. The original product design and implementation were developed in ChatGPT with GPT-5.6. GPT-5.6 helped shape the product architecture, implement the learning modes and local course engine, debug interaction problems, and develop the optional protected GPT-5.6 Terra generation path.

The repository was then opened in a separate Codex desktop task for a focused implementation and release pass. Codex:

- Recovered and reconciled the latest deployed repository state before editing
- Rebuilt the guided tour to cover all core modes and explain the adaptive learning loop
- Changed first-run behavior so demos are selected explicitly and progress remains honest
- Added keyboard focus trapping, Escape handling, focus restoration, dynamic target filtering, and tooltip placement
- Verified light mode, dark mode, reduced motion, desktop layout, and every tour step at 375-pixel width
- Kept focus-session time and task progress active while learners open sources or switch study modes, with a clear route back
- Added visible course-generation provenance and explained how browser-only memory works without an account
- Added regression coverage for the tour, focus-session state, course provenance, production metadata, and social sharing
- Ran the production build and all automated tests, then published Sites version 30

The key release decisions were to keep the work judge-visible, preserve the protected Terra API path, avoid adding accounts or new providers, and fix real onboarding and accessibility failures instead of redesigning the product.

This history is intentionally specific. The original ChatGPT work is not represented as a Codex task.

## Runtime AI choices

Learners never provide an OpenAI key.

- **Learnade AI:** Selected source material can be sent to a protected, rate-limited server route using GPT-5.6 Terra. The key stays in the hosting environment.
- **On-device AI:** Supported browsers can optionally download `onnx-community/Qwen2.5-0.5B-Instruct` and generate study material locally with WebGPU.
- **Instant local mode:** A deterministic source-grounded generator works without a model download or network request.

Uploaded text, generated material, and study progress are stored in the browser on that device. This browser-only memory does not require an account, but it does not sync to other devices. The GPT-5.6 enhancement is optional and clearly labeled on each course dashboard when it was actually used.

## Technology

- React 19, TypeScript, Next.js-compatible routing, Vite, and vinext
- OpenAI Sites hosting with a server-side GPT-5.6 Terra route
- IndexedDB and local storage for courses, audio, and study progress
- PDF.js, Mammoth, and JSZip for document extraction
- Transformers.js for the optional browser-local model
- Node test runner and ESLint for regression verification

## Local development

Requires Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:5173` by default. On Windows, run the npm commands from Git Bash because the project scripts use Bash helpers.

Run the complete production gate with:

```bash
npm test
```

The gate runs lint, creates and validates the production Sites artifact, and executes the automated regression suite. The verified submission release passed all 29 tests on July 20, 2026.

The deterministic mode and built-in demo courses do not require environment variables. To test the optional protected GPT-5.6 path locally, provide `OPENAI_API_KEY` only through a local environment file. Environment files are excluded from Git.

## Repository and licensing

Learnade's original source code and project-specific assets are released under the [MIT License](LICENSE). Dependencies and remotely embedded content retain their own licenses and terms. The Qwen model is Apache-2.0 licensed. Never commit API keys, learner documents, browser storage, recordings, or generated private course data.

## Verification and release

- Submission release commit: `115773d3508a9f18067c9b3ab49e7a9ba6fd00e9`
- OpenAI Sites version: 30
- Automated result: 29 tests passed, 0 failed
- Browser QA: fresh state, explicit demo selection, dashboard, plan, Reader, Flashcards, Quiz, Mock Exam, focus behavior, dark mode, and narrow mobile tour
- Public deployment: https://learnade.hannahandmattthorsen.chatgpt.site

The production build has a non-blocking large-bundle warning. Code splitting is intentionally deferred until after submission to avoid destabilizing the verified release.

## What is next

- Human usability testing with students and accessibility specialists
- OCR for scanned PDFs
- More robust long-document chunking and model-quality evaluation
- Installable PWA packaging
- Optional encrypted cross-device sync
