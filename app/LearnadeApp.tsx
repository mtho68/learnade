"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource/opendyslexic/400.css";

type Mode = "home" | "reader" | "speed" | "focus" | "brainrot" | "guide" | "cards" | "quiz";

const sampleText = `Photosynthesis is the process plants use to convert light energy into chemical energy. It occurs primarily in chloroplasts. During the light-dependent reactions, chlorophyll absorbs sunlight and helps produce ATP and NADPH. The Calvin cycle then uses that stored energy to convert carbon dioxide into glucose. Water is split during the light-dependent reactions, releasing oxygen as a byproduct. Temperature, light intensity, and carbon dioxide concentration can all affect the rate of photosynthesis.`;

const cards = [
  ["Where does photosynthesis primarily occur?", "Inside chloroplasts."],
  ["What do the light-dependent reactions produce?", "ATP and NADPH."],
  ["What does the Calvin cycle create?", "Glucose from carbon dioxide using stored energy."],
];

const quizQuestions = [
  { prompt: "Which molecule provides energy for the Calvin cycle?", options: ["Oxygen", "ATP", "Glucose", "Carbon dioxide"], answer: 1, explanation: "ATP and NADPH are made during the light-dependent reactions and supply energy to the Calvin cycle." },
  { prompt: "Where does photosynthesis primarily take place?", options: ["Mitochondria", "Nucleus", "Chloroplasts", "Cell membrane"], answer: 2, explanation: "Chloroplasts contain chlorophyll and the internal structures needed for both major stages of photosynthesis." },
  { prompt: "Which substance is split to release oxygen?", options: ["Glucose", "Water", "Carbon dioxide", "NADPH"], answer: 1, explanation: "During the light-dependent reactions, water is split and oxygen is released as a byproduct." },
  { prompt: "What does the Calvin cycle use carbon dioxide to build?", options: ["Glucose", "Oxygen", "Water", "Chlorophyll"], answer: 0, explanation: "The Calvin cycle uses carbon dioxide plus energy from ATP and NADPH to build glucose." },
  { prompt: "Which can affect the rate of photosynthesis?", options: ["Light intensity", "Temperature", "Carbon dioxide concentration", "All of these"], answer: 3, explanation: "All three variables can become limiting factors and change the rate of photosynthesis." },
];

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
  const [showUpload, setShowUpload] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("learnade-source");
    if (stored) setSource(stored);
  }, []);

  const saveSource = (value: string) => {
    setSource(value);
    localStorage.setItem("learnade-source", value);
    setSaved(true);
  };

  if (mode !== "home") {
    return <StudyMode mode={mode} title={title} source={source} onBack={() => setMode("home")} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setMode("home")} aria-label="Learnade home">
          <span className="brand-mark">L</span><span>Learnade</span>
        </button>
        <nav aria-label="Primary navigation">
          <button className="nav-link active">My learning</button>
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

      {showUpload && <UploadModal source={source} onClose={() => setShowUpload(false)} onCreate={(text, name) => { saveSource(text); setTitle(name || "My new Learnade"); setShowUpload(false); }} />}
    </main>
  );
}

function UploadModal({ source, onClose, onCreate }: { source: string; onClose: () => void; onCreate: (text: string, title: string) => void }) {
  const [text, setText] = useState(source);
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title">
    <div className="modal">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      <span className="eyebrow">NEW LEARNADE</span><h2 id="upload-title">What are we learning?</h2><p>Upload source material or paste your notes. Your work stays on this device.</p>
      <label className="dropzone">
        <input type="file" accept=".pdf,.docx,.pptx,.txt" onChange={e => setFileName(e.target.files?.[0]?.name || "")} />
        <span className="upload-bubble">↑</span><strong>{fileName || "Drop a PDF, DOCX, or PPTX"}</strong><small>{fileName ? "File ready for extraction" : "or click to choose a file"}</small>
      </label>
      <div className="or"><span>or paste text</span></div>
      <label className="field"><span>Material title</span><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Week 4: Cellular respiration" /></label>
      <label className="field"><span>Study material</span><textarea value={text} onChange={e => setText(e.target.value)} rows={7} /></label>
      <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={() => onCreate(text, name)}>Create my Learnade →</button></div>
    </div>
  </div>;
}

