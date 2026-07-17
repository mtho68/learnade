"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource/opendyslexic/400.css";
import { extractDocument } from "../lib/extractDocument";
import { generateLocalLearningPackage, type LearningPackage } from "../lib/localLearning";

type Mode = "home" | "reader" | "speed" | "focus" | "brainrot" | "guide" | "cards" | "quiz";

const sampleText = `Photosynthesis is the process plants use to convert light energy into chemical energy. It occurs primarily in chloroplasts. During the light-dependent reactions, chlorophyll absorbs sunlight and helps produce ATP and NADPH. The Calvin cycle then uses that stored energy to convert carbon dioxide into glucose. Water is split during the light-dependent reactions, releasing oxygen as a byproduct. Temperature, light intensity, and carbon dioxide concentration can all affect the rate of photosynthesis.`;

type SavedLearnade = { id:string; title:string; source:string; createdAt:string; package:LearningPackage };

function PlayIcon() { return <span className="media-icon play-icon" aria-hidden="true" />; }
function PauseIcon() { return <span className="media-icon pause-icon" aria-hidden="true"><i /><i /></span>; }

const modes = [
  { id: "reader", icon: "Aa", title: "Accessible Reader", text: "Tune type, spacing, color, and focus to fit your eyes." },
  { id: "speed", icon: "▶", title: "Speed Reader", text: "Read one perfectly centered word at a time." },
  { id: "brainrot", icon: "✦", title: "Brainrot Mode", text: "Listen and follow captions with a calm visual loop." },
  { id: "focus", icon: "◷", title: "Focus Session", text: "Turn studying into one small, doable step at a time." },
  { id: "guide", icon: "≡", title: "Study Guide", text: "Get the objectives, concepts, and likely test material." },
  { id: "cards", icon: "▱", title: "Flashcards", text: "Practice key ideas and revisit what is not sticking." },
  { id: "quiz", icon: "✓", title: "Practice Quiz", text: "Check understanding with feedback, not judgment." },
] as const;

