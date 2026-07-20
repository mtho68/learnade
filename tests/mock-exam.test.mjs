import test from "node:test";
import assert from "node:assert/strict";
import { generateLocalLearningPackage } from "../lib/localLearning.ts";
import { buildMockExam, gradeMockExam } from "../lib/mockExam.ts";

const source = (topic) => `${topic} begins with a defined input and produces a measurable output. ${topic} depends on several variables that change the final result. Students compare the inputs, process, and outputs when explaining ${topic}. A worked example helps distinguish ${topic} from a separate process. Testing each variable reveals the strongest relationship.`;
const material = (id, title, preserveIds = false) => ({ id, title, source:source(title), createdAt:"2026-07-17T00:00:00.000Z", kind:"pasted", preserveIds, package:generateLocalLearningPackage(source(title),title) });

test("mock exam uses only selected materials and keeps valid source references", () => {
  const materials=[material("one","Limits"),material("two","Derivatives"),material("three","Integrals")];
  const exam=buildMockExam(materials,["one","three"],20,"Calculus");
  const sectionIds=new Set(exam.sections.map(section=>section.id));
  assert.deepEqual(new Set(exam.questions.map(question=>question.materialId)),new Set(["one","three"]));
  assert.ok(exam.questions.every(question=>sectionIds.has(question.sourceSection)));
  assert.ok(exam.questions.every(question=>question.materialId!=="two"));
});

test("mock exam clamps count and interleaves selected materials", () => {
  const materials=[material("one","Cell division"),material("two","Genetics")];
  const exam=buildMockExam(materials,["one","two"],999,"Biology");
  assert.ok(exam.questions.length<=materials.reduce((total,item)=>total+item.package.quiz.length,0));
  assert.deepEqual(exam.questions.slice(0,2).map(question=>question.materialId),["one","two"]);
});

test("legacy material ids remain grounded and grading counts unanswered as missed", () => {
  const legacy=material("legacy","Photosynthesis",true);
  const exam=buildMockExam([legacy],[legacy.id],5,"Biology");
  assert.ok(exam.questions.every(question=>exam.sections.some(section=>section.id===question.sourceSection)));
  const answers=exam.questions.map((question,index)=>index===0?question.answer:null);
  const result=gradeMockExam(exam.questions,answers);
  assert.equal(result.correct,1);
  assert.equal(result.unanswered,Math.max(0,exam.questions.length-1));
  assert.equal(result.missed.length,Math.max(0,exam.questions.length-1));
});

test("mock exam removes duplicate source statements across materials", () => {
  const first=material("one","Memory");const second=material("two","Memory copy");
  second.package={...second.package,quiz:second.package.quiz.map((question,index)=>index===0?{...question,explanation:first.package.quiz[0].explanation}:question)};
  const exam=buildMockExam([first,second],["one","two"],999,"Psychology");
  const statements=exam.questions.map(question=>question.explanation.toLowerCase().replace(/\s+/g," ").trim());
  assert.equal(new Set(statements).size,statements.length);
  assert.ok(exam.questions.every(question=>question.id.startsWith(`exam:${question.materialId}:`)));
});
test("new exam versions prefer unused questions and shuffle answer positions", () => {
  const materials=[material("one","Cell division"),material("two","Genetics")];
  const first=buildMockExam(materials,["one","two"],5,"Biology",[],1);
  const second=buildMockExam(materials,["one","two"],5,"Biology",first.questions.map(question=>question.id),2);
  const allIds=new Set(first.questions.map(question=>question.id));
  assert.ok(second.questions.some(question=>!allIds.has(question.id)) || first.questions.length===materials.reduce((total,item)=>total+item.package.quiz.length,0));
  assert.ok(second.questions.every(question=>question.answer>=0&&question.answer<question.options.length));
});
