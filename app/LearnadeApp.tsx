"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "home" | "reader" | "speed" | "focus" | "brainrot" | "guide" | "cards" | "quiz";

const sampleText = `Photosynthesis is the process plants use to convert light energy into chemical energy. It occurs primarily in chloroplasts. During the light-dependent reactions, chlorophyll absorbs sunlight and helps produce ATP and NADPH. The Calvin cycle then uses that stored energy to convert carbon dioxide into glucose. Water is split during the light-dependent reactions, releasing oxygen as a byproduct. Temperature, light intensity, and carbon dioxide concentration can all affect the rate of photosynthesis.`;

const cards = [
  ["Where does photosynthesis primarily occur?", "Inside chloroplasts."],
  ["What do the light-dependent reactions produce?", "ATP and NADPH."],
  ["What does the Calvin cycle create?", "Glucose from carbon dioxide using stored energy."],
];

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
          <h1>Make hard material<br/><em>easier to enter.</em></h1>
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
      <aside><button className="back-link" onClick={onBack}>← All modes</button><span className="eyebrow">LEARNING MODE</span><h1>{label}</h1><p>Switch whenever your attention or energy changes.</p><div className="side-progress"><span>Session progress</span><strong>38%</strong><i><b /></i></div></aside>
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
  return <div className="reader-panel"><div className="tool-row"><button className={dyslexia ? "tool active" : "tool"} onClick={() => setDyslexia(!dyslexia)}>Dyslexia-friendly</button><button className={focus ? "tool active" : "tool"} onClick={() => setFocus(!focus)}>Line focus</button><label>Text size <input type="range" min="16" max="28" value={size} onChange={e => setSize(+e.target.value)} /></label></div><article className={`${dyslexia ? "dyslexia" : ""} ${focus ? "line-focus" : ""}`} style={{fontSize: size}}><span className="eyebrow">SECTION 1 OF 4</span><h2>Photosynthesis: turning light into energy</h2>{source.split(/(?<=[.!?])\s+/).map((sentence, i) => <p key={i}>{sentence}</p>)}</article></div>;
}

function SpeedReader({ source }: { source: string }) {
  const words = useMemo(() => source.split(/\s+/), [source]); const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false); const [wpm, setWpm] = useState(300);
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setIndex(i => i >= words.length - 1 ? 0 : i + 1), 60000 / wpm); return () => clearInterval(timer); }, [playing, wpm, words.length]);
  const word = words[index] || "Ready"; const pivot = Math.floor(word.length * .4);
  return <div className="speed-panel"><span className="eyebrow">RAPID SERIAL VISUAL PRESENTATION</span><div className="speed-word">{word.slice(0,pivot)}<em>{word[pivot]}</em>{word.slice(pivot+1)}</div><div className="speed-line"><i style={{width: `${(index / words.length) * 100}%`}} /></div><div className="speed-controls"><button onClick={() => setIndex(Math.max(0,index-10))}>↶ 10</button><button className="play" onClick={() => setPlaying(!playing)}>{playing ? "Ⅱ" : "▶"}</button><button onClick={() => setIndex(Math.min(words.length-1,index+10))}>10 ↷</button></div><label className="wpm">{wpm} words per minute<input type="range" min="100" max="700" step="25" value={wpm} onChange={e => setWpm(+e.target.value)} /></label><p className="calm-note">Start at a pace that feels comfortable. Comprehension matters more than speed.</p></div>;
}

function FocusMode() {
  const [seconds, setSeconds] = useState(12 * 60); const [running, setRunning] = useState(false); const [done, setDone] = useState<boolean[]>([false,false,false]);
  useEffect(() => { if (!running || seconds <= 0) return; const t = setInterval(() => setSeconds(s => s - 1), 1000); return () => clearInterval(t); }, [running, seconds]);
  const tasks = ["Read the section summary", "Review 6 key terms", "Answer 3 practice questions"];
  return <div className="focus-panel"><span className="eyebrow">ONE SMALL STEP AT A TIME</span><h2>Your 12-minute focus session</h2><p>Everything else can wait. You only need to do the next thing.</p><div className="timer">{String(Math.floor(seconds/60)).padStart(2,"0")}<i>:</i>{String(seconds%60).padStart(2,"0")}</div><button className="primary" onClick={() => setRunning(!running)}>{running ? "Pause gently" : "Start focus session"}</button><div className="task-list">{tasks.map((task,i) => <button className={done[i] ? "done" : ""} key={task} onClick={() => setDone(d => d.map((v,j) => j === i ? !v : v))}><span>{done[i] ? "✓" : i+1}</span><strong>{task}</strong><small>{[3,4,5][i]} min</small></button>)}</div><button className="text-button">I&apos;m stuck — help me make this smaller</button></div>;
}

