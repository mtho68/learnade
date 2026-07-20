import { groundedLearningPackage, type AIStudyDraft } from "./aiLearning";
import type { LearningPackage } from "./localLearning";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
type RecordValue = Record<string, unknown>;
type Generator = (messages: Array<{ role: string; content: string }>, options: RecordValue) => Promise<unknown>;
let generatorPromise: Promise<Generator> | null = null;

const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const records = (value: unknown) => Array.isArray(value) ? value.filter(isRecord) : [];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function extractJson(value: string): RecordValue {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = value.indexOf("{"); const end = value.lastIndexOf("}");
  const parsed: unknown = JSON.parse(fenced || (start >= 0 && end > start ? value.slice(start, end + 1) : "{}"));
  if (!isRecord(parsed)) throw new Error("The model returned an invalid study package.");
  return parsed;
}

function toDraft(value: RecordValue): AIStudyDraft {
  return {
    overview: text(value.overview),
    objectives: Array.isArray(value.objectives) ? value.objectives.filter((item): item is string => typeof item === "string") : [],
    keyTerms: records(value.keyTerms).map(item => ({ term: text(item.term), definition: text(item.definition) })),
    flashcards: records(value.flashcards).map(item => ({ front: text(item.front), back: text(item.back) })),
    quiz: records(value.quiz).map(item => ({ prompt: text(item.prompt), options: Array.isArray(item.options) ? item.options.map(text) : [], answer: Number(item.answer), explanation: text(item.explanation) })),
    narration: text(value.narration),
  };
}

async function loadGenerator(onProgress: (message: string) => void): Promise<Generator> {
  if (!("gpu" in navigator)) throw new Error("WebGPU is unavailable in this browser.");
  generatorPromise ||= import("@huggingface/transformers").then(async ({ pipeline }) => {
    const model = await pipeline("text-generation", MODEL, { device: "webgpu", dtype: "q4f16", progress_callback: (event: unknown) => {
      if (isRecord(event) && event.status === "progress" && typeof event.progress === "number") onProgress(`Downloading on-device AI… ${Math.round(event.progress)}%`);
    }});
    return model as unknown as Generator;
  }).catch(error => { generatorPromise = null; throw error; });
  return generatorPromise;
}

export async function generateWithBrowserAI(textSource: string, title: string, onProgress: (message: string) => void): Promise<LearningPackage> {
  onProgress("Loading the free on-device model… first use downloads about 500 MB.");
  const generator = await loadGenerator(onProgress);
  onProgress("The on-device AI is building grounded study materials…");
  const source = textSource.replace(/\s+/g, " ").slice(0, 12000);
  const prompt = `Create study materials using ONLY the source. Return JSON with keys overview (string), objectives (string[]), keyTerms ({term,definition}[]), flashcards ({front,back}[]), quiz ({prompt,options:string[4],answer:number,explanation}[]), narration (string). Make 5-8 concise, standalone academic terms/cards and 5 quiz questions. A card front must be a specific named concept, never a sentence fragment, generic phrase, ordinal fact, or phrase such as “understanding these factors.” A definition must make sense without surrounding context. answer is a zero-based option index. No markdown.\nTITLE: ${title}\nSOURCE: ${source}`;
  const result = await generator([{ role: "user", content: prompt }], { max_new_tokens: 1400, do_sample: false });
  const first = Array.isArray(result) && isRecord(result[0]) ? result[0] : {};
  const generated = first.generated_text;
  const last = Array.isArray(generated) ? generated.at(-1) : generated;
  const raw = isRecord(last) ? last.content : last;
  return groundedLearningPackage(textSource, title, toDraft(extractJson(text(raw))));
}

export const browserAIModel = MODEL;
