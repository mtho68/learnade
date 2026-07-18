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

export function buildMockExam(materials: CourseMaterial[], selectedMaterialIds: string[], requestedCount: number, courseTitle: string): MockExam {
  const selected = materials.filter(material => selectedMaterialIds.includes(material.id));
  const groups = selected.map(material => combineCourseMaterials([material], courseTitle).quiz.map(question => ({
    ...question,
    id: `exam:${material.id}:${question.id}`,
    materialId: material.id,
    materialTitle: material.title,
  })));
  const questions = interleave(groups).slice(0, Math.max(0, requestedCount));
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