export default function LearnadeApp() {
  const [mode, setMode] = useState<Mode>("home");
  const [source, setSource] = useState(sampleText);
  const [title, setTitle] = useState("The essentials of photosynthesis");
  const [learningPackage, setLearningPackage] = useState(() => generateLocalLearningPackage(sampleText, "The essentials of photosynthesis"));
  const [library, setLibrary] = useState<SavedLearnade[]>([]);
  const [activeId, setActiveId] = useState("demo");
  const [showUpload, setShowUpload] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const storedLibrary = localStorage.getItem("learnade-library");
    if (storedLibrary) {
      try { const parsed = JSON.parse(storedLibrary) as SavedLearnade[]; setLibrary(parsed); if(parsed[0]) { setSource(parsed[0].source); setTitle(parsed[0].title); setLearningPackage(parsed[0].package); setActiveId(parsed[0].id); } } catch {}
    }
  }, []);

  const saveSource = (value: string, name: string) => {
    const finalTitle = name || "My new Learnade";
    const generated = generateLocalLearningPackage(value, finalTitle);
    const item:SavedLearnade = { id:crypto.randomUUID(), title:finalTitle, source:value, createdAt:new Date().toISOString(), package:generated };
    const next = [item, ...library];
    setSource(value); setTitle(finalTitle); setLearningPackage(generated); setLibrary(next); setActiveId(item.id);
    localStorage.setItem("learnade-library", JSON.stringify(next)); setSaved(true);
  };

  const openItem = (item:SavedLearnade) => { setSource(item.source); setTitle(item.title); setLearningPackage(item.package); setActiveId(item.id); setMode("reader"); };
  const deleteItem = (id:string) => { const next=library.filter(item=>item.id!==id); setLibrary(next); localStorage.setItem("learnade-library",JSON.stringify(next)); };

  if (mode !== "home") {
    return <StudyMode mode={mode} title={title} source={source} learningPackage={learningPackage} learnadeId={activeId} onChangeMode={setMode} onBack={() => setMode("home")} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setMode("home")} aria-label="Learnade home">
          <span className="brand-mark">L</span><span>Learnade</span>
        </button>
        <nav aria-label="Primary navigation">
          <button className="nav-link active" onClick={() => document.getElementById("library")?.scrollIntoView({behavior:"smooth"})}>My learning</button>
          <button className="nav-link" onClick={() => setShowUpload(true)}>New Learnade</button>
        </nav>
        <div className="profile"><span className="save-dot" /> {saved ? "Saved locally" : "Saving…"}<span className="avatar">HT</span></div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">YOUR LEARNING, YOUR WAY</span>
          <h1>Make learning<br/><em>work for your brain.</em></h1>
          <p>Turn notes, readings, and slides into study experiences shaped around the way your brain wants to learn today.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setShowUpload(true)}>＋ Create a Learnade</button>
            <button className="secondary" onClick={() => setMode("focus")}>Continue studying <span>→</span></button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="orbit orbit-one"><span>Focus</span></div>
          <div className="orbit orbit-two"><span>Read</span></div>
          <div className="study-card"><small>TODAY&apos;S SESSION</small><strong>12 min</strong><p>3 small steps</p><div className="mini-progress"><i /></div></div>
        </div>
      </section>

      <section className="continue-card">
        <div className="material-icon">☀</div>
        <div className="material-copy"><span className="eyebrow">CONTINUE LEARNING</span><h2>{title}</h2><p>Biology · 7 learning modes ready</p></div>
        <div className="progress-copy"><strong>38%</strong><span>complete</span></div>
        <div className="progress-track"><i /></div>
        <button className="round-button" onClick={() => setMode("reader")} aria-label="Continue learning">→</button>
      </section>

      <section className="modes-section">
        <div className="section-heading"><div><span className="eyebrow">CHOOSE WHAT WORKS NOW</span><h2>How do you want to learn?</h2></div><p>You can switch modes anytime. No setup, no penalty.</p></div>
        <div className="mode-grid">
          {modes.map((item, index) => (
            <button className={`mode-card mode-${index + 1}`} key={item.id} onClick={() => setMode(item.id)}>
              <span className="mode-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.text}</small></span><b>↗</b>
            </button>
          ))}
        </div>
      </section>

      <section className="library-section" id="library">
        <div className="section-heading"><div><span className="eyebrow">SAVED ON THIS DEVICE</span><h2>My learning library</h2></div><p>Your documents and progress stay in this browser.</p></div>
        {library.length === 0 ? <div className="library-empty"><strong>Your first Learnade will appear here.</strong><p>Upload a document or paste notes to create it.</p><button className="secondary" onClick={()=>setShowUpload(true)}>Create one now</button></div> : <div className="library-grid">{library.map(item=><article key={item.id}><button className="library-open" onClick={()=>openItem(item)}><span className="material-icon">L</span><span><small>{new Date(item.createdAt).toLocaleDateString()}</small><strong>{item.title}</strong><em>{item.package.sections.length} sections · {item.package.flashcards.length} cards</em></span></button><button className="delete-item" onClick={()=>deleteItem(item.id)} aria-label={`Delete ${item.title}`}>×</button></article>)}</div>}
      </section>

      {showUpload && <UploadModal source="" onClose={() => setShowUpload(false)} onCreate={(text, name) => { saveSource(text,name); setShowUpload(false); }} />}
    </main>
  );
}

function UploadModal({ source, onClose, onCreate }: { source: string; onClose: () => void; onCreate: (text: string, title: string) => void }) {
  const [text, setText] = useState(source);
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const selectFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name); setExtracting(true); setError(""); setStatus("Reading your material…");
    try {
      const result = await extractDocument(file);
      setText(result.text); setName((current) => current || result.title);
      setStatus(`${result.kind.toUpperCase()} ready · ${result.text.split(/\s+/).length.toLocaleString()} words extracted`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t read that file."); setStatus("");
    } finally { setExtracting(false); }
  };
  const create = async () => {
    if (text.trim().length < 40) { setError("Add a little more study material before continuing."); return; }
    setStatus("Building your private learning package on this device…");
    await new Promise((resolve)=>setTimeout(resolve,250));
    onCreate(text, name);
  };
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title">
    <div className="modal">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      <span className="eyebrow">NEW LEARNADE</span><h2 id="upload-title">What are we learning?</h2><p>Upload source material or paste your notes. Your work stays on this device.</p>
      <label className="dropzone">
        <input type="file" accept=".pdf,.docx,.pptx,.txt" onChange={e => selectFile(e.target.files?.[0])} />
        <span className="upload-bubble">↑</span><strong>{extracting ? "Extracting readable text…" : fileName || "Drop a PDF, DOCX, or PPTX"}</strong><small>{status || "or click to choose a file"}</small>
      </label>
      <div className="or"><span>or paste text</span></div>
      <label className="field"><span>Material title</span><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Week 4: Cellular respiration" /></label>
      <label className="field"><span>Study material</span><textarea value={text} onChange={e => setText(e.target.value)} rows={7} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={extracting} onClick={create}>{extracting ? "Reading file…" : "Create my Learnade →"}</button></div>
    </div>
  </div>;
}

