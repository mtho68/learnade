import assert from "node:assert/strict";
import test from "node:test";
import { generateLocalLearningPackage } from "../lib/localLearning.ts";

test("preserves short source facts instead of silently dropping them",()=>{
  const source="ATP matters. It stores energy. Cells use ATP during work.";
  const result=generateLocalLearningPackage(source,"ATP basics");
  assert.equal(result.sections.flatMap(section=>section.sentences).join(" "),source);
});

test("creates usable no-AI cards and quiz questions grounded in sections",()=>{
  const source="Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight in chloroplasts. ATP stores energy for the Calvin cycle. The Calvin cycle uses carbon dioxide to build glucose. Water splitting releases oxygen.";
  const result=generateLocalLearningPackage(source,"Photosynthesis");
  const sectionIds=new Set(result.sections.map(section=>section.id));
  assert.ok(result.flashcards.length>=5);
  assert.ok(result.quiz.length>=1);
  assert.ok(result.flashcards.every(card=>card.front&&card.back&&sectionIds.has(card.sourceSection)));
  assert.ok(result.quiz.every(question=>question.options.length===4&&question.answer>=0&&question.answer<4&&sectionIds.has(question.sourceSection)));
});
