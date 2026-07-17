import { generateLocalLearningPackage, type LearningPackage } from "./localLearning";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
let generatorPromise: Promise<any> | null = null;

function extractJson(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export async function generateWithBrowserAI(
  text: string,
  title: string,
  onProgress: (message: string) => void,
): Promise<LearningPackage> {
  if (!("gpu" in navigator)) throw new Error("WebGPU is unavailable in this browser.");
  onProgress("Loading the free on-device model… first use downloads about 500 MB.");
  generatorPromise ||= import("@huggingface/transformers").then(({ pipeline }) => pipeline(
    "text-generation",
    MODEL,
    { device: "webgpu", dtype: "q4f16", progress_callback: (event: any) => {
      if (event?.status === "progress" && Number.isFinite(event.progress)) onProgress(`Downloading on-device AI… ${Math.round(event.progress)}%`);
    } },
  ));
  const generator = await generatorPromise;
  onProgress("The on-device AI is building grounded study materials…");
  const source = text.replace(/\s+/g, " ").slice(0, 12000);
  const prompt = `Create study materials using ONLY the source. Return JSON with keys overview (string), objectives (string[]), keyTerms ({term,definition}[]), flashcards ({front,back}[]), quiz ({prompt,options:string[4],answer:number,explanation}[]), narration (string). Make 5-8 terms/cards and 5 quiz questions. answer is a zero-based option index. No markdown.\nTITLE: ${title}\nSOURCE: ${source}`;
  const result: any = await generator([{ role: "user", content: prompt }], { max_new_tokens: 1400, do_sample: false });
  const generated = result?.[0]?.generated_text;
  const raw = Array.isArray(generated) ? generated.at(-1)?.content : generated;
  const ai = extractJson(String(raw || ""));
  const base = generateLocalLearningPackage(text, title);
  const terms = Array.isArray(ai.keyTerms) ? ai.keyTerms.slice(0, 10) : [];
  const cards = Array.isArray(ai.flashcards) ? ai.flashcards.slice(0, 10) : [];
  const quiz = Array.isArray(ai.quiz) ? ai.quiz.filter((q:any)=>Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4).slice(0,8) : [];
  return {
    ...base,
    overview: typeof ai.overview === "string" ? ai.overview : base.overview,
    objectives: Array.isArray(ai.objectives) ? ai.objectives.filter((v:any)=>typeof v === "string").slice(0,6) : base.objectives,
    keyTerms: terms.length ? terms.map((v:any,i:number)=>({ term:String(v.term||`Term ${i+1}`), definition:String(v.definition||""), sourceSection:base.sections[i%base.sections.length].id })) : base.keyTerms,
    flashcards: cards.length ? cards.map((v:any,i:number)=>({ id:`ai-card-${i+1}`, front:String(v.front||""), back:String(v.back||""), sourceSection:base.sections[i%base.sections.length].id })) : base.flashcards,
    quiz: quiz.length ? quiz.map((v:any,i:number)=>({ id:`ai-quiz-${i+1}`, prompt:String(v.prompt||""), options:v.options.map(String), answer:v.answer, explanation:String(v.explanation||"Review the matching source section."), sourceSection:base.sections[i%base.sections.length].id })) : base.quiz,
    narration: typeof ai.narration === "string" ? ai.narration : base.narration,
  };
}

export const browserAIModel = MODEL;
