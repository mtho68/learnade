import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource=readFileSync(new URL("../app/LearnadeApp.tsx",import.meta.url),"utf8");

test("guided tour covers Learnade's core learning path and can be skipped or replayed",()=>{
  assert.match(appSource,/const tourSteps = \[/);
  assert.match(appSource,/MY STUDY PLAN|My Study Plan/);
  assert.match(appSource,/Accessible Reader/);
  assert.match(appSource,/Flashcards, quizzes, and mock exams/);
  assert.match(appSource,/Skip tour/);
  assert.match(appSource,/Take the tour/);
  assert.match(appSource,/learnade-tour-complete/);
  assert.match(appSource,/aria-modal="true"/);
});
