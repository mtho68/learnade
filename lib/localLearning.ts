export type LearningSection = { id: string; title: string; text: string; sentences: string[] };
export type LearningCard = { id: string; front: string; back: string; sourceSection: string };
export type LearningQuiz = { id: string; prompt: string; options: string[]; answer: number; explanation: string; sourceSection: string; type?: "multiple-choice" | "fill-blank" | "true-false" };
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

type Candidate = { term: string; normalized: string; definition: string; sourceSection: string; score: number; order: number };

const STOP = new Set("about after again against also alongside although among another because been before being between both could despite does doing down during each from further furthermore have having here however including instead into itself just moreover more most nevertheless only onto other otherwise over same should some such than that their them then there therefore these they this those throughout through toward towards under unless very was were what when where whereas whether which while will with within without would your notes lecture chapter section page slide using used uses much many are has had its our out how why who can may might must and but for not you the she him her his ours theirs called calleds it its this these that those they them he she response signal outcome result action role behavior state change correction body course source material information knowledge idea concept system process function structure method example layer means thing things study learning explain explained explains explains".split(" "));
const GENERIC = new Set("it its this these that those they them he she response signal outcome result action role behavior state change correction body course source material information knowledge idea concept system process function structure method example layer thing things study learning student students".split(" "));
const sentences = (text: string) => text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const short = (value: string, length = 170) => value.length <= length ? value : `${value.slice(0, length).replace(/\s+\S*$/, "")}…`;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cleanTerm = (value: string) => value.replace(/^(?:the|a|an|many|most|each)\s+/i, "").replace(/[^A-Za-z0-9 -]/g, "").replace(/\s+/g, " ").trim();
const normalize = (value: string) => cleanTerm(value).toLowerCase().replace(/\b(s|es)$/, "");
const validTerm = (term: string) => {
  const words = cleanTerm(term).split(" ").filter(Boolean);
  if (!words.length || words.length > 3 || cleanTerm(term).length < 3) return false;
  const key = normalize(term);
  return Boolean(key) && !GENERIC.has(key) && !words.every(word => STOP.has(word.toLowerCase()));
};
const heading = (sentence: string, index: number) => {
  const words = sentence.replace(/[^\w\s-]/g, "").split(/\s+/).filter((word) => word.length > 3 && !STOP.has(word.toLowerCase())).slice(0, 5);
  return words.length ? words.join(" ").replace(/^./, (c) => c.toUpperCase()) : `Key concept ${index + 1}`;
};

function collectCandidates(sections: LearningSection[]) {
  const candidates = new Map<string, Candidate>();
  let order = 0;
  const add = (term: string, definition: string, sourceSection: string, score: number) => {
    const cleaned = cleanTerm(term); const normalized = normalize(cleaned);
    if (!validTerm(cleaned) || /^(it|this|these|that|those|they|he|she)\b/i.test(definition) || !definition.toLowerCase().includes(normalized)) return;
    const current = candidates.get(normalized);
    const next = { term: cleaned, normalized, definition: short(definition, 220), sourceSection, score, order: order += 1 };
    if (!current || next.score > current.score || (next.score === current.score && next.order < current.order)) candidates.set(normalized, next);
  };
  sections.forEach(section => section.sentences.forEach(sentence => {
    const subject = sentence.match(/^(?:the |a |an )?([A-Za-z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*){0,2})\s+(?:is|are|holds|stores|strengthens|creates|produces|refers to|means|describes|includes|contains|controls|regulates|forms|consists of|allows|enables|occurs|absorbs|releases|converts|uses|builds|improves|helps|chooses)/i);
    if (subject) add(subject[1], sentence, section.id, 8);
    const named = /\b(?:the\s+)?([A-Za-z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*){0,2}\s+(?:system|sheath|membrane|cycle|process|potential|response|practice|memory|network|pathway|center))\b/gi;
    for (const match of sentence.matchAll(named)) add(match[1], sentence, section.id, 7);
  }));
  const frequencies = new Map<string, number>();
  const displays = new Map<string, string>();
  sections.forEach(section => section.sentences.forEach(sentence => {
    sentence.match(/[A-Za-z][A-Za-z-]{3,}/g)?.forEach(word => {
      const key = normalize(word); if (!key || STOP.has(key) || GENERIC.has(key)) return;
      frequencies.set(key, (frequencies.get(key) || 0) + 1); if (!displays.has(key)) displays.set(key, word);
    });
  }));
  [...frequencies.entries()].sort((a,b)=>b[1]-a[1] || b[0].length-a[0].length).forEach(([key,count]) => {
    const section = sections.find(item => item.text.toLowerCase().includes(key));
    const sentence = section?.sentences.find(item => item.toLowerCase().includes(key));
    if (section && sentence) add(displays.get(key) || key, sentence, section.id, Math.min(5, 2 + count));
  });
  return [...candidates.values()].sort((a,b)=>b.score-a.score || a.order-b.order);
}

