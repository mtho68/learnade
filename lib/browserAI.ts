import { generateLocalLearningPackage, type LearningPackage } from "./localLearning";

const MODEL="onnx-community/Qwen2.5-0.5B-Instruct";
type RecordValue=Record<string,unknown>;
type Generator=(messages:Array<{role:string;content:string}>,options:RecordValue)=>Promise<unknown>;
let generatorPromise:Promise<Generator>|null=null;

const isRecord=(value:unknown):value is RecordValue=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const records=(value:unknown)=>Array.isArray(value)?value.filter(isRecord):[];
const text=(value:unknown)=>typeof value==="string"?value.trim():"";

function extractJson(value:string):RecordValue {
  const fenced=value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start=value.indexOf("{"); const end=value.lastIndexOf("}");
  const parsed:unknown=JSON.parse(fenced||(start>=0&&end>start?value.slice(start,end+1):"{}"));
  if(!isRecord(parsed))throw new Error("The model returned an invalid study package.");
  return parsed;
}

async function loadGenerator(onProgress:(message:string)=>void):Promise<Generator>{
  if(!("gpu" in navigator))throw new Error("WebGPU is unavailable in this browser.");
  generatorPromise||=import("@huggingface/transformers").then(async({pipeline})=>{
    const model=await pipeline("text-generation",MODEL,{device:"webgpu",dtype:"q4f16",progress_callback:(event:unknown)=>{
      if(isRecord(event)&&event.status==="progress"&&typeof event.progress==="number")onProgress(`Downloading on-device AI… ${Math.round(event.progress)}%`);
    }});
    return model as unknown as Generator;
  }).catch(error=>{generatorPromise=null;throw error});
  return generatorPromise;
}

export async function generateWithBrowserAI(textSource:string,title:string,onProgress:(message:string)=>void):Promise<LearningPackage>{
  onProgress("Loading the free on-device model… first use downloads about 500 MB.");
  const generator=await loadGenerator(onProgress);
  onProgress("The on-device AI is building grounded study materials…");
  const source=textSource.replace(/\s+/g," ").slice(0,12000);
  const prompt=`Create study materials using ONLY the source. Return JSON with keys overview (string), objectives (string[]), keyTerms ({term,definition}[]), flashcards ({front,back}[]), quiz ({prompt,options:string[4],answer:number,explanation}[]), narration (string). Make 5-8 terms/cards and 5 quiz questions. answer is a zero-based option index. No markdown.\nTITLE: ${title}\nSOURCE: ${source}`;
  const result=await generator([{role:"user",content:prompt}],{max_new_tokens:1400,do_sample:false});
  const first=Array.isArray(result)&&isRecord(result[0])?result[0]:{};
  const generated=first.generated_text;
  const last=Array.isArray(generated)?generated.at(-1):generated;
  const raw=isRecord(last)?last.content:last;
  const ai=extractJson(text(raw));
  const base=generateLocalLearningPackage(textSource,title);
  const sourceSection=(...values:unknown[])=>{
    const tokens=new Set(values.map(String).join(" ").toLowerCase().match(/[a-z][a-z-]{4,}/g)||[]);
    const ranked=base.sections.map(section=>({section,score:[...tokens].filter(token=>section.text.toLowerCase().includes(token)).length})).sort((a,b)=>b.score-a.score);
    return ranked[0]?.score>=2?ranked[0].section:undefined;
  };
  const terms=records(ai.keyTerms).filter(value=>text(value.term)&&text(value.definition)).slice(0,10);
  const cards=records(ai.flashcards).filter(value=>text(value.front)&&text(value.back)).slice(0,10);
  const quiz=records(ai.quiz).filter(value=>Array.isArray(value.options)&&value.options.length===4&&value.options.every(option=>typeof option==="string")&&Number.isInteger(value.answer)&&Number(value.answer)>=0&&Number(value.answer)<4&&text(value.prompt)).slice(0,8);
  const objectives=Array.isArray(ai.objectives)?ai.objectives.filter((value):value is string=>typeof value==="string"&&Boolean(value.trim())).slice(0,6):[];
  return {...base,
    overview:text(ai.overview)||base.overview,
    objectives:objectives.length?objectives:base.objectives,
    keyTerms:terms.length?terms.map((value,index)=>{const section=sourceSection(value.term,value.definition);return section?{term:text(value.term)||`Term ${index+1}`,definition:text(value.definition),sourceSection:section.id}:base.keyTerms[index%base.keyTerms.length]}):base.keyTerms,
    flashcards:cards.length?cards.map((value,index)=>{const section=sourceSection(value.front,value.back);return section?{id:`ai-card-${index+1}`,front:text(value.front),back:text(value.back),sourceSection:section.id}:base.flashcards[index%base.flashcards.length]}):base.flashcards,
    quiz:quiz.length?quiz.map((value,index)=>{const section=sourceSection(value.prompt,value.explanation);return section?{id:`ai-quiz-${index+1}`,prompt:text(value.prompt),options:(value.options as string[]).map(String),answer:Number(value.answer),explanation:text(value.explanation)||"Review the matching source section.",sourceSection:section.id}:base.quiz[index%base.quiz.length]}):base.quiz,
    narration:text(ai.narration)||base.narration,
  };
}

export const browserAIModel=MODEL;
