import { combineCourseMaterials, courseSource, type CourseMaterial, type SavedCourse } from "./courseLibrary.ts";
import { generateLocalLearningPackage } from "./localLearning.ts";

export const SAMPLE_COURSE_ID = "learnade-sample-learning-science";

const samples = [
  {
    id: "sample-memory",
    title: "Week 1 · Memory and retrieval",
    kind: "upload" as const,
    source: "Working memory holds a limited amount of information for a short time. Long-term memory stores knowledge in connected networks called schemas. Retrieval practice strengthens access to stored knowledge by requiring the learner to recall an idea without looking at the answer. Re-reading can create familiarity without reliable recall. Practice questions and flashcards are most useful when they require active retrieval. Feedback after retrieval corrects errors before they become stable misconceptions. Spacing retrieval across several days produces stronger long-term retention than completing the same practice in one sitting."
  },
  {
    id: "sample-attention",
    title: "Lecture 2 · Attention and cognitive load",
    kind: "lecture" as const,
    source: "Today we discussed attention as a limited resource rather than a measure of motivation. Cognitive load increases when a task contains too many unfamiliar elements at once. Chunking groups related information so working memory handles fewer separate items. Clear headings and short steps reduce unnecessary load while preserving the challenge of the material. Learners with ADHD may benefit from visible timers, immediate next actions, and brief movement breaks. Multitasking usually requires rapid task switching, which adds a switching cost and increases errors. A focused environment should remove irrelevant demands without removing meaningful choices."
  },
  {
    id: "sample-spacing",
    title: "Study notes · Spacing and interleaving",
    kind: "pasted" as const,
    source: "Spaced practice separates study sessions over time so some forgetting occurs before the next review. That effortful recall helps rebuild a stronger memory. Interleaving mixes related problem types instead of practicing only one type in a block. Interleaving feels harder because the learner must identify which strategy applies. Desirable difficulty is a challenge that slows practice but improves later retention and transfer. A useful schedule combines short retrieval sessions, corrective feedback, and gradually increasing intervals. Cramming may improve immediate performance but produces weaker retention after the test."
  }
];

export function createSampleCourse(now = new Date()): SavedCourse {
  const createdAt = now.toISOString();
  const materials: CourseMaterial[] = samples.map(sample => ({ ...sample, createdAt, package: generateLocalLearningPackage(sample.source, sample.title) }));
  const title = "Sample Course · Learning Science";
  return { id: SAMPLE_COURSE_ID, title, createdAt, updatedAt: createdAt, materials, source: courseSource(materials), package: combineCourseMaterials(materials, title) };
}