function rotate<T>(values: T[], amount: number) { const shift = values.length ? amount % values.length : 0; return [...values.slice(shift), ...values.slice(0, shift)]; }

export function generateLocalLearningPackage(text: string, title: string): LearningPackage {
  const all = sentences(text);
  const usable = all.length ? all : [text.trim() || "Add source material to begin."];
  const chunkSize = Math.max(2, Math.ceil(usable.length / Math.min(5, Math.max(1, Math.ceil(usable.length / 3)))));
  const sections: LearningSection[] = [];
  for (let i = 0; i < usable.length; i += chunkSize) {
    const part = usable.slice(i, i + chunkSize);
    sections.push({ id:`section-${sections.length + 1}`, title:heading(part[0], sections.length), text:part.join(" "), sentences:part });
  }
  const candidates = collectCandidates(sections);
  const uniqueCandidates = candidates.filter(candidate => !candidates.some(other => other !== candidate && other.definition === candidate.definition && (other.score > candidate.score || (other.score === candidate.score && other.order < candidate.order))));
  const selected = uniqueCandidates.slice(0, Math.min(14, Math.max(6, sections.length * 3)));
  const keyTerms = selected.map(item => ({ term:item.term, definition:item.definition, sourceSection:item.sourceSection }));
  const flashcards = keyTerms.map((item, index) => ({ id:`card-${index+1}`, front:item.term, back:item.definition, sourceSection:item.sourceSection }));
  const quiz: LearningQuiz[] = [];
  const usedDefinitions = new Set<string>();
  selected.forEach((item, index) => {
    const statementKey=item.definition.toLowerCase().replace(/\s+/g," ").trim();
    if(usedDefinitions.has(statementKey))return;
    usedDefinitions.add(statementKey);
    const peers = selected.filter(other => other.normalized !== item.normalized && other.definition !== item.definition);
    const answerPattern = new RegExp(`\\b${escapeRegex(item.term)}(?:s|es)?\\b`, "i");
    const masked = item.definition.replace(answerPattern, "___");
    const clue = item.definition.replace(answerPattern, "this concept");
    const promptSource=(index % 2 === 1 && masked !== item.definition)?masked:clue;
    const safePeers=peers.filter(other=>!promptSource.toLowerCase().includes(other.normalized));
    if (safePeers.length < 3) return;
    const distractorTerms = rotate(safePeers.map(other => other.term), index).slice(0,3);
    if (index % 3 === 2 && answerPattern.test(item.definition)) {
      const falseStatement=item.definition.replace(answerPattern,distractorTerms[0]);
      quiz.push({ id:`quiz-${quiz.length+1}`, type:"true-false", prompt:`True or false?\n“${falseStatement}”`, options:["True","False"], answer:1, explanation:item.definition, sourceSection:item.sourceSection });
    } else if (index % 2 === 1 && masked !== item.definition) {
      const options = rotate([item.term, ...distractorTerms], index);
      quiz.push({ id:`quiz-${quiz.length+1}`, type:"fill-blank", prompt:`Complete this source statement:\n“${masked}”`, options, answer:options.indexOf(item.term), explanation:item.definition, sourceSection:item.sourceSection });
    } else if (clue !== item.definition) {
      const options = rotate([item.term, ...distractorTerms], index);
      quiz.push({ id:`quiz-${quiz.length+1}`, type:"multiple-choice", prompt:`Which term is described here?\n“${clue}”`, options, answer:options.indexOf(item.term), explanation:item.definition, sourceSection:item.sourceSection });
    }
  });
  return {
    title,
    overview:short(usable.slice(0,3).join(" "), 420),
    objectives:sections.slice(0,4).map((section) => `Explain ${section.title.toLowerCase()} using evidence from the source.`),
    keyTerms, sections, flashcards, quiz,
    narration:usable.join(" "),
  };
}