function StudyMode({ mode, title, source, learningPackage, learnadeId, onChangeMode, onBack }: { mode: Mode; title: string; source: string; learningPackage:LearningPackage; learnadeId:string; onChangeMode:(mode:Mode)=>void; onBack: () => void }) {
  const label = modes.find(m => m.id === mode)?.title || "Study";
  return <main className="study-shell">
    <header className="study-topbar"><button className="brand" onClick={onBack}><span className="brand-mark">L</span>Learnade</button><div><small>BIOLOGY</small><strong>{title}</strong></div><button className="secondary" onClick={onBack}>Exit session</button></header>
    <div className="study-layout">
      <aside><button className="back-link" onClick={onBack}>← <span>All modes</span></button><span className="eyebrow">LEARNING MODE</span><h1>{label}</h1><p>Switch whenever your attention or energy changes.</p><div className="side-progress"><span>Session progress</span><strong>38%</strong><i><b /></i></div></aside>
      <section className="workspace">
        {mode === "reader" && <Reader source={source} title={title} />}
        {mode === "speed" && <SpeedReader source={source} />}
        {mode === "focus" && <FocusMode learningPackage={learningPackage} />}
        {mode === "brainrot" && <Brainrot source={learningPackage.narration} />}
        {mode === "guide" && <Guide learningPackage={learningPackage} onReview={()=>onChangeMode("reader")} />}
        {mode === "cards" && <Cards cards={learningPackage.flashcards} learnadeId={learnadeId} />}
        {mode === "quiz" && <Quiz questions={learningPackage.quiz} learnadeId={learnadeId} />}
      </section>
    </div>
  </main>;
}

function Reader({ source, title }: { source: string; title:string }) {
  const [dyslexia, setDyslexia] = useState(false); const [size, setSize] = useState(19); const [focus, setFocus] = useState(false);
  return <div className="reader-panel"><div className="tool-row"><button className={dyslexia ? "tool active" : "tool"} onClick={() => setDyslexia(!dyslexia)} aria-pressed={dyslexia}>OpenDyslexic font</button><button className={focus ? "tool active" : "tool"} onClick={() => setFocus(!focus)} aria-pressed={focus}>Line focus</button><label>Text size <input type="range" min="16" max="28" value={size} onChange={e => setSize(+e.target.value)} /></label></div><article className={`${dyslexia ? "dyslexia" : ""} ${focus ? "line-focus" : ""}`} style={{fontSize: size}}><span className="eyebrow">SOURCE READER</span><h2>{title}</h2>{source.split(/(?<=[.!?])\s+/).map((sentence, i) => <p id={`source-sentence-${i+1}`} key={i}>{sentence}</p>)}</article></div>;
}

function SpeedReader({ source }: { source: string }) {
  const words = useMemo(() => source.split(/\s+/), [source]); const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false); const [wpm, setWpm] = useState(300);
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setIndex(i => i >= words.length - 1 ? 0 : i + 1), 60000 / wpm); return () => clearInterval(timer); }, [playing, wpm, words.length]);
  const word = words[index] || "Ready"; const pivot = Math.floor(word.length * .4);
  return <div className="speed-panel"><span className="eyebrow">RAPID SERIAL VISUAL PRESENTATION</span><div className="speed-word">{word.slice(0,pivot)}<em>{word[pivot]}</em>{word.slice(pivot+1)}</div><div className="speed-line"><i style={{width: `${(index / words.length) * 100}%`}} /></div><div className="speed-controls"><button onClick={() => setIndex(Math.max(0,index-10))}>↶ 10</button><button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause speed reader" : "Play speed reader"}>{playing ? <PauseIcon /> : <PlayIcon />}</button><button onClick={() => setIndex(Math.min(words.length-1,index+10))}>10 ↷</button></div><label className="wpm">{wpm} words per minute<input type="range" min="100" max="700" step="25" value={wpm} onChange={e => setWpm(+e.target.value)} /></label><p className="calm-note">Start at a pace that feels comfortable. Comprehension matters more than speed.</p></div>;
}

