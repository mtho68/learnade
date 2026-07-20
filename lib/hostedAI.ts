import { groundedLearningPackage, type AIStudyDraft } from "./aiLearning";
import type { LearningPackage } from "./localLearning";

export async function generateWithLearnadeAI(source: string, title: string, onProgress: (message: string) => void): Promise<LearningPackage> {
  onProgress("Learnade AI is building source-grounded study materials with GPT-5.6 Terra…");
  const response = await fetch("/api/learnade-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, title }),
  });
  const body = await response.json().catch(() => ({})) as { error?: string; package?: AIStudyDraft };
  if (!response.ok || !body.package) throw new Error(body.error || "Learnade AI could not generate study materials.");
  onProgress("GPT-5.6 Terra finished. Grounding every item in the source…");
  return groundedLearningPackage(source, title, body.package);
}
