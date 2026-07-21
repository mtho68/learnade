# Learnade Devpost submission copy

## Tagline

Turn course material into adaptive, accessible ways to read, focus, practice, and prepare.

## Description

### Inspiration

Learnade began with a practical problem: useful study material can still be difficult to enter. Long readings, dense lecture notes, shifting attention, and different reading needs can make one fixed study format feel like another obstacle.

We wanted one source of truth with several honest ways into it. A learner should be able to read, listen, focus, practice, or test themselves without losing the connection to the original course material.

### What it does

Learnade turns PDFs, documents, slides, notes, and lecture transcripts into a browser-first study workspace. Learners can create multi-source courses and use:

- An Accessible Reader with adjustable type, spacing, contrast, OpenDyslexic, and line focus
- A fixed-focus RSVP Speed Reader
- Narrated review with synchronized captions and an optional visual anchor
- Focus Sessions that break study work into manageable steps
- Source-grounded study guides and flashcards
- Practice quizzes, diagnostics, and source-selected mock exams
- A Course Dashboard and personalized plan that respond to concept mastery and spaced review

The adaptive loop is central to Learnade. Diagnostic answers, quiz and exam results, and flashcard outcomes update mastery, return weak concepts for review, and change the recommended next activity.

A fresh visitor can choose a complete Anatomy & Physiology or Computer Science demo. The app does not invent learner history or fake progress. Courses and progress stay in that browser on that device, so learners do not need an account or API key. There is no cloud sync, and clearing site data removes the local library.

### How we built it

Learnade uses React, TypeScript, Vite, vinext, and OpenAI Sites. Course content and progress are stored locally with IndexedDB and local storage. PDF.js, Mammoth, and JSZip extract uploaded source material.

Study material can be produced in three ways. The instant deterministic generator works without a download or network request. Supported browsers can optionally run a small Qwen model locally through Transformers.js and WebGPU. Selected material can also use OpenAI GPT-5.6 Terra through Learnade's protected, rate-limited server route. Learners never provide or see the server key.

### How we used GPT-5.6 and Codex

Learnade was created during the OpenAI Build Week submission period. The original product design and implementation were developed in ChatGPT with GPT-5.6. GPT-5.6 helped shape the architecture, implement the learning modes and local course engine, debug interaction problems, and develop the optional protected Terra generation path.

We then opened the actual repository in a separate Codex desktop task for a focused implementation and release pass. Codex recovered the correct deployed source state, rebuilt the guided tour across every core mode, made the first-run demo path honest, and added the keyboard and responsive behavior needed for the tour to work on desktop and narrow mobile screens.

During hands-on browser QA, Codex found and fixed two real defects that were not caught by the initial implementation: focus initially remained behind the overlay, and the adaptive-learning tooltip covered its highlighted Dashboard control at shorter viewport heights. Submission rehearsal then exposed a focus-session navigation defect. Codex kept the timer and checklist active while a learner opens sources or switches modes, added an explicit route back to the session, made each course's actual generation method visible, and clarified that account-free memory is browser-only storage rather than cloud sync. Final browser audits standardized repeated action-button groups, removed horizontal overflow, kept the course-manager close button visible throughout long scrolling content, and replaced ambiguous “Learnade AI” labels with the actual model name, OpenAI GPT-5.6 Terra. Codex added regression coverage, ran the production build and all 30 automated tests, created the social preview metadata, and published Sites version 34.

We deliberately kept the Codex pass focused. It did not rewrite the protected GPT-5.6 route, add accounts, or introduce unrelated product scope. The README and commit history distinguish the GPT-5.6 ChatGPT work from the later Codex contribution.

### Challenges we ran into

The biggest product challenge was keeping generated study material grounded in the uploaded sources while supporting several different learning modes. A second challenge was local-first storage: courses, source materials, audio, and progress needed to remain useful without an account.

The release pass also exposed accessibility details that only appeared during real interaction. A modal can claim to be accessible while focus still escapes behind it, and a tooltip can technically remain visible while covering the exact control it is explaining. We treated those as functional failures rather than cosmetic issues.

### Accomplishments that we are proud of

Learnade is a complete, runnable learning product rather than a single-generation demo. The same course can support accessible reading, focused review, flashcards, quizzes, diagnostics, and mock exams. Results feed back into mastery and recommendations, and every generated activity stays connected to the learner's selected sources.

It also provides a useful path without paid inference. Judges can open a ready-made demo immediately, while learners can use the deterministic local mode without an account or key.

### What we learned

Inclusive design works best when it increases learner control instead of assigning people to a fixed label. We also learned that honest empty states and visible provenance matter in AI-assisted products. Showing where a recommendation came from is more useful than presenting unexplained confidence.

On the engineering side, we learned to test the actual interaction path, not only the generated code. Browser QA found accessibility and placement failures that source review alone missed.

### What's next

Next steps include usability testing with students and accessibility specialists, OCR for scanned PDFs, stronger long-document evaluation, an installable PWA, and optional encrypted cross-device sync.

## Links

- Live application: https://learnade.hannahandmattthorsen.chatgpt.site
- Code repository: https://github.com/mtho68/learnade
- Codex feedback session ID: `019f819c-1609-72c2-b866-8b00dcc676c8`