function FocusMode({learningPackage}:{learningPackage:LearningPackage}) {
  const [seconds, setSeconds] = useState(12 * 60); const [running, setRunning] = useState(false); const [done, setDone] = useState<boolean[]>([false,false,false]);
  const [brokenDown, setBrokenDown] = useState(false);
  useEffect(() => { if (!running || seconds <= 0) return; const t = setInterval(() => setSeconds(s => s - 1), 1000); return () => clearInterval(t); }, [running, seconds]);
  const firstSection=learningPackage.sections[0]?.title || "the opening section";
  const tasks = brokenDown ? [`Read the first paragraph about ${firstSection.toLowerCase()}`, "Write down one idea in your own words", `Review ${Math.min(3,learningPackage.keyTerms.length)} key terms`] : [`Read the summary of ${firstSection.toLowerCase()}`, `Review ${learningPackage.keyTerms.length} key terms`, `Answer ${learningPackage.quiz.length} practice questions`];
  const breakItDown = () => { setBrokenDown(true); setDone([false,false,false]); };
  return <div className="focus-panel"><span className="eyebrow">ONE SMALL STEP AT A TIME</span><h2>Your 12-minute focus session</h2><p>Everything else can wait. You only need to do the next thing.</p><div className="timer">{String(Math.floor(seconds/60)).padStart(2,"0")}<i>:</i>{String(seconds%60).padStart(2,"0")}</div><button className="primary focus-start" onClick={() => setRunning(!running)}>{running ? <><PauseIcon /> Pause gently</> : <><PlayIcon /> Start focus session</>}</button><div className="task-list" aria-live="polite">{tasks.map((task,i) => <button className={done[i] ? "done" : ""} key={task} onClick={() => setDone(d => d.map((v,j) => j === i ? !v : v))}><span>{done[i] ? "✓" : i+1}</span><strong>{task}</strong><small>{brokenDown ? [2,2,3][i] : [3,4,5][i]} min</small></button>)}</div>{brokenDown && <p className="microcopy" role="status">Done. We made the next step smaller and removed the pressure to finish everything at once.</p>}<button className="text-button" onClick={breakItDown} disabled={brokenDown}>{brokenDown ? "This is the smallest useful starting point" : "I’m stuck — help me make this smaller"}</button></div>;
}