function StudyMode({ mode, title, source, onBack }: { mode: Mode; title: string; source: string; onBack: () => void }) {
  const label = modes.find(m => m.id === mode)?.title || "Study";
  return <main className="study-shell">
    <header className="study-topbar"><button className="brand" onClick={onBack}><span className="brand-mark">L</span>Learnade</button><div><small>BIOLOGY</small><strong>{title}</strong></div><button className="secondary" onClick={onBack}>Exit session</button></header>
    <div className="study-layout">
      <aside><button className="back-link" onClick={onBack}>← <span>All modes</span></button><span className="eyebrow">LEARNING MODE</span><h1>{label}</h1><p>Switch whenever your attention or energy changes.</p><div className="side-progress"><span>Session progress</span><strong>38%</strong><i><b /></i></div></aside>
      <section className="workspace">
        {mode === "reader" && <Reader source={source} />}
        {mode === "speed" && <SpeedReader source={source} />}
        {mode === "focus" && <FocusMode />}
        {mode === "brainrot" && <Brainrot source={source} />}
        {mode === "guide" && <Guide />}
        {mode === "cards" && <Cards />}
        {mode === "quiz" && <Quiz />}
      </section>
    </div>
  </main>;
}

function Reader({ source }: { source: string }) {
  const [dyslexia, setDyslexia] = useState(false); const [size, setSize] = useState(19); const [focus, setFocus] = useState(false);
  return <div className="reader-panel"><div className="tool-row"><button className={dyslexia ? "tool active" : "tool"} onClick={() => setDyslexia(!dyslexia)} aria-pressed={dyslexia}>OpenDyslexic font</button><button className={focus ? "tool active" : "tool"} onClick={() => setFocus(!focus)} aria-pressed={focus}>Line focus</button><label>Text size <input type="range" min="16" max="28" value={size} onChange={e => setSize(+e.target.value)} /></label></div><article className={`${dyslexia ? "dyslexia" : ""} ${focus ? "line-focus" : ""}`} style={{fontSize: size}}><span className="eyebrow">SECTION 1 OF 4</span><h2>Photosynthesis: turning light into energy</h2>{source.split(/(?<=[.!?])\s+/).map((sentence, i) => <p key={i}>{sentence}</p>)}</article></div>;
}

function SpeedReader({ source }: { source: string }) {
  const words = useMemo(() => source.split(/\s+/), [source]); const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false); const [wpm, setWpm] = useState(300);
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setIndex(i => i >= words.length - 1 ? 0 : i + 1), 60000 / wpm); return () => clearInterval(timer); }, [playing, wpm, words.length]);
  const word = words[index] || "Ready"; const pivot = Math.floor(word.length * .4);
  return <div className="speed-panel"><span className="eyebrow">RAPID SERIAL VISUAL PRESENTATION</span><div className="speed-word">{word.slice(0,pivot)}<em>{word[pivot]}</em>{word.slice(pivot+1)}</div><div className="speed-line"><i style={{width: `${(index / words.length) * 100}%`}} /></div><div className="speed-controls"><button onClick={() => setIndex(Math.max(0,index-10))}>↶ 10</button><button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause speed reader" : "Play speed reader"}>{playing ? <PauseIcon /> : <PlayIcon />}</button><button onClick={() => setIndex(Math.min(words.length-1,index+10))}>10 ↷</button></div><label className="wpm">{wpm} words per minute<input type="range" min="100" max="700" step="25" value={wpm} onChange={e => setWpm(+e.target.value)} /></label><p className="calm-note">Start at a pace that feels comfortable. Comprehension matters more than speed.</p></div>;
}

