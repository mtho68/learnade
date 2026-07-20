import type { LearningQuiz, LearningSection } from "./localLearning.ts";
import { combineCourseMaterials, type CourseMaterial } from "./courseLibrary.ts";

export type MockExamQuestion = LearningQuiz & {
  materialId: string;
  materialTitle: string;
};

export type MockExam = {
  questions: MockExamQuestion[];
  sections: LearningSection[];
  selectedMaterialIds: string[];
};

function interleave<T>(groups: T[][]) {
  const result: T[] = [];
  const longest = Math.max(0, ...groups.map(group => group.length));
  for (let index = 0; index < longest; index += 1) {
    groups.forEach(group => { if (group[index]) result.push(group[index]); });
  }
  return result;
}

function shuffled<T>(values:T[],seed:number){const copy=[...values];let value=seed||1;for(let index=copy.length-1;index>0;index-=1){value=(value*1664525+1013904223)>>>0;const swap=value%(index+1);[copy[index],copy[swap]]=[copy[swap],copy[index]]}return copy;}

export function buildMockExam(materials: CourseMaterial[], selectedMaterialIds: string[], requestedCount: number, courseTitle: string, previousQuestionIds:string[]=[], seed=1): MockExam {
  const selected = materials.filter(material => selectedMaterialIds.includes(material.id));
  const groups = selected.map(material => combineCourseMaterials([material], courseTitle).quiz.map(question => ({
    ...question,
    id: `exam:${material.id}:${question.id}`,
    materialId: material.id,
    materialTitle: material.title,
  })));
  const seenStatements = new Set<string>();
  const unique = interleave(groups).filter(question => {
    const statement = question.explanation.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenStatements.has(statement)) return false;
    seenStatements.add(statement);
    return true;
  });
  const unseen=unique.filter(question=>!previousQuestionIds.includes(question.id));
  const ordered=(previousQuestionIds.length?[...shuffled(unseen,seed),...shuffled(unique.filter(question=>previousQuestionIds.includes(question.id)),seed+17)]:unique).slice(0,Math.max(0,requestedCount));
  const questions=ordered.map((question,index)=>{const order=shuffled(question.options.map((_option,optionIndex)=>optionIndex),seed+index+31);return {...question,options:order.map(optionIndex=>question.options[optionIndex]),answer:order.indexOf(question.answer)};});
  return {
    questions,
    sections: combineCourseMaterials(selected, courseTitle).sections,
    selectedMaterialIds: selected.map(material => material.id),
  };
}

export function gradeMockExam(questions: MockExamQuestion[], answers: Array<number | null>) {
  const correct = questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0);
  const unanswered = questions.reduce((total, _question, index) => total + (answers[index] === null || answers[index] === undefined ? 1 : 0), 0);
  const missed = questions.map((_question, index) => index).filter(index => answers[index] !== questions[index].answer);
  return { correct, unanswered, missed, total: questions.length };
}
