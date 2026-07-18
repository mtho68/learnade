import assert from "node:assert/strict";
import test from "node:test";
import { generateLocalLearningPackage } from "../lib/localLearning.ts";
import { masteryPercent, recordAnswer, scheduleCard } from "../lib/mastery.ts";

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

test("creates quiz prompts with one defensible answer",()=>{
  const source="Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight in chloroplasts. ATP stores energy for the Calvin cycle. The Calvin cycle uses carbon dioxide to build glucose. Water splitting releases oxygen.";
  const result=generateLocalLearningPackage(source,"Photosynthesis");
  for(const question of result.quiz){
    const correct=question.options[question.answer].toLowerCase();
    const quoted=question.prompt.match(/“([^”]+)”/)?.[1]?.toLowerCase()||"";
    assert.ok(!question.prompt.toLowerCase().includes(correct),`prompt leaked correct answer: ${correct}`);
    question.options.forEach((option,index)=>{
      if(index!==question.answer)assert.ok(!quoted.includes(option.toLowerCase()),`quoted statement contains distractor: ${option}`);
    });
  }
});

test("schedules successful cards farther apart and failed cards immediately",()=>{
  const now=new Date("2026-07-18T00:00:00.000Z");
  const first=scheduleCard(undefined,"known",now);
  const second=scheduleCard(first,"known",now);
  const missed=scheduleCard(second,"again",now);
  assert.equal(first.intervalDays,1);
  assert.equal(second.intervalDays,3);
  assert.equal(missed.intervalDays,0);
  assert.equal(missed.dueAt,now.toISOString());
});

test("records concept-level mastery without losing other sections",()=>{
  let state=recordAnswer({},"section-1",true);
  state=recordAnswer(state,"section-1",false);
  state=recordAnswer(state,"section-2",true);
  assert.deepEqual(state["section-1"],{correct:1,attempts:2});
  assert.equal(masteryPercent(state,["section-1","section-2"]),75);
});
