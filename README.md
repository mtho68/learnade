# Learnade

Learnade turns PDFs, DOCX files, PPTX decks, TXT files, and pasted notes into a neuroinclusive study workspace. Everything can run in the browser without asking a learner for an API key.

## What it does

- Accessible Reader with the real OpenDyslexic font, adjustable type, and line focus
- RSVP Speed Reader with a stable focal point and punctuation-aware pacing
- Brainrot Mode with Minecraft parkour or Subway Surfers gameplay, synchronized captions, and browser-generated narration
- ADHD-friendly focus session with a Pomodoro-style timer and smaller-step rescue
- Source-grounded study guides, flashcards with review/known stacks, and multi-question quizzes
- Local document extraction and an IndexedDB learning library
- Optional free on-device AI using `onnx-community/Qwen2.5-0.5B-Instruct` through Transformers.js; WebGPU users download the quantized model once, and source text stays in their browser
- A deterministic instant generator remains available when AI is declined, unsupported, or offline

## Inspiration

Long-form studying can make the material feel harder to enter than it needs to be. Learnade was inspired by the desire to make learning more accessible—not only for learners with dyslexia or ADHD, but for anyone whose attention, energy, or reading needs change from day to day.

## How Codex and GPT-5.6 were used

Learnade was designed and implemented collaboratively in Codex with GPT-5.6. They helped turn the product idea into an architecture, build the React application, implement document extraction and browser storage, create and refine the accessible UI, debug interaction problems, research model and media licensing, run automated QA, and prepare deployment. Codex was the development workspace and agent; GPT-5.6 supplied the reasoning and coding capability used during development.

They are not hidden runtime dependencies and learners do not need an OpenAI key. At runtime, the optional generative feature uses the openly licensed Qwen2.5 0.5B model locally in the browser. The non-AI path is fully client-side and deterministic.

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

Uploaded text, generated materials, and progress are stored in the browser. The AI enhancement is opt-in because its first use downloads roughly 500 MB and requires WebGPU. The Qwen model is Apache-2.0 licensed. Embedded gameplay is linked and attributed in the product; availability remains subject to the video host.
