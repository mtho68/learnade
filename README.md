# Learnade

Learnade turns PDFs, DOCX files, PPTX decks, TXT files, and pasted notes into a neuroinclusive study workspace. Everything can run in the browser without asking a learner for an API key.

## What it does

- Accessible Reader with the real OpenDyslexic font, adjustable type, and line focus
- RSVP Speed Reader with a stable focal point and punctuation-aware pacing
- Brainrot Mode with Minecraft parkour or Subway Surfers gameplay, synchronized captions, and browser-generated narration
- ADHD-friendly focus session with a Pomodoro-style timer and smaller-step rescue
- Source-grounded study guides, flashcards with review/known stacks, and multi-question quizzes
- Local document extraction and an IndexedDB learning library
- Optional server-side GPT-5.6 Terra enhancement through Learnade's protected, rate-limited API route
- Optional free on-device AI using `onnx-community/Qwen2.5-0.5B-Instruct` through Transformers.js; WebGPU users download the quantized model once, and source text stays in their browser
- A deterministic instant generator remains available when AI is declined, unsupported, or offline

## Inspiration

Long-form studying can make the material feel harder to enter than it needs to be. Learnade was inspired by the desire to make learning more accessible, not only for learners with dyslexia or ADHD, but for anyone whose attention, energy, or reading needs change from day to day.

## How Codex and GPT-5.6 were used

Learnade's original product design and implementation were developed in ChatGPT with GPT-5.6. For the Build Week submission, Codex was then used in a separate task to implement and verify a judge-facing onboarding and accessibility polish pass. That Codex work improved the guided tour, clarified the first-run demo path, strengthened keyboard behavior, and verified the production build and deployment.

Learners do not need to provide an OpenAI key. At runtime, selected material can optionally use GPT-5.6 Terra through Learnade's protected server-side route. Learners can instead use the openly licensed Qwen2.5 0.5B model locally in a supported browser, or use the fully client-side deterministic generator. Learnade intentionally does not show an OpenAI sign-in button because sign-in alone would not power model inference.

## Challenges

The project was built under a tight Build Week timeline. The hardest parts were balancing ambitious multimodal learning modes with privacy, no-key onboarding, accessible controls, document parsing, browser compatibility, and honest source grounding.

## Accomplishments

Learnade supports several genuinely different ways to approach the same source material while keeping the learner in control. It includes a real dyslexia-oriented font, study-state-aware flashcards, functional quiz progression and feedback, source links, focus supports, and a no-account/no-key local-first architecture.

## What we learned

We learned more about inclusive study methods, responsible assistive UX, small browser models, WebGPU, local-first storage, multimodal focus aids, project management, and shipping quickly without pretending heuristic output is AI.

## What is next

- Human usability testing with students and accessibility specialists
- OCR for scanned PDFs
- More robust long-document chunking and model-quality evaluation
- Installable PWA and eventual app-store packaging
- Optional encrypted cross-device sync

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Run production verification with `npm test`.

## Privacy and model notes

Uploaded text, generated materials, and progress are stored in the browser. Choosing Learnade AI sends the selected source to the protected GPT-5.6 Terra route for generation and does not require the learner's own key. The separate on-device AI option is opt-in because its first use downloads roughly 500 MB and requires WebGPU. The Qwen model is Apache-2.0 licensed. Embedded gameplay is linked and attributed in the product; availability remains subject to the video host.
