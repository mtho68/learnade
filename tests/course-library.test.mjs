import assert from "node:assert/strict";
import test from "node:test";
import { addCourseMaterial, combineCourseMaterials, normalizeCourse, removeCourseMaterial, renameCourse } from "../lib/courseLibrary.ts";
import { generateLocalLearningPackage } from "../lib/localLearning.ts";

const sourceA="Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight. Plants use carbon dioxide to build glucose. Water splitting releases oxygen.";
const sourceB="Cellular respiration releases energy from glucose. Glycolysis occurs in the cytoplasm. The citric acid cycle produces electron carriers. ATP stores usable energy.";

test("migrates a legacy Learnade without changing progress-relevant ids",()=>{
  const pkg=generateLocalLearningPackage(sourceA,"Biology");
  const legacy={id:"course-1",title:"Biology",source:sourceA,createdAt:"2026-01-01T00:00:00.000Z",package:pkg};
  const course=normalizeCourse(legacy);
  assert.equal(course.materials.length,1);
  assert.equal(course.package.sections[0].id,pkg.sections[0].id);
  assert.equal(course.package.flashcards[0].id,pkg.flashcards[0].id);
});

test("combines multiple materials with unique grounded ids",()=>{
  const materialA={id:"week-1",title:"Week 1",source:sourceA,createdAt:"2026-01-01T00:00:00.000Z",kind:"pasted",package:generateLocalLearningPackage(sourceA,"Week 1")};
  const materialB={id:"week-2",title:"Week 2",source:sourceB,createdAt:"2026-01-02T00:00:00.000Z",kind:"lecture",package:generateLocalLearningPackage(sourceB,"Week 2")};
  const pkg=combineCourseMaterials([materialA,materialB],"Biology");
  const sections=new Set(pkg.sections.map(section=>section.id));
  assert.equal(sections.size,pkg.sections.length);
  assert.ok(pkg.flashcards.every(card=>sections.has(card.sourceSection)));
  assert.ok(pkg.quiz.every(question=>sections.has(question.sourceSection)));
  assert.ok(pkg.keyTerms.every(term=>sections.has(term.sourceSection)));
});

test("adding, renaming, and removing material keeps the course stable",()=>{
  const base=normalizeCourse({id:"course-1",title:"Biology",source:sourceA,createdAt:"2026-01-01T00:00:00.000Z",package:generateLocalLearningPackage(sourceA,"Biology")});
  const material={id:"week-2",title:"Week 2",source:sourceB,createdAt:"2026-01-02T00:00:00.000Z",kind:"lecture",package:generateLocalLearningPackage(sourceB,"Week 2")};
  const added=addCourseMaterial(base,material,"2026-01-02T00:00:00.000Z");
  const renamed=renameCourse(added,"BIO 101","2026-01-03T00:00:00.000Z");
  const removed=removeCourseMaterial(renamed,"week-2","2026-01-04T00:00:00.000Z");
  assert.equal(renamed.id,base.id);
  assert.equal(renamed.materials[1].id,"week-2");
  assert.equal(removed.materials.length,1);
  assert.equal(removed.package.sections[0].id,base.package.sections[0].id);
});
