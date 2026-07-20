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
  assert.ok(result.quiz.every(question=>(question.type==="true-false"?question.options.length===2:question.options.length===4)&&question.answer>=0&&question.answer<question.options.length&&sectionIds.has(question.sourceSection)));
});

test("creates quiz prompts with one defensible answer",()=>{
  const source="Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight in chloroplasts. ATP stores energy for the Calvin cycle. The Calvin cycle uses carbon dioxide to build glucose. Water splitting releases oxygen.";
  const result=generateLocalLearningPackage(source,"Photosynthesis");
  for(const question of result.quiz){
    const correct=question.options[question.answer].toLowerCase();
    const quoted=question.prompt.match(/“([^”]+)”/)?.[1]?.toLowerCase()||"";
    if(question.type!=="true-false"){
      assert.ok(!question.prompt.toLowerCase().includes(correct),`prompt leaked correct answer: ${correct}`);
      question.options.forEach((option,index)=>{
        if(index!==question.answer)assert.ok(!quoted.includes(option.toLowerCase()),`quoted statement contains distractor: ${option}`);
      });
    } else {
      assert.ok(["true","false"].includes(correct));
      assert.ok(quoted.length>10,"true/false prompt needs a concrete statement");
    }
  }
});

test("filters function words and creates no duplicate questions from one source sentence",()=>{
  const source="Retrieval practice strengthens access to memory without looking at the answer. Retrieval practice improves recall over time. Students practice retrieval within short sessions. Feedback helps students correct memory errors. Spacing strengthens durable learning. Interleaving helps learners choose strategies.";
  const result=generateLocalLearningPackage(source,"Learning science");
  const terms=result.keyTerms.map(item=>item.term.toLowerCase());
  assert.ok(!terms.includes("without"));
  assert.ok(!terms.includes("within"));
  const sourceStatements=result.quiz.map(question=>question.explanation.toLowerCase());
  assert.ok(result.quiz.length>=5,"generator should provide enough distinct questions for a mock exam");
  assert.equal(new Set(sourceStatements).size,sourceStatements.length,"quiz repeated a source sentence");
  assert.deepEqual(result.quiz.map((question,index)=>question.id),result.quiz.map((_question,index)=>`quiz-${index+1}`));
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
test("rejects pronouns and filler verbs as study terms",()=>{
  const source="The cardiovascular system consists of the heart, blood vessels, and blood. It consists of connected organs. The two upper chambers are called atria, and the two lower chambers are called ventricles. Arteries carry blood away from the heart. Veins return blood to the heart.";
  const result=generateLocalLearningPackage(source,"Cardiovascular system");
  const terms=result.keyTerms.map(item=>item.term.toLowerCase());
  assert.ok(!terms.includes("it"));
  assert.ok(!terms.includes("called"));
  assert.ok(result.quiz.every(question=>!question.prompt.includes("�It ")));
});
test("prefers the named concept over a vague word in a definition",()=>{
  const source="A control center, often the brain, compares the signal to the set point and decides on a response. A receptor detects a change and sends information to the control center. An effector carries out the correction.";
  const result=generateLocalLearningPackage(source,"Homeostasis");
  const terms=result.keyTerms.map(item=>item.term.toLowerCase());
  assert.ok(terms.includes("control center"));
  assert.ok(!terms.includes("response"));
  assert.ok(!terms.includes("signal"));
});
