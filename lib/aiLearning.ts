import { generateLocalLearningPackage, type LearningPackage } from "./localLearning";

export type AIStudyDraft = {
  overview: string;
  objectives: string[];
  keyTerms: Array<{ term: string; definition: string }>;
  flashcards: Array<{ front: string; back: string }>;
  quiz: Array<{ prompt: string; options: string[]; answer: number; explanation: string }>;
  narration: string;
};

const blockedTerm = /^(understanding|these factors|factors|this|that|it|response|signal|result|process|system)$/i;
const weakPhrase = /\b(second|third|major factor|these factors)\b/i;
const usefulTerm = (value: string) => {
  const clean = value.trim();
  return clean.length >= 3 && clean.length <= 48 && !blockedTerm.test(clean) && !weakPhrase.test(clean);
};
const usefulDefinition = (value: string) => value.trim().length >= 12 && !weakPhrase.test(value);

export function groundedLearningPackage(source: string, title: string, draft: AIStudyDraft): LearningPackage {
  const base = generateLocalLearningPackage(source, title);
  const sourceSection = (...values: string[]) => {
    const tokens = new Set(values.join(" ").toLowerCase().match(/[a-z][a-z-]{4,}/g) || []);
    const ranked = base.sections.map(section => ({ section, score: [...tokens].filter(token => section.text.toLowerCase().includes(token)).length })).sort((a, b) => b.score - a.score);
    return ranked[0]?.score >= 2 ? ranked[0].section : undefined;
  };
  const terms = draft.keyTerms.filter(item => usefulTerm(item.term) && usefulDefinition(item.definition)).slice(0, 10);
  const cards = draft.flashcards.filter(item => usefulTerm(item.front) && usefulDefinition(item.back)).slice(0, 12);
  const quiz = draft.quiz.filter(item => item.prompt.trim() && item.options.length === 4 && item.options.every(option => option.trim()) && Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4).slice(0, 12);
  const objectives = draft.objectives.filter(item => item.trim()).slice(0, 6);
  return {
    ...base,
    overview: draft.overview.trim() || base.overview,
    objectives: objectives.length ? objectives : base.objectives,
    keyTerms: terms.length ? terms.map((item, index) => {
      const section = sourceSection(item.term, item.definition);
      return section ? { term: item.term.trim(), definition: item.definition.trim(), sourceSection: section.id } : base.keyTerms[index % base.keyTerms.length];
    }) : base.keyTerms,
    flashcards: cards.length ? cards.map((item, index) => {
      const section = sourceSection(item.front, item.back);
      return section ? { id: `ai-card-${index + 1}`, front: item.front.trim(), back: item.back.trim(), sourceSection: section.id } : base.flashcards[index % base.flashcards.length];
    }) : base.flashcards,
    quiz: quiz.length ? quiz.map((item, index) => {
      const section = sourceSection(item.prompt, item.explanation);
      return section ? { id: `ai-quiz-${index + 1}`, prompt: item.prompt.trim(), options: item.options.map(option => option.trim()), answer: item.answer, explanation: item.explanation.trim() || "Review the matching source section.", sourceSection: section.id } : base.quiz[index % base.quiz.length];
    }) : base.quiz,
    narration: draft.narration.trim() || base.narration,
  };
}