function Brainrot({ source }: { source: string }) {
  const [speaking, setSpeaking] = useState(false); const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [visual, setVisual] = useState<"minecraft" | "subway">("minecraft");
  const narrationSentences=useMemo(()=>source.split(/(?<=[.!?])\s+/).filter(Boolean),[source]);
  const [sentenceIndex,setSentenceIndex]=useState(0); const [rate,setRate]=useState(1.05); const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]); const [voiceName,setVoiceName]=useState("");
  useEffect(()=>{ const load=()=>{const available=speechSynthesis.getVoices();setVoices(available);if(!voiceName&&available[0])setVoiceName(available.find(v=>v.lang.startsWith("en"))?.name||available[0].name)};load();speechSynthesis.addEventListener("voiceschanged",load);return()=>speechSynthesis.removeEventListener("voiceschanged",load)},[voiceName]);
  const speakFrom=(start:number)=>{ speechSynthesis.cancel(); const remaining=narrationSentences.slice(start);const spoken=remaining.join(" ");const offsets=remaining.map((_,i)=>remaining.slice(0,i).join(" ").length+(i?1:0)); const u=new SpeechSynthesisUtterance(spoken);u.rate=rate;u.voice=voices.find(v=>v.name===voiceName)||null;u.onboundary=(event)=>{let local=0;for(let i=0;i<offsets.length;i+=1)if(event.charIndex>=offsets[i])local=i;setSentenceIndex(Math.min(start+local,narrationSentences.length-1));};u.onend=()=>setSpeaking(false);utterance.current=u;speechSynthesis.speak(u);setSpeaking(true); };
  const toggle = () => { if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; } speakFrom(sentenceIndex); };
  const skip=(amount:number)=>{const next=Math.max(0,Math.min(narrationSentences.length-1,sentenceIndex+amount));setSentenceIndex(next);if(speaking)speakFrom(next)};
  useEffect(() => () => speechSynthesis.cancel(), []);
  const videoId = visual === "minecraft" ? "XBIaqOm0RKQ" : "QPW3XwBoQlw";
  return <div className="brainrot-panel"><div className="visual-picker" aria-label="Choose background gameplay"><button className={visual==="minecraft"?"active":""} onClick={()=>setVisual("minecraft")}>Minecraft parkour</button><button className={visual==="subway"?"active":""} onClick={()=>setVisual("subway")}>Subway Surfers</button></div><div className="brain-visual"><iframe key={videoId} src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0`} title={visual === "minecraft" ? "Minecraft parkour visual focus gameplay" : "Subway Surfers visual focus gameplay"} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" /><div className="video-shade" /><div className="video-label">VISUAL FOCUS · {visual === "minecraft" ? "MINECRAFT PARKOUR" : "SUBWAY SURFERS"}</div></div><div className="caption" aria-live="polite"><span className="eyebrow">NOW EXPLAINING · {sentenceIndex+1} OF {narrationSentences.length}</span><p>{narrationSentences[sentenceIndex]}</p></div><div className="brain-controls"><button onClick={()=>skip(-1)} aria-label="Previous narration segment">←</button><button className="play" onClick={toggle} aria-label={speaking ? "Pause narration" : "Play narration"}>{speaking ? <PauseIcon /> : <PlayIcon />}</button><button onClick={()=>skip(1)} aria-label="Next narration segment">→</button><span>{speaking ? "Narrating with captions" : "Ready to listen"}</span></div><div className="voice-controls"><label>Voice<select value={voiceName} onChange={e=>setVoiceName(e.target.value)}>{voices.filter(v=>v.lang.startsWith("en")).map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select></label><label>Speed<select value={rate} onChange={e=>setRate(Number(e.target.value))}><option value={0.8}>0.8×</option><option value={1.05}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></label></div><p className="calm-note">Voice is generated on your device. {visual === "minecraft" ? <><a href="https://www.youtube.com/watch?v=XBIaqOm0RKQ" target="_blank" rel="noreferrer">Minecraft gameplay by GameplaysForFree</a>, licensed <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</> : <><a href="https://www.youtube.com/watch?v=QPW3XwBoQlw" target="_blank" rel="noreferrer">Subway Surfers gameplay</a> is marked free to use by its creator.</>}</p></div>;
}

function Guide({learningPackage,onReview}:{learningPackage:LearningPackage;onReview:()=>void}) { const [open,setOpen]=useState<string | null>(learningPackage.sections[0]?.id||null); return <div className="guide"><span className="eyebrow">SOURCE-BUILT STUDY GUIDE</span><h2>{learningPackage.title} at a glance</h2><p className="guide-intro">Built privately on this device. Select a section to expand it and trace every point back to the source.</p><div className="overview-box"><strong>Overview</strong><p>{learningPackage.overview}</p></div><div className="guide-grid">{learningPackage.sections.map((item,index) => <section className={open===item.id ? "open" : ""} key={item.id}><button onClick={() => setOpen(open===item.id ? null : item.id)} aria-expanded={open===item.id}><span>{String(index+1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.sentences[0]}</p><b>{open===item.id ? "−" : "+"}</b></button>{open===item.id && <div className="guide-detail"><p>{item.text}</p><button className="source-link" onClick={onReview}>Review in source →</button></div>}</section>)}</div><div className="key-term-list"><span className="eyebrow">KEY TERMS FROM YOUR SOURCE</span>{learningPackage.keyTerms.map(term=><article key={term.term}><strong>{term.term}</strong><p>{term.definition}</p></article>)}</div></div>; }

function Cards({cards,learnadeId}:{cards:LearningPackage["flashcards"];learnadeId:string}) {
  const storageKey=`learnade-cards-${learnadeId}`;
  const [queue,setQueue]=useState<number[]>(cards.map((_,i)=>i)); const [known,setKnown]=useState<number[]>([]); const [flip,setFlip]=useState(false); const [status,setStatus]=useState("");
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved){setQueue(saved.queue);setKnown(saved.known)}}catch{}},[storageKey]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify({queue,known}))},[queue,known,storageKey]);
  const current = queue[0];
  const notYet = () => { setQueue(q => q.length > 1 ? [...q.slice(1), q[0]] : q); setFlip(false); setStatus("Card moved to the end of your review stack."); };
  const gotIt = () => { if (current === undefined) return; setKnown(k => [...k,current]); setQueue(q => q.slice(1)); setFlip(false); setStatus("Card added to your known stack."); };
  const reviewKnown = () => { setQueue(known); setKnown([]); setFlip(false); setStatus("Known cards moved back into review."); };
  if (current === undefined) return <div className="cards-panel card-complete"><span className="completion-mark">✓</span><h2>You know this set.</h2><p>All {known.length} cards are in your known stack.</p><button className="primary" onClick={reviewKnown}>Review known cards again</button></div>;
  return <div className="cards-panel"><div className="stack-status"><span>To review <strong>{queue.length}</strong></span><span>Known <strong>{known.length}</strong></span></div><span className="eyebrow">CURRENT REVIEW CARD</span><button className={`flashcard ${flip ? "flipped" : ""}`} onClick={() => setFlip(!flip)}><small>{flip ? "ANSWER" : "QUESTION"}</small><strong>{flip?cards[current].back:cards[current].front}</strong><span>Click to {flip ? "see question" : "reveal answer"}</span></button><div className="card-actions"><button onClick={notYet}>↻ Not yet</button><button className="primary" onClick={gotIt}>Got it ✓</button></div><p className="microcopy" aria-live="polite">{status}</p></div>;
}

function Quiz({questions,learnadeId}:{questions:LearningPackage["quiz"];learnadeId:string}) {
  const [index,setIndex]=useState(0); const [selected,setSelected]=useState<number | null>(null); const [score,setScore]=useState(0); const [complete,setComplete]=useState(false); const question=questions[index];
  const choose=(choice:number)=>{ if(selected!==null)return; setSelected(choice); if(choice===question.answer)setScore(s=>s+1); };
  const next=()=>{ if(index===questions.length-1){setComplete(true);localStorage.setItem(`learnade-quiz-${learnadeId}`,JSON.stringify({score,total:questions.length,date:new Date().toISOString()}));return;} setIndex(i=>i+1);setSelected(null); };
  const restart=()=>{setIndex(0);setSelected(null);setScore(0);setComplete(false);};
  if(!question)return <div className="quiz-panel quiz-results"><span className="completion-mark">!</span><h2>Not enough source material yet.</h2><p>Add more text to generate practice questions.</p></div>;
  if(complete)return <div className="quiz-panel quiz-results"><span className="completion-mark">{score>=Math.ceil(questions.length*.8)?"✓":"↻"}</span><span className="eyebrow">QUIZ COMPLETE</span><h2>{score} out of {questions.length}</h2><p>{score>=Math.ceil(questions.length*.8)?"Strong work. You have a solid grasp of the material.":"Good start. Another pass will strengthen the concepts that are still forming."}</p><button className="primary" onClick={restart}>Try the quiz again</button></div>;
  return <div className="quiz-panel"><div className="quiz-progress"><i style={{width:`${((index+1)/questions.length)*100}%`}} /></div><span className="eyebrow">QUESTION {index+1} OF {questions.length} · FROM YOUR SOURCE</span><h2>{question.prompt}</h2>{question.options.map((v,i) => <button disabled={selected!==null} className={`answer ${selected!==null&&i===question.answer?"correct":""} ${selected===i&&i!==question.answer?"incorrect":""}`} key={v} onClick={() => choose(i)}><span>{String.fromCharCode(65+i)}</span>{v}</button>)}{selected!==null && <div className="feedback"><strong>{selected===question.answer?"Exactly right.":"Not quite—here’s the connection."}</strong><p>{question.explanation}</p><button className="primary" onClick={next}>{index===questions.length-1?"See my results":"Next question →"}</button></div>}</div>;
}