function Brainrot({ source }: { source: string }) {
  const [speaking, setSpeaking] = useState(false); const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const toggle = () => { if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; } const u = new SpeechSynthesisUtterance(source); u.rate = 1.05; u.onend = () => setSpeaking(false); utterance.current = u; speechSynthesis.speak(u); setSpeaking(true); };
  return <div className="brainrot-panel"><div className="brain-visual" aria-label="Abstract rolling focus visual"><div className="road"><i/><i/><i/><i/><i/></div><div className="orb">L</div></div><div className="caption"><span className="eyebrow">NOW EXPLAINING</span><p>{source.split(/(?<=[.!?])\s+/)[0]}</p></div><div className="brain-controls"><button className="play" onClick={toggle}>{speaking ? "Ⅱ" : "▶"}</button><span>{speaking ? "Narrating with captions" : "Ready to listen"}</span></div><p className="calm-note">Voice is generated on your device. Nothing is recorded.</p></div>;
}

function Guide() { return <div className="guide"><span className="eyebrow">AI-GENERATED STUDY GUIDE</span><h2>Photosynthesis at a glance</h2><div className="guide-grid"><section><span>01</span><h3>Learning objectives</h3><ul><li>Explain how light becomes stored chemical energy.</li><li>Compare light-dependent reactions and the Calvin cycle.</li><li>Identify factors that change the reaction rate.</li></ul></section><section><span>02</span><h3>Key relationship</h3><p>Light reactions make <strong>ATP + NADPH</strong>, which power the <strong>Calvin cycle</strong> to build glucose.</p></section><section><span>03</span><h3>Likely test material</h3><p>Know the inputs, outputs, location, and relationship between the two major stages.</p></section><section><span>04</span><h3>Common mix-up</h3><p>The oxygen released by plants comes from splitting water—not from carbon dioxide.</p></section></div></div>; }

function Cards() { const [index,setIndex]=useState(0); const [flip,setFlip]=useState(false); return <div className="cards-panel"><span className="eyebrow">CARD {index+1} OF {cards.length}</span><button className={`flashcard ${flip ? "flipped" : ""}`} onClick={() => setFlip(!flip)}><small>{flip ? "ANSWER" : "QUESTION"}</small><strong>{cards[index][flip ? 1 : 0]}</strong><span>Click to {flip ? "see question" : "reveal answer"}</span></button><div className="card-actions"><button onClick={() => {setIndex((index+1)%cards.length);setFlip(false)}}>Not yet</button><button className="primary" onClick={() => {setIndex((index+1)%cards.length);setFlip(false)}}>Got it ✓</button></div></div>; }

function Quiz() { const [answer,setAnswer]=useState<string>(); return <div className="quiz-panel"><span className="eyebrow">QUESTION 1 OF 5 · FOUNDATIONS</span><h2>Which molecule provides energy for the Calvin cycle?</h2>{["Oxygen","ATP","Glucose","Carbon dioxide"].map(v => <button className={`answer ${answer===v ? (v==="ATP"?"correct":"incorrect") : ""}`} key={v} onClick={() => setAnswer(v)}><span>{String.fromCharCode(65+["Oxygen","ATP","Glucose","Carbon dioxide"].indexOf(v))}</span>{v}</button>)}{answer && <div className="feedback"><strong>{answer === "ATP" ? "Exactly right." : "Almost—try ATP."}</strong><p>ATP and NADPH are made during the light-dependent reactions and then supply energy to the Calvin cycle.</p></div>}</div>; }
