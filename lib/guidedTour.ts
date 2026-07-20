export type GuidedTourStep = {
  target: string;
  eyebrow: string;
  title: string;
  text: string;
};

export function availableGuidedTourSteps(
  steps: readonly GuidedTourStep[],
  targetExists: (target: string) => boolean,
) {
  const seenTargets = new Set<string>();
  return steps.filter((step) => {
    if (seenTargets.has(step.target) || !targetExists(step.target)) return false;
    seenTargets.add(step.target);
    return true;
  });
}
