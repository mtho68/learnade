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
