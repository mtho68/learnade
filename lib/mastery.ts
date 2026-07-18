export type CardReview = {
  attempts: number;
  streak: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt: string;
};

export type SectionMastery = Record<string, { correct: number; attempts: number }>;

const DAY = 24 * 60 * 60 * 1000;
const INTERVALS = [1, 3, 7, 14, 30, 60];

export function scheduleCard(previous: CardReview | undefined, result: "again" | "known", now = new Date()): CardReview {
  const attempts = (previous?.attempts || 0) + 1;
  if (result === "again") {
    return { attempts, streak: 0, intervalDays: 0, dueAt: now.toISOString(), lastReviewedAt: now.toISOString() };
  }
  const streak = Math.min((previous?.streak || 0) + 1, INTERVALS.length);
  const intervalDays = INTERVALS[streak - 1];
  return { attempts, streak, intervalDays, dueAt: new Date(now.getTime() + intervalDays * DAY).toISOString(), lastReviewedAt: now.toISOString() };
}

export function recordAnswer(current: SectionMastery, sectionId: string, correct: boolean): SectionMastery {
  const before = current[sectionId] || { correct: 0, attempts: 0 };
  return { ...current, [sectionId]: { correct: before.correct + (correct ? 1 : 0), attempts: before.attempts + 1 } };
}

export function masteryPercent(records: SectionMastery, sectionIds: string[]): number {
  if (!sectionIds.length) return 0;
  const total = sectionIds.reduce((sum, id) => {
    const record = records[id];
    return sum + (record?.attempts ? record.correct / record.attempts : 0);
  }, 0);
  return Math.round((total / sectionIds.length) * 100);
}
