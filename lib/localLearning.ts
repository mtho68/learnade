export type LearningSection = { id: string; title: string; text: string; sentences: string[] };
export type LearningCard = { id: string; front: string; back: string; sourceSection: string };
export type LearningQuiz = { id: string; prompt: string; options: string[]; answer: number; explanation: string; sourceSection: string };
export type LearningPackage = {
  title: string;
  overview: string;
  objectives: string[];
  keyTerms: Array<{ term: string; definition: string; sourceSection: string }>;
  sections: LearningSection[];
  flashcards: LearningCard[];
  quiz: LearningQuiz[];
  narration: string;
};

const STOP = new Set("about after again against also among because been before being between both could does doing down during each from further have having here into itself just more most other over same should some such than that their them then there these they this those through under very what when where which while will with would your notes lecture chapter section page slide using used uses into onto only much many were was are has had its our out how why who can may might must and but for not you the she him her his ours theirs".split(" "));
const sentences = (text: string) => text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const short = (value: string, length = 150) => value.length <= length ? value : `${value.slice(0, length).replace(/\s+\S*$/, "")}…`;
const heading = (sentence: string, index: number) => {
  const words = sentence.replace(/[^\w\s-]/g, "").split(/\s+/).filter((word) => word.length > 3 && !STOP.has(word.toLowerCase())).slice(0, 5);
  return words.length ? words.join(" ").replace(/^./, (c) => c.toUpperCase()) : `Key concept ${index + 1}`;
};

export function generateLocalLearningPackage(text: string, title: string): LearningPackage {
  const all = sentences(text);
  const usable = all.length ? all : [text.trim()];
  const chunkSize = Math.max(2, Math.ceil(usable.length / Math.min(5, Math.max(1, Math.ceil(usable.length / 3)))));
  const sections: LearningSection[] = [];
  for (let i = 0; i < usable.length; i += chunkSize) {
    const part = usable.slice(i, i + chunkSize);
    sections.push({ id:`section-${sections.length + 1}`, title:heading(part[0], sections.length), text:part.join(" "), sentences:part });
  }

  const counts = new Map<string, number>();
  const display = new Map<string, string>();
  text.match(/[A-Za-z][A-Za-z-]{3,}/g)?.forEach((word) => {
    const key = word.toLowerCase();
    if (STOP.has(key)) return;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!display.has(key)) display.set(key, word);
  });
  const ranked = [...counts.entries()].sort((a,b) => b[1]-a[1] || b[0].length-a[0].length).slice(0, Math.min(10, Math.max(5, sections.length * 2)));
  const keyTerms = ranked.map(([key]) => {
    const source = sections.find((section) => section.text.toLowerCase().includes(key)) || sections[0];
    const sentence = source.sentences.find((item) => item.toLowerCase().includes(key)) || source.text;
    return { term:display.get(key) || key, definition:short(sentence, 210), sourceSection:source.id };
  });
  const flashcards = keyTerms.map((item, index) => ({ id:`card-${index+1}`, front:`What does the source explain about “${item.term}”?`, back:item.definition, sourceSection:item.sourceSection }));
  const quiz = keyTerms.slice(0, 5).map((item, index) => {
    const distractors = keyTerms.filter((other) => other.term !== item.term).slice(index, index + 3).map((other) => other.term);
    while (distractors.length < 3) distractors.push(["A related example", "A separate process", "An unsupported claim"][distractors.length]);
    const options = [item.term, ...distractors].slice(0,4);
    const rotate = index % options.length;
    const ordered = [...options.slice(rotate), ...options.slice(0,rotate)];
    return { id:`quiz-${index+1}`, prompt:`Which key term is best supported by this source statement?\n“${short(item.definition, 140)}”`, options:ordered, answer:ordered.indexOf(item.term), explanation:item.definition, sourceSection:item.sourceSection };
  });
  return {
    title,
    overview:short(usable.slice(0,3).join(" "), 420),
    objectives:sections.slice(0,4).map((section) => `Explain ${section.title.toLowerCase()} using evidence from the source.`),
    keyTerms, sections, flashcards, quiz,
    narration:usable.join(" "),
  };
}
