import { generateLocalLearningPackage, type LearningPackage } from "./localLearning.ts";

export type MaterialKind = "upload" | "pasted" | "lecture";
export type CourseMaterial = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  kind: MaterialKind;
  package: LearningPackage;
  preserveIds?: boolean;
  generation?: { mode: "local" | "on-device-ai" | "gpt-5.6-terra"; generatedAt: string };
  audio?: { id: string; mimeType: string; size: number; durationMs: number };
};

export type SavedCourse = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  package: LearningPackage;
  materials: CourseMaterial[];
};

type LegacyCourse = Omit<SavedCourse, "updatedAt" | "materials"> & { updatedAt?: string; materials?: CourseMaterial[] };

const prefixPackage = (material: CourseMaterial) => {
  if (material.preserveIds) return material.package;
  const prefix = `${material.id}:`;
  const sectionId = (id: string) => `${prefix}${id}`;
  return {
    ...material.package,
    sections: material.package.sections.map(section => ({ ...section, id: sectionId(section.id), title: `${material.title} · ${section.title}` })),
    keyTerms: material.package.keyTerms.map(term => ({ ...term, sourceSection: sectionId(term.sourceSection) })),
    flashcards: material.package.flashcards.map(card => ({ ...card, id: `${prefix}${card.id}`, sourceSection: sectionId(card.sourceSection) })),
    quiz: material.package.quiz.map(question => ({ ...question, id: `${prefix}${question.id}`, sourceSection: sectionId(question.sourceSection) })),
  };
};

export function combineCourseMaterials(materials: CourseMaterial[], title: string): LearningPackage {
  if (!materials.length) return generateLocalLearningPackage("Add material to begin building this course.", title);
  const packages = materials.map(prefixPackage);
  return {
    title,
    overview: packages.map(item => item.overview).filter(Boolean).join(" ").slice(0, 900),
    objectives: packages.flatMap(item => item.objectives).slice(0, 12),
    keyTerms: packages.flatMap(item => item.keyTerms).slice(0, 40),
    sections: packages.flatMap(item => item.sections),
    flashcards: packages.flatMap(item => item.flashcards).slice(0, 60),
    quiz: packages.flatMap(item => item.quiz).slice(0, 40),
    narration: packages.map(item => item.narration).join(" "),
  };
}

export function courseSource(materials: CourseMaterial[]) {
  return materials.map(material => `${material.title}\n${material.source}`).join("\n\n");
}

export function normalizeCourse(item: LegacyCourse): SavedCourse {
  const materials = Array.isArray(item.materials) && item.materials.length ? item.materials : [{
    id: `legacy-${item.id}`,
    title: item.title,
    source: item.source,
    createdAt: item.createdAt,
    kind: "pasted" as const,
    package: item.package,
    preserveIds: true,
  }];
  return {
    ...item,
    updatedAt: item.updatedAt || item.createdAt,
    materials,
    source: courseSource(materials),
    package: combineCourseMaterials(materials, item.title),
  };
}

export function addCourseMaterial(course: SavedCourse, material: CourseMaterial, updatedAt = new Date().toISOString()): SavedCourse {
  const materials = [...course.materials, material];
  return { ...course, materials, updatedAt, source: courseSource(materials), package: combineCourseMaterials(materials, course.title) };
}

export function removeCourseMaterial(course: SavedCourse, materialId: string, updatedAt = new Date().toISOString()): SavedCourse {
  const materials = course.materials.filter(material => material.id !== materialId);
  return { ...course, materials, updatedAt, source: courseSource(materials), package: combineCourseMaterials(materials, course.title) };
}

export function renameCourse(course: SavedCourse, title: string, updatedAt = new Date().toISOString()): SavedCourse {
  const clean = title.trim() || course.title;
  return { ...course, title: clean, updatedAt, package: combineCourseMaterials(course.materials, clean) };
}
