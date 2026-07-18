import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardSnapshot } from "../lib/courseDashboard.ts";
import { createSampleCourse, SAMPLE_COURSE_ID } from "../lib/sampleCourse.ts";

test("sample course demonstrates three grounded material types", () => {
  const course=createSampleCourse(new Date("2026-07-17T00:00:00.000Z"));
  assert.equal(course.id,SAMPLE_COURSE_ID);
  assert.deepEqual(new Set(course.materials.map(item=>item.kind)),new Set(["upload","lecture","pasted"]));
  assert.ok(course.package.flashcards.length>=10);
  assert.ok(course.package.quiz.length>=10);
  const sections=new Set(course.package.sections.map(section=>section.id));
  assert.ok(course.package.quiz.every(question=>sections.has(question.sourceSection)));
  assert.ok(!course.package.keyTerms.some(term=>term.term.toLowerCase()==="without"));
  course.materials.forEach(material=>assert.equal(new Set(material.package.quiz.map(question=>question.explanation.toLowerCase())).size,material.package.quiz.length));
});

test("dashboard calculates progress, due work, weak concepts, and a next action", () => {
  const now=new Date("2026-07-17T00:00:00.000Z");
  const course=createSampleCourse(now);const sections=course.package.sections;const cards=course.package.flashcards;
  const mastery={ [sections[0].id]:{correct:3,attempts:5},[sections[1].id]:{correct:4,attempts:5} };
  const reviews={ [cards[0].id]:{attempts:2,streak:1,intervalDays:3,dueAt:"2026-07-20T00:00:00.000Z",lastReviewedAt:"2026-07-16T00:00:00.000Z"} };
  const snapshot=buildDashboardSnapshot(course.package,mastery,reviews,{score:3,total:5,date:"2026-07-15T00:00:00.000Z"},{score:7,total:10,date:"2026-07-16T00:00:00.000Z"},now);
  assert.ok(snapshot.mastery>0&&snapshot.mastery<100);
  assert.equal(snapshot.cardsReady,course.package.flashcards.length-1);
  assert.ok(snapshot.weakSections.length>0);
  assert.equal(snapshot.recentAttempt?.kind,"exam");
  assert.equal(snapshot.recommendation.mode,"cards");
});

test("a new course recommends the diagnostic", () => {
  const course=createSampleCourse(new Date("2026-07-17T00:00:00.000Z"));
  const snapshot=buildDashboardSnapshot(course.package,{}, {}, null, null);
  assert.equal(snapshot.recommendation.mode,"plan");
});
