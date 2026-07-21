import type { AIStudyDraft } from "../../../lib/aiLearning";

const MODEL = "gpt-5.6-terra";
const MAX_SOURCE_CHARS = 30000;
const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 30 * 60 * 1000;
const requests = new Map<string, { count: number; resetAt: number }>();

type RequestBody = { source?: unknown; title?: unknown };
type OpenAIResponse = { output_text?: unknown; output?: unknown; error?: { message?: unknown } };

const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["overview", "objectives", "keyTerms", "flashcards", "quiz", "narration"],
  properties: {
    overview: { type: "string" },
    objectives: { type: "array", items: { type: "string" } },
    keyTerms: { type: "array", items: { type: "object", additionalProperties: false, required: ["term", "definition"], properties: { term: { type: "string" }, definition: { type: "string" } } } },
    flashcards: { type: "array", items: { type: "object", additionalProperties: false, required: ["front", "back"], properties: { front: { type: "string" }, back: { type: "string" } } } },
    quiz: { type: "array", items: { type: "object", additionalProperties: false, required: ["prompt", "options", "answer", "explanation"], properties: { prompt: { type: "string" }, options: { type: "array", items: { type: "string" } }, answer: { type: "integer" }, explanation: { type: "string" } } } },
    narration: { type: "string" },
  },
};

function json(value: unknown, init: ResponseInit = {}) {
  return Response.json(value, { ...init, headers: { "Cache-Control": "no-store", ...(init.headers || {}) } });
}

function clientId(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

function permit(request: Request) {
  const now = Date.now(); const id = clientId(request); const previous = requests.get(id);
  if (!previous || previous.resetAt <= now) { requests.set(id, { count: 1, resetAt: now + WINDOW_MS }); return true; }
  if (previous.count >= MAX_REQUESTS_PER_WINDOW) return false;
  previous.count += 1; requests.set(id, previous); return true;
}

function outputText(value: OpenAIResponse) {
  if (typeof value.output_text === "string") return value.output_text;
  if (!Array.isArray(value.output)) return "";
  for (const item of value.output) {
    if (typeof item !== "object" || item === null || !("content" in item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) if (typeof content === "object" && content !== null && "text" in content && typeof content.text === "string") return content.text;
  }
  return "";
}

function asDraft(value: unknown): AIStudyDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const draft = value as Record<string, unknown>;
  if (typeof draft.overview !== "string" || !Array.isArray(draft.objectives) || !Array.isArray(draft.keyTerms) || !Array.isArray(draft.flashcards) || !Array.isArray(draft.quiz) || typeof draft.narration !== "string") return null;
  return draft as unknown as AIStudyDraft;
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: "GPT-5.6 Terra has not been activated yet. This course can still use the private local generator." }, { status: 503 });
  if (!permit(request)) return json({ error: "GPT-5.6 Terra has reached its temporary demo limit. Try again in about 30 minutes." }, { status: 429 });
  const body = await request.json().catch(() => null) as RequestBody | null;
  const source = typeof body?.source === "string" ? body.source.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "Study material";
  if (source.length < 40) return json({ error: "Add more source material before using GPT-5.6 Terra." }, { status: 400 });
  if (source.length > MAX_SOURCE_CHARS) return json({ error: "Choose one source under 30,000 characters for GPT-5.6 Terra. Long courses can be enhanced one lecture at a time." }, { status: 413 });
  const prompt = `You build rigorous, source-grounded study materials for the course titled ${title}. Use only the source text. Do not invent facts. Return 6-10 distinct, stand-alone academic key terms and flashcards. Each flashcard front must be a specific named concept, never a sentence fragment, pronoun, generic word, ordinal fact, or vague phrase. Each definition must stand alone. Create 8 non-trivial quiz questions with exactly four plausible options, one defensible correct answer, and an explanation grounded in the source. Do not put the answer word in a fill-in-the-blank prompt. Use a mix of recall, relationship, and application questions when the source supports it. Narration should be clear, accurate, and organized for listening.\n\nSOURCE:\n${source}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      store: false,
      max_output_tokens: 4000,
      input: [{ role: "system", content: "You are Learnade's source-grounded academic content generator. Follow the requested schema exactly." }, { role: "user", content: prompt }],
      text: { format: { type: "json_schema", name: "learnade_study_package", strict: true, schema: draftSchema } },
    }),
  });
  const payload = await response.json().catch(() => ({})) as OpenAIResponse;
  if (!response.ok) return json({ error: typeof payload.error?.message === "string" ? payload.error.message : "GPT-5.6 Terra could not complete this generation." }, { status: 502 });
  try {
    const draft = asDraft(JSON.parse(outputText(payload)));
    if (!draft) throw new Error("invalid");
    return json({ package: draft, model: MODEL });
  } catch {
    return json({ error: "GPT-5.6 Terra returned an incomplete study package. Please try again." }, { status: 502 });
  }
}
