import { masteryPercent, type CardReview, type SectionMastery } from "./mastery.ts";
import type { LearningPackage } from "./localLearning.ts";

export type AttemptSummary = { score: number; total: number; date: string; kind?: "quiz" | "exam" };
export type DashboardSnapshot = {
  mastery: number;
  attemptedSections: number;
  cardsReady: number;
  totalCards: number;
  weakSections: Array<{ id: string; title: string; percent: number; attempts: number }>;
  recentAttempt: AttemptSummary | null;
  recommendation: { mode: "plan" | "cards" | "reader" | "quiz" | "exam"; label: string; reason: string; sectionId?: string };
};

export function buildDashboardSnapshot(learningPackage: LearningPackage, mastery: SectionMastery, reviews: Record<string, CardReview>, quizAttempt: AttemptSummary | null, examAttempt: AttemptSummary | null, now = new Date()): DashboardSnapshot {
  const sectionIds = learningPackage.sections.map(section => section.id);
  const attemptedSections = sectionIds.filter(id => (mastery[id]?.attempts || 0) > 0).length;
  const cardsReady = learningPackage.flashcards.filter(card => {
    const dueAt = reviews[card.id]?.dueAt;
    return !dueAt || !Number.isFinite(Date.parse(dueAt)) || Date.parse(dueAt) <= now.getTime();
  }).length;
  const weakSections = learningPackage.sections
    .filter(section => (mastery[section.id]?.attempts || 0) > 0)
    .map(section => {
      const record = mastery[section.id];
      return { id: section.id, title: section.title, attempts: record.attempts, percent: Math.round((record.correct / record.attempts) * 100) };
    })
    .sort((a, b) => a.percent - b.percent || b.attempts - a.attempts)
    .slice(0, 3);
  const validAttempt = (attempt: AttemptSummary | null) => Boolean(attempt && Number.isInteger(attempt.score) && Number.isInteger(attempt.total) && attempt.total > 0 && attempt.score >= 0 && attempt.score <= attempt.total && Number.isFinite(Date.parse(attempt.date)));
  const attempts = [validAttempt(quizAttempt) && { ...quizAttempt!, kind: "quiz" as const }, validAttempt(examAttempt) && { ...examAttempt!, kind: "exam" as const }].filter(Boolean) as AttemptSummary[];
  const recentAttempt = attempts.sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  const weakest = weakSections[0];
  let recommendation: DashboardSnapshot["recommendation"];
  if (!attemptedSections) recommendation = { mode: "plan", label: "Take the 60-second diagnostic", reason: "Learnade needs a few answers to identify your strongest starting point." };
  else if (cardsReady > 0) recommendation = { mode: "cards", label: `Practice ${cardsReady} ready card${cardsReady === 1 ? "" : "s"}`, reason: "A short retrieval session will strengthen new and scheduled material." };
  else if (weakest && weakest.percent < 75) recommendation = { mode: "reader", label: `Review ${weakest.title}`, reason: `This is currently your weakest measured concept at ${weakest.percent}% mastery.`, sectionId: weakest.id };
  else if (!recentAttempt) recommendation = { mode: "quiz", label: "Check your understanding", reason: "A short source-grounded quiz will update your mastery map." };
  else recommendation = { mode: "exam", label: "Build a mock exam", reason: "You are caught up on review and ready for a broader knowledge check." };
  return { mastery: masteryPercent(mastery, sectionIds), attemptedSections, cardsReady, totalCards: learningPackage.flashcards.length, weakSections, recentAttempt, recommendation };
}