function FocusMode() {
  const [seconds, setSeconds] = useState(12 * 60); const [running, setRunning] = useState(false); const [done, setDone] = useState<boolean[]>([false,false,false]);
  const [brokenDown, setBrokenDown] = useState(false);
  useEffect(() => { if (!running || seconds <= 0) return; const t = setInterval(() => setSeconds(s => s - 1), 1000); return () => clearInterval(t); }, [running, seconds]);
  const tasks = brokenDown ? ["Read just the first paragraph", "Write down one idea in your own words", "Review 3 key terms"] : ["Read the section summary", "Review 6 key terms", "Answer 3 practice questions"];
  const breakItDown = () => { setBrokenDown(true); setDone([false,false,false]); };
  return <div className="focus-panel"><span className="eyebrow">ONE SMALL STEP AT A TIME</span><h2>Your 12-minute focus session</h2><p>Everything else can wait. You only need to do the next thing.</p><div className="timer">{String(Math.floor(seconds/60)).padStart(2,"0")}<i>:</i>{String(seconds%60).padStart(2,"0")}</div><button className="primary focus-start" onClick={() => setRunning(!running)}>{running ? <><PauseIcon /> Pause gently</> : <><PlayIcon /> Start focus session</>}</button><div className="task-list" aria-live="polite">{tasks.map((task,i) => <button className={done[i] ? "done" : ""} key={task} onClick={() => setDone(d => d.map((v,j) => j === i ? !v : v))}><span>{done[i] ? "✓" : i+1}</span><strong>{task}</strong><small>{brokenDown ? [2,2,3][i] : [3,4,5][i]} min</small></button>)}</div>{brokenDown && <p className="microcopy" role="status">Done. We made the next step smaller and removed the pressure to finish everything at once.</p>}<button className="text-button" onClick={breakItDown} disabled={brokenDown}>{brokenDown ? "This is the smallest useful starting point" : "I’m stuck — help me make this smaller"}</button></div>;
}

function Brainrot({ source }: { source: string }) {
  const [speaking, setSpeaking] = useState(false); const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const toggle = () => { if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; } const u = new SpeechSynthesisUtterance(source); u.rate = 1.05; u.onend = () => setSpeaking(false); utterance.current = u; speechSynthesis.speak(u); setSpeaking(true); };
  useEffect(() => () => speechSynthesis.cancel(), []);
  return <div className="brainrot-panel"><div className="brain-visual"><video autoPlay muted loop playsInline preload="metadata" aria-label="Urban parkour footage used as a visual focus aid"><source src="https://videos.pexels.com/video-files/30511322/13071752_1080_1920_30fps.mp4" type="video/mp4" /></video><div className="video-shade" /><div className="video-label">VISUAL FOCUS · PARKOUR</div></div><div className="caption"><span className="eyebrow">NOW EXPLAINING</span><p>{source.split(/(?<=[.!?])\s+/)[0]}</p></div><div className="brain-controls"><button className="play" onClick={toggle} aria-label={speaking ? "Pause narration" : "Play narration"}>{speaking ? <PauseIcon /> : <PlayIcon />}</button><span>{speaking ? "Narrating with captions" : "Ready to listen"}</span></div><p className="calm-note">Voice is generated on your device. Parkour footage by Alejandro De Roa via Pexels.</p></div>;
}

const guideItems = [
  { n:"01", title:"Learning objectives", summary:"Know what you should be able to explain after this lesson.", detail:<ul><li>Explain how light becomes stored chemical energy.</li><li>Compare light-dependent reactions and the Calvin cycle.</li><li>Identify factors that change the reaction rate.</li></ul> },
  { n:"02", title:"Key relationship", summary:"See how the two stages depend on each other.", detail:<p>Light reactions make <strong>ATP + NADPH</strong>, which power the <strong>Calvin cycle</strong> to build glucose.</p> },
  { n:"03", title:"Likely test material", summary:"Prioritize the details most likely to be assessed.", detail:<p>Know the inputs, outputs, location, and relationship between the two major stages.</p> },
  { n:"04", title:"Common mix-up", summary:"Catch the misconception students make most often.", detail:<p>The oxygen released by plants comes from splitting water—not from carbon dioxide.</p> },
];
function Guide() { const [open,setOpen]=useState<string | null>("01"); return <div className="guide"><span className="eyebrow">AI-GENERATED STUDY GUIDE</span><h2>Photosynthesis at a glance</h2><p className="guide-intro">Select a section to expand it. These will be generated from each uploaded source.</p><div className="guide-grid">{guideItems.map(item => <section className={open===item.n ? "open" : ""} key={item.n}><button onClick={() => setOpen(open===item.n ? null : item.n)} aria-expanded={open===item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.summary}</p><b>{open===item.n ? "−" : "+"}</b></button>{open===item.n && <div className="guide-detail">{item.detail}<button className="source-link">Review in source →</button></div>}</section>)}</div></div>; }

function Cards() {
  const [queue,setQueue]=useState<number[]>(cards.map((_,i)=>i)); const [known,setKnown]=useState<number[]>([]); const [flip,setFlip]=useState(false); const [status,setStatus]=useState("");
  const current = queue[0];
  const notYet = () => { setQueue(q => q.length > 1 ? [...q.slice(1), q[0]] : q); setFlip(false); setStatus("Card moved to the end of your review stack."); };
  const gotIt = () => { if (current === undefined) return; setKnown(k => [...k,current]); setQueue(q => q.slice(1)); setFlip(false); setStatus("Card added to your known stack."); };
  const reviewKnown = () => { setQueue(known); setKnown([]); setFlip(false); setStatus("Known cards moved back into review."); };
  if (current === undefined) return <div className="cards-panel card-complete"><span className="completion-mark">✓</span><h2>You know this set.</h2><p>All {known.length} cards are in your known stack.</p><button className="primary" onClick={reviewKnown}>Review known cards again</button></div>;
  return <div className="cards-panel"><div className="stack-status"><span>To review <strong>{queue.length}</strong></span><span>Known <strong>{known.length}</strong></span></div><span className="eyebrow">CURRENT REVIEW CARD</span><button className={`flashcard ${flip ? "flipped" : ""}`} onClick={() => setFlip(!flip)}><small>{flip ? "ANSWER" : "QUESTION"}</small><strong>{cards[current][flip ? 1 : 0]}</strong><span>Click to {flip ? "see question" : "reveal answer"}</span></button><div className="card-actions"><button onClick={notYet}>↻ Not yet</button><button className="primary" onClick={gotIt}>Got it ✓</button></div><p className="microcopy" aria-live="polite">{status}</p></div>;
}

function Quiz() {
  const [index,setIndex]=useState(0); const [selected,setSelected]=useState<number | null>(null); const [score,setScore]=useState(0); const [complete,setComplete]=useState(false); const question=quizQuestions[index];
  const choose=(choice:number)=>{ if(selected!==null)return; setSelected(choice); if(choice===question.answer)setScore(s=>s+1); };
  const next=()=>{ if(index===quizQuestions.length-1){setComplete(true);return;} setIndex(i=>i+1);setSelected(null); };
  const restart=()=>{setIndex(0);setSelected(null);setScore(0);setComplete(false);};
  if(complete)return <div className="quiz-panel quiz-results"><span className="completion-mark">{score>=4?"✓":"↻"}</span><span className="eyebrow">QUIZ COMPLETE</span><h2>{score} out of {quizQuestions.length}</h2><p>{score>=4?"Strong work. You have a solid grasp of the material.":"Good start. Another pass will strengthen the concepts that are still forming."}</p><button className="primary" onClick={restart}>Try the quiz again</button></div>;
  return <div className="quiz-panel"><div className="quiz-progress"><i style={{width:`${((index+1)/quizQuestions.length)*100}%`}} /></div><span className="eyebrow">QUESTION {index+1} OF {quizQuestions.length} · FOUNDATIONS</span><h2>{question.prompt}</h2>{question.options.map((v,i) => <button disabled={selected!==null} className={`answer ${selected!==null&&i===question.answer?"correct":""} ${selected===i&&i!==question.answer?"incorrect":""}`} key={v} onClick={() => choose(i)}><span>{String.fromCharCode(65+i)}</span>{v}</button>)}{selected!==null && <div className="feedback"><strong>{selected===question.answer?"Exactly right.":"Not quite—here’s the connection."}</strong><p>{question.explanation}</p><button className="primary" onClick={next}>{index===quizQuestions.length-1?"See my results":"Next question →"}</button></div>}</div>;
}
