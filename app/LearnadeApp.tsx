"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource/opendyslexic/400.css";
import { extractDocument } from "../lib/extractDocument";
import { generateLocalLearningPackage, type LearningPackage } from "../lib/localLearning";
import { generateWithBrowserAI } from "../lib/browserAI";
import { deleteLectureAudio, deleteLibraryItem, loadLectureAudio, loadLibrary, saveLectureAudio, saveLibraryItem } from "../lib/storage";
import { masteryPercent, recordAnswer, scheduleCard, type CardReview, type SectionMastery } from "../lib/mastery";
import { addCourseMaterial, combineCourseMaterials, courseSource, normalizeCourse, removeCourseMaterial, renameCourse, type CourseMaterial, type MaterialKind, type SavedCourse } from "../lib/courseLibrary";

type Mode = "home" | "plan" | "reader" | "speed" | "focus" | "brainrot" | "guide" | "cards" | "quiz";
type Theme = "light" | "dark";

const sampleText = `Photosynthesis is the process plants use to convert light energy into chemical energy. It occurs primarily in chloroplasts. During the light-dependent reactions, chlorophyll absorbs sunlight and helps produce ATP and NADPH. The Calvin cycle then uses that stored energy to convert carbon dioxide into glucose. Water is split during the light-dependent reactions, releasing oxygen as a byproduct. Temperature, light intensity, and carbon dioxide concentration can all affect the rate of photosynthesis.`;

function PlayIcon() { return <span className="media-icon play-icon" aria-hidden="true" />; }
function PauseIcon() { return <span className="media-icon pause-icon" aria-hidden="true"><i /><i /></span>; }
function ThemeToggle({theme,onToggle}:{theme:Theme;onToggle:()=>void}) { return <button className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} aria-pressed={theme==="dark"}><span aria-hidden="true">{theme==="light"?"☾":"☀"}</span><span>{theme==="light"?"Dark":"Light"}</span></button>; }
function sourceEvidence(section:LearningPackage["sections"][number],...values:string[]) { const tokens=new Set(values.join(" ").toLowerCase().match(/[a-z][a-z-]{3,}/g)||[]);return [...section.sentences].sort((a,b)=>[...tokens].filter(token=>b.toLowerCase().includes(token)).length-[...tokens].filter(token=>a.toLowerCase().includes(token)).length)[0]||section.text; }
type SpeechResultEvent={resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>};
type SpeechRecognitionLike={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;stop:()=>void;abort:()=>void;onresult:((event:SpeechResultEvent)=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null};
type SpeechRecognitionCtor=new()=>SpeechRecognitionLike;

const modes = [
  { id: "plan", icon: "◎", title: "My Study Plan", text: "Start with a quick check and focus on what needs work." },
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
  const [library, setLibrary] = useState<SavedCourse[]>([]);
  const [activeId, setActiveId] = useState("demo");
  const [uploadTarget, setUploadTarget] = useState<{courseId?:string}|null>(null);
  const [recordTarget, setRecordTarget] = useState<{courseId?:string}|null>(null);
  const [manageCourseId, setManageCourseId] = useState<string|null>(null);
  const [saved, setSaved] = useState(true);
  const [theme,setTheme]=useState<Theme>("light");

  useEffect(()=>{const timer=setTimeout(()=>{const stored=localStorage.getItem("learnade-theme");setTheme(stored==="dark"||(!stored&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light")},0);return()=>clearTimeout(timer)},[]);
  const toggleTheme=()=>setTheme(current=>{const next=current==="light"?"dark":"light";localStorage.setItem("learnade-theme",next);return next});

  useEffect(() => {
    loadLibrary<SavedCourse>().then(async parsed => {
      if(!parsed.length){try{const legacy=JSON.parse(localStorage.getItem("learnade-library")||"[]") as SavedCourse[];if(Array.isArray(legacy)){parsed=legacy;localStorage.removeItem("learnade-library")}}catch{}}
      const normalized=parsed.map(normalizeCourse);await Promise.all(normalized.map(saveLibraryItem));
      const sorted=normalized.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); setLibrary(sorted); if(sorted[0]) { setSource(sorted[0].source); setTitle(sorted[0].title); setLearningPackage(sorted[0].package); setActiveId(sorted[0].id); }
    }).catch(()=>setSaved(false));
  }, []);

  const activateCourse=(item:SavedCourse,nextMode:Mode="reader")=>{setSource(item.source);setTitle(item.title);setLearningPackage(item.package);setActiveId(item.id);setMode(nextMode)};
  const persistCourse=async(item:SavedCourse,activate=true)=>{setSaved(false);setLibrary(items=>[item,...items.filter(course=>course.id!==item.id)].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));if(activate)activateCourse(item,"plan");await saveLibraryItem(item);setSaved(true)};
  const saveMaterial = async (value:string,courseTitle:string,materialTitle:string,kind:MaterialKind,generated?:LearningPackage,courseId?:string,audio?:{blob:Blob;durationMs:number}) => {
    const now=new Date().toISOString();const cleanMaterialTitle=materialTitle.trim()||"New material";
    const materialId=crypto.randomUUID();const audioId=audio?crypto.randomUUID():undefined;
    const material:CourseMaterial={id:materialId,title:cleanMaterialTitle,source:value,createdAt:now,kind,package:generated||generateLocalLearningPackage(value,cleanMaterialTitle),audio:audio&&audioId?{id:audioId,mimeType:audio.blob.type||"audio/webm",size:audio.blob.size,durationMs:audio.durationMs}:undefined};
    const existing=courseId?library.find(course=>course.id===courseId):undefined;
    const item=existing?addCourseMaterial(existing,material,now):{id:crypto.randomUUID(),title:courseTitle.trim()||cleanMaterialTitle,source:courseSource([material]),createdAt:now,updatedAt:now,materials:[material],package:combineCourseMaterials([material],courseTitle.trim()||cleanMaterialTitle)};
    try{if(audio&&audioId)await saveLectureAudio(audioId,audio.blob);localStorage.removeItem(`learnade-diagnostic-${item.id}`);await persistCourse(item)}catch(error){if(audioId)await deleteLectureAudio(audioId).catch(()=>{});throw error}
  };

  const openItem = (item:SavedCourse) => activateCourse(item);
  const deleteItem = async(id:string) => { if(!confirm("Delete this course and all of its saved material?")) return;const course=library.find(item=>item.id===id);setLibrary(items=>items.filter(item=>item.id!==id));["learnade-card-srs-","learnade-cards-","learnade-quiz-","learnade-mastery-","learnade-diagnostic-"].forEach(prefix=>localStorage.removeItem(`${prefix}${id}`));await Promise.all((course?.materials||[]).flatMap(material=>material.audio?[deleteLectureAudio(material.audio.id)]:[]));await deleteLibraryItem(id); };
  const updateCourseName=async(id:string,name:string)=>{const course=library.find(item=>item.id===id);if(!course)return;const updated=renameCourse(course,name);await persistCourse(updated,false);if(activeId===id){setTitle(updated.title);setLearningPackage(updated.package)}};
  const deleteMaterial=async(courseId:string,materialId:string)=>{const course=library.find(item=>item.id===courseId);if(!course)return;if(course.materials.length===1){await deleteItem(courseId);setManageCourseId(null);return}if(!confirm("Remove this material from the course? Existing study progress for other materials will stay saved."))return;const material=course.materials.find(item=>item.id===materialId);const updated=removeCourseMaterial(course,materialId);if(material?.audio)await deleteLectureAudio(material.audio.id);localStorage.removeItem(`learnade-diagnostic-${courseId}`);await persistCourse(updated,false);if(activeId===courseId){setSource(updated.source);setTitle(updated.title);setLearningPackage(updated.package)}};
  const activeCourse=library.find(item=>item.id===activeId);

  if (mode !== "home") {
    return <StudyMode mode={mode} theme={theme} onToggleTheme={toggleTheme} title={title} source={source} learningPackage={learningPackage} learnadeId={activeId} onChangeMode={setMode} onBack={() => setMode("home")} onManage={()=>{setMode("home");if(activeCourse)setManageCourseId(activeCourse.id);else setUploadTarget({})}} />;
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <button className="brand" onClick={() => setMode("home")} aria-label="Learnade home">
          <span className="brand-mark">L</span><span>Learnade</span>
        </button>
        <nav aria-label="Primary navigation">
          <button className="nav-link active" onClick={() => document.getElementById("library")?.scrollIntoView({behavior:"smooth"})}>My learning</button>
          <button className="nav-link" onClick={() => setUploadTarget({})}>New course</button>
          <button className="nav-link" onClick={() => setRecordTarget({})}>Record lecture</button>
        </nav>
        <div className="header-actions"><ThemeToggle theme={theme} onToggle={toggleTheme}/><div className="profile"><span className="save-dot" /> {saved ? "Saved locally" : "Saving…"}<span className="avatar" aria-hidden="true">L</span></div></div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">YOUR LEARNING, YOUR WAY</span>
          <h1>Make learning<br/><em>work for your brain.</em></h1>
          <p>Turn notes, readings, and slides into study experiences shaped around the way your brain wants to learn today.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setUploadTarget({})}>＋ Create a course</button>
            <button className="secondary" onClick={() => setRecordTarget(activeCourse?{courseId:activeCourse.id}:{})}>● Record a lecture</button>
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
        <div className="material-copy"><span className="eyebrow">CONTINUE LEARNING</span><h2>{title}</h2><p>{activeCourse?.materials.length||1} source {(activeCourse?.materials.length||1)===1?"item":"items"} · 8 learning modes ready</p></div>
        <div className="progress-copy"><strong>{learningPackage.sections.length}</strong><span>sections</span></div>
        <div className="progress-track"><i /></div>
        <button className="round-button" onClick={() => setMode("reader")} aria-label="Continue learning">→</button>
      </section>

      <section className="modes-section">
        <div className="section-heading"><div><span className="eyebrow">CHOOSE WHAT WORKS NOW</span><h2>How do you want to learn?</h2></div><p>You can switch modes anytime. No setup, no penalty.</p></div>
        <div className="mode-grid">
          {modes.map((item, index) => (
            <button className={`mode-card mode-${(index % 7) + 1}`} key={item.id} aria-label={item.title} onClick={() => setMode(item.id)}>
              <span className="mode-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.text}</small></span><b aria-hidden="true">↗</b>
            </button>
          ))}
        </div>
      </section>

      <section className="library-section" id="library">
        <div className="section-heading"><div><span className="eyebrow">SAVED ON THIS DEVICE</span><h2>My learning library</h2></div><p>Your documents and progress stay in this browser.</p></div>
        {library.length === 0 ? <div className="library-empty"><strong>Your first course will appear here.</strong><p>Create a course from notes, documents, or a recorded lecture.</p><button className="secondary" onClick={()=>setUploadTarget({})}>Create one now</button></div> : <div className="library-grid">{library.map(item=><article key={item.id}><button className="library-open" onClick={()=>openItem(item)}><span className="material-icon">L</span><span><small>UPDATED {new Date(item.updatedAt).toLocaleDateString()}</small><strong>{item.title}</strong><em>{item.materials.length} {item.materials.length===1?"source":"sources"} · {item.package.flashcards.length} cards</em></span></button><div className="course-actions"><button onClick={()=>setUploadTarget({courseId:item.id})}>＋ Material</button><button onClick={()=>setRecordTarget({courseId:item.id})}>● Lecture</button><button onClick={()=>setManageCourseId(item.id)}>Manage</button></div><button className="delete-item" onClick={()=>deleteItem(item.id)} aria-label={`Delete ${item.title}`}>×</button></article>)}</div>}
      </section>

      {uploadTarget && <UploadModal course={uploadTarget.courseId?library.find(item=>item.id===uploadTarget.courseId):undefined} onClose={() => setUploadTarget(null)} onCreate={async (text, courseTitle, materialTitle, kind, generated) => { await saveMaterial(text,courseTitle,materialTitle,kind,generated,uploadTarget.courseId); setUploadTarget(null); }} />}
      {recordTarget && <LectureRecorderModal courses={library} defaultCourseId={recordTarget.courseId} onClose={()=>setRecordTarget(null)} onSave={async(text,courseTitle,lectureTitle,courseId,audio)=>{await saveMaterial(text,courseTitle,lectureTitle,"lecture",undefined,courseId,audio);setRecordTarget(null)}} />}
      {manageCourseId && library.find(item=>item.id===manageCourseId) && <ManageCourseModal course={library.find(item=>item.id===manageCourseId)!} onClose={()=>setManageCourseId(null)} onRename={updateCourseName} onDeleteMaterial={deleteMaterial} onAddMaterial={()=>{setManageCourseId(null);setUploadTarget({courseId:manageCourseId})}} onRecord={()=>{setManageCourseId(null);setRecordTarget({courseId:manageCourseId})}} />}
    </main>
  );
}

function UploadModal({ course, onClose, onCreate }: { course?:SavedCourse; onClose: () => void; onCreate: (text:string,courseTitle:string,materialTitle:string,kind:MaterialKind,generated?:LearningPackage) => Promise<void> }) {
  const [text, setText] = useState("");
  const [courseName, setCourseName] = useState(course?.title||"");
  const [materialTitle, setMaterialTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [creating, setCreating] = useState(false);
  const selectFile = async (file?: File) => {
    if (!file) return;
    if(file.size>30*1024*1024){setError("Choose a file smaller than 30 MB so your browser can process it reliably.");return;}
    setFileName(file.name); setExtracting(true); setError(""); setStatus("Reading your material…");
    try {
      const result = await extractDocument(file);
      setText(result.text); setMaterialTitle((current) => current || result.title);
      setStatus(`${result.kind.toUpperCase()} ready · ${result.text.split(/\s+/).length.toLocaleString()} words extracted`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t read that file."); setStatus("");
    } finally { setExtracting(false); }
  };
  const create = async () => {
    if (text.trim().length < 40) { setError("Add a little more study material before continuing."); return; }
    setCreating(true); setError("");
    const finalMaterialTitle=materialTitle||fileName.replace(/\.[^.]+$/,"")||"New material"; let generated:LearningPackage|undefined;
    if(!course&&courseName.trim().length<2){setCreating(false);setError("Give this course a name, such as Biology 101.");return}
    if(useAI){ try { generated=await generateWithBrowserAI(text,finalMaterialTitle,setStatus); } catch { setStatus("On-device AI was unavailable, so Learnade used its private instant generator instead."); } }
    else setStatus("Building your private learning package on this device…");
    try{await onCreate(text,course?.title||courseName,finalMaterialTitle,fileName?"upload":"pasted",generated);}catch{setCreating(false);setError("Learnade could not save this material. Check available browser storage and try again.");}
  };
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!creating)onClose()};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[creating,onClose]);
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title">
    <div className="modal">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      <span className="eyebrow">{course?"ADD TO COURSE":"NEW COURSE"}</span><h2 id="upload-title">{course?`Add material to ${course.title}`:"What are we learning?"}</h2><p>Upload source material or paste your notes. Add more lectures and documents anytime.</p>
      <label className="dropzone">
        <input type="file" accept=".pdf,.docx,.pptx,.txt" disabled={extracting||creating} onChange={e => selectFile(e.target.files?.[0])} />
        <span className="upload-bubble">↑</span><strong>{extracting ? "Extracting readable text…" : fileName || "Drop a PDF, DOCX, or PPTX"}</strong><small>{status || "or click to choose a file"}</small>
      </label>
      <div className="or"><span>or paste text</span></div>
      {!course&&<label className="field"><span>Course name</span><input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. Biology 101" /></label>}
      <label className="field"><span>Material title</span><input value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} placeholder="e.g. Week 4: Cellular respiration" /></label>
      <label className="field"><span>Study material</span><textarea value={text} onChange={e => setText(e.target.value)} rows={7} /></label>
      <label className="ai-option"><input type="checkbox" disabled={creating} checked={useAI} onChange={e=>setUseAI(e.target.checked)} /><span><strong>Enhance with free on-device AI</strong><small>Optional. Downloads about 500 MB once, needs WebGPU, uses no API key, and keeps text in your browser.</small></span></label>
      {status && <p className="form-status" role="status">{status}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="secondary" disabled={creating} onClick={onClose}>Cancel</button><button className="primary" disabled={extracting||creating} onClick={create}>{creating?"Building study materials…":extracting ? "Reading file…" : course?"Add to course →":"Create course →"}</button></div>
    </div>
  </div>;
}

function LectureRecorderModal({courses,defaultCourseId,onClose,onSave}:{courses:SavedCourse[];defaultCourseId?:string;onClose:()=>void;onSave:(text:string,courseTitle:string,lectureTitle:string,courseId:string|undefined,audio?:{blob:Blob;durationMs:number})=>Promise<void>}) {
  const [courseId,setCourseId]=useState(defaultCourseId||courses[0]?.id||"new");const [courseName,setCourseName]=useState("");const [lectureTitle,setLectureTitle]=useState(`Lecture ${new Date().toLocaleDateString()}`);const [transcript,setTranscript]=useState("");const [interim,setInterim]=useState("");const [recording,setRecording]=useState(false);const [paused,setPaused]=useState(false);const [seconds,setSeconds]=useState(0);const [supported,setSupported]=useState<{recording:boolean;transcription:boolean}>({recording:false,transcription:false});const [error,setError]=useState("");const [saving,setSaving]=useState(false);const [audioBlob,setAudioBlob]=useState<Blob|null>(null);const [audioUrl,setAudioUrl]=useState("");
  const recorderRef=useRef<MediaRecorder|null>(null);const recognitionRef=useRef<SpeechRecognitionLike|null>(null);const streamRef=useRef<MediaStream|null>(null);const chunksRef=useRef<Blob[]>([]);const recordingRef=useRef(false);const pausedRef=useRef(false);const audioUrlRef=useRef("");
  useEffect(()=>{const timer=setTimeout(()=>{const browserWindow=window as Window&{SpeechRecognition?:SpeechRecognitionCtor;webkitSpeechRecognition?:SpeechRecognitionCtor};setSupported({recording:Boolean(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder),transcription:Boolean(browserWindow.SpeechRecognition||browserWindow.webkitSpeechRecognition)})},0);return()=>{clearTimeout(timer);recordingRef.current=false;recognitionRef.current?.abort();streamRef.current?.getTracks().forEach(track=>track.stop());if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current)}},[]);
  useEffect(()=>{if(!recording||paused)return;const timer=setInterval(()=>setSeconds(value=>value+1),1000);return()=>clearInterval(timer)},[recording,paused]);
  const stop=()=>{recordingRef.current=false;pausedRef.current=false;try{recognitionRef.current?.stop()}catch{}if(recorderRef.current&&recorderRef.current.state!=="inactive")recorderRef.current.stop();streamRef.current?.getTracks().forEach(track=>track.stop());setRecording(false);setPaused(false);setInterim("")};
  const start=async()=>{setError("");setAudioBlob(null);setSeconds(0);if(!supported.recording){setError("Audio recording is not available in this browser.");return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});streamRef.current=stream;const mime=["audio/webm;codecs=opus","audio/mp4","audio/webm"].find(type=>MediaRecorder.isTypeSupported(type));const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);recorderRef.current=recorder;chunksRef.current=[];recorder.ondataavailable=event=>{if(event.data.size)chunksRef.current.push(event.data)};recorder.onstop=()=>{const blob=new Blob(chunksRef.current,{type:recorder.mimeType||"audio/webm"});setAudioBlob(blob);if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current);const url=URL.createObjectURL(blob);audioUrlRef.current=url;setAudioUrl(url)};
      if(supported.transcription){const browserWindow=window as Window&{SpeechRecognition?:SpeechRecognitionCtor;webkitSpeechRecognition?:SpeechRecognitionCtor};const Recognition=browserWindow.SpeechRecognition||browserWindow.webkitSpeechRecognition;if(Recognition){const recognition=new Recognition();recognition.continuous=true;recognition.interimResults=true;recognition.lang="en-US";recognition.onresult=event=>{let finalText="";let interimText="";for(let i=event.resultIndex;i<event.results.length;i+=1){const result=event.results[i];if(result.isFinal)finalText+=`${result[0].transcript} `;else interimText+=result[0].transcript}if(finalText)setTranscript(value=>`${value}${value&& !value.endsWith(" ")?" ":""}${finalText}`);setInterim(interimText)};recognition.onerror=event=>{if(event.error!=="no-speech")setError(`Transcription paused: ${event.error.replaceAll("-"," ")}. You can keep recording and edit the notes.`)};recognition.onend=()=>{if(recordingRef.current&&!pausedRef.current){try{recognition.start()}catch{}}};recognitionRef.current=recognition;recognition.start()}}
      recorder.start(1000);recordingRef.current=true;pausedRef.current=false;setRecording(true);setPaused(false)
    }catch(reason){streamRef.current?.getTracks().forEach(track=>track.stop());setError(reason instanceof Error&&reason.name==="NotAllowedError"?"Microphone access was not allowed. You can still paste lecture notes instead.":"Learnade could not start the microphone. Check that it is connected and try again.")}};
  const togglePause=()=>{const recorder=recorderRef.current;if(!recorder)return;if(paused){recorder.resume();pausedRef.current=false;try{recognitionRef.current?.start()}catch{}setPaused(false)}else{recorder.pause();pausedRef.current=true;try{recognitionRef.current?.stop()}catch{}setPaused(true)}};
  const save=async()=>{if(transcript.trim().length<40){setError("Add a little more transcript before saving this lecture.");return}if(courseId==="new"&&courseName.trim().length<2){setError("Name the course this lecture belongs to.");return}setSaving(true);setError("");try{await onSave(transcript,courseId==="new"?courseName:courses.find(course=>course.id===courseId)?.title||courseName,lectureTitle,courseId==="new"?undefined:courseId,audioBlob?{blob:audioBlob,durationMs:seconds*1000}:undefined)}catch{setSaving(false);setError("The lecture could not be saved. Check available browser storage and try again.")}};
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="recorder-title"><div className="modal recorder-modal"><button className="modal-close" onClick={()=>{stop();onClose()}} aria-label="Close">×</button><span className="eyebrow">LECTURE CAPTURE</span><h2 id="recorder-title">Record and transcribe</h2><p>Turn a live lecture into searchable course material, flashcards, and quizzes.</p><div className="privacy-note"><strong>Before you record</strong><span>Get permission from the instructor and people nearby. Audio is saved on this device. Live transcription may be processed by your browser’s speech service.</span></div><label className="field"><span>Add to course</span><select value={courseId} onChange={event=>setCourseId(event.target.value)}>{courses.map(course=><option value={course.id} key={course.id}>{course.title}</option>)}<option value="new">＋ New course</option></select></label>{courseId==="new"&&<label className="field"><span>New course name</span><input value={courseName} onChange={event=>setCourseName(event.target.value)} placeholder="e.g. Calculus I" /></label>}<label className="field"><span>Lecture title</span><input value={lectureTitle} onChange={event=>setLectureTitle(event.target.value)} /></label><div className={`recorder-console ${recording?"recording":""}`}><span className="record-light" aria-hidden="true" /><strong>{recording?(paused?"Recording paused":"Recording lecture"):audioBlob?"Recording complete":"Ready to record"}</strong><time>{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</time><div className="recorder-buttons">{!recording?<button className="primary" onClick={start} disabled={!supported.recording}>● Start recording</button>:<><button className="secondary" onClick={togglePause}>{paused?"Resume":"Pause"}</button><button className="primary stop-button" onClick={stop}>■ Stop</button></>}</div>{!supported.transcription&&<small>Automatic transcription is unavailable here. Recording still works; add or paste notes below before saving.</small>}</div>{audioUrl&&<audio className="audio-preview" controls src={audioUrl}>Your browser cannot play this recording.</audio>}<label className="field"><span>Live transcript — editable</span><textarea className="transcript-area" value={`${transcript}${interim?`${transcript?" ":""}${interim}`:""}`} onChange={event=>{setTranscript(event.target.value);setInterim("")}} rows={8} placeholder="Your live transcript will appear here. You can also type or paste notes." /></label>{error&&<p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary" disabled={saving} onClick={()=>{stop();onClose()}}>Cancel</button><button className="primary" disabled={recording||saving} onClick={save}>{saving?"Building study materials…":"Save lecture to course →"}</button></div></div></div>;
}

function AudioPlayer({audioId}:{audioId:string}) { const [url,setUrl]=useState("");const [error,setError]=useState("");useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);const load=async()=>{try{const blob=await loadLectureAudio(audioId);if(!blob){setError("Recording unavailable");return}if(url)URL.revokeObjectURL(url);setUrl(URL.createObjectURL(blob))}catch{setError("Recording unavailable")}};return url?<audio className="material-audio" controls src={url}>Your browser cannot play this recording.</audio>:<button className="source-link" onClick={load}>{error||"Play recording"}</button> }

function ManageCourseModal({course,onClose,onRename,onDeleteMaterial,onAddMaterial,onRecord}:{course:SavedCourse;onClose:()=>void;onRename:(id:string,name:string)=>Promise<void>;onDeleteMaterial:(courseId:string,materialId:string)=>Promise<void>;onAddMaterial:()=>void;onRecord:()=>void}) { const [name,setName]=useState(course.title);const [saving,setSaving]=useState(false);const saveName=async()=>{setSaving(true);await onRename(course.id,name);setSaving(false)};return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="manage-title"><div className="modal manage-modal"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><span className="eyebrow">COURSE SETTINGS</span><h2 id="manage-title">Manage {course.title}</h2><div className="rename-row"><label className="field"><span>Course name</span><input value={name} onChange={event=>setName(event.target.value)} /></label><button className="secondary" disabled={saving||name.trim()===course.title} onClick={saveName}>{saving?"Saving…":"Rename"}</button></div><div className="manager-actions"><button className="primary" onClick={onAddMaterial}>＋ Add material</button><button className="secondary" onClick={onRecord}>● Record lecture</button></div><div className="material-list"><span className="eyebrow">{course.materials.length} SAVED {course.materials.length===1?"ITEM":"ITEMS"}</span>{course.materials.map(material=><article key={material.id}><div className="material-kind" aria-hidden="true">{material.kind==="lecture"?"●":"▤"}</div><div><strong>{material.title}</strong><span>{material.kind} · {new Date(material.createdAt).toLocaleDateString()} · {material.source.split(/\s+/).length.toLocaleString()} words</span>{material.audio&&<AudioPlayer audioId={material.audio.id}/>}</div><button className="remove-material" onClick={()=>void onDeleteMaterial(course.id,material.id)} aria-label={`Remove ${material.title}`}>Remove</button></article>)}</div></div></div> }

function StudyMode({ mode, theme, onToggleTheme, title, source, learningPackage, learnadeId, onChangeMode, onBack, onManage }: { mode: Mode; theme:Theme; onToggleTheme:()=>void; title: string; source: string; learningPackage:LearningPackage; learnadeId:string; onChangeMode:(mode:Mode)=>void; onBack: () => void; onManage:()=>void }) {
  const label = modes.find(m => m.id === mode)?.title || "Study";
  const [readerTarget,setReaderTarget]=useState<string|null>(null);
  return <main className="study-shell" data-theme={theme}>
    <header className="study-topbar"><button className="brand" onClick={onBack}><span className="brand-mark">L</span><span className="brand-name">Learnade</span></button><div><small>COURSE</small><strong>{title}</strong></div><span className="study-actions"><ThemeToggle theme={theme} onToggle={onToggleTheme}/><button className="secondary study-manage" onClick={onManage}>Manage course</button><button className="secondary" onClick={onBack}>Exit session</button></span></header>
    <div className="study-layout">
      <aside><button className="back-link" onClick={onBack}>← <span>All modes</span></button><span className="eyebrow">LEARNING MODE</span><h1>{label}</h1><p>Switch whenever your attention or energy changes.</p><div className="side-progress"><span>Ready to study</span><strong>{learningPackage.sections.length}</strong><span>source sections</span></div></aside>
      <section className="workspace">
        {mode === "plan" && <StudyPlan learningPackage={learningPackage} learnadeId={learnadeId} onNavigate={onChangeMode} onReview={(id)=>{setReaderTarget(id);onChangeMode("reader")}} />}
        {mode === "reader" && <Reader learningPackage={learningPackage} title={title} target={readerTarget} />}
        {mode === "speed" && <SpeedReader source={source} />}
        {mode === "focus" && <FocusMode learningPackage={learningPackage} />}
        {mode === "brainrot" && <Brainrot source={learningPackage.narration} />}
        {mode === "guide" && <Guide learningPackage={learningPackage} onReview={(id)=>{setReaderTarget(id);onChangeMode("reader")}} />}
        {mode === "cards" && <Cards cards={learningPackage.flashcards} sections={learningPackage.sections} learnadeId={learnadeId} onReview={(id)=>{setReaderTarget(id);onChangeMode("reader")}} />}
        {mode === "quiz" && <Quiz questions={learningPackage.quiz} sections={learningPackage.sections} learnadeId={learnadeId} onReview={(id)=>{setReaderTarget(id);onChangeMode("reader")}} />}
      </section>
    </div>
  </main>;
}

function Reader({ learningPackage, title, target }: { learningPackage:LearningPackage; title:string; target:string|null }) {
  const [dyslexia, setDyslexia] = useState(false); const [size, setSize] = useState(19); const [focus, setFocus] = useState(false);
  useEffect(()=>{if(target) requestAnimationFrame(()=>document.getElementById(`reader-${target}`)?.scrollIntoView({behavior:"smooth",block:"center"}))},[target]);
  return <div className="reader-panel"><div className="tool-row"><button className={dyslexia ? "tool active" : "tool"} onClick={() => setDyslexia(!dyslexia)} aria-pressed={dyslexia}>OpenDyslexic font</button><button className={focus ? "tool active" : "tool"} onClick={() => setFocus(!focus)} aria-pressed={focus}>Line focus</button><label>Text size <input type="range" min="16" max="28" value={size} onChange={e => setSize(+e.target.value)} /></label></div><article className={`${dyslexia ? "dyslexia" : ""} ${focus ? "line-focus" : ""}`} style={{fontSize: size}}><span className="eyebrow">SOURCE READER</span><h2>{title}</h2>{learningPackage.sections.map(section=><section id={`reader-${section.id}`} className={target===section.id?"source-highlight":""} key={section.id}><h3>{section.title}</h3>{section.sentences.map((sentence,i)=><p tabIndex={focus?0:undefined} key={i}>{sentence}</p>)}</section>)}</article></div>;
}

function SpeedReader({ source }: { source: string }) {
  const words = useMemo(() => source.trim().split(/\s+/).filter(Boolean), [source]); const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false); const [wpm, setWpm] = useState(300);
  useEffect(() => { if (!playing) return; const current=words[index]||""; const pause=/[.!?]$/.test(current)?1.8:/[,;:]$/.test(current)?1.35:Math.max(1,current.length/9); const timer=setTimeout(()=>setIndex(i=>{if(i>=words.length-1){setPlaying(false);return i}return i+1}),60000/wpm*pause); return()=>clearTimeout(timer); }, [playing, wpm, words, index]);
  const word = words[index] || "Ready"; const pivot = Math.floor(word.length * .4);
  return <div className="speed-panel"><span className="eyebrow">RAPID SERIAL VISUAL PRESENTATION</span><div className="speed-word">{word.slice(0,pivot)}<em>{word[pivot]}</em>{word.slice(pivot+1)}</div><div className="speed-line" role="progressbar" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={index+1}><i style={{width: `${((index+1) / words.length) * 100}%`}} /></div><div className="speed-controls"><button onClick={() => setIndex(Math.max(0,index-10))}>↶ 10</button><button className="play" onClick={() => {if(!playing&&index===words.length-1)setIndex(0);setPlaying(!playing)}} aria-label={playing ? "Pause speed reader" : index===words.length-1?"Replay speed reader":"Play speed reader"}>{playing ? <PauseIcon /> : <PlayIcon />}</button><button onClick={() => setIndex(Math.min(words.length-1,index+10))}>10 ↷</button></div><label className="wpm">{wpm} words per minute<input type="range" min="100" max="700" step="25" value={wpm} onChange={e => setWpm(+e.target.value)} /></label><p className="calm-note">Start at a pace that feels comfortable. Comprehension matters more than speed.</p></div>;
}

function FocusMode({learningPackage}:{learningPackage:LearningPackage}) {
  const [seconds, setSeconds] = useState(12 * 60); const [running, setRunning] = useState(false); const [done, setDone] = useState<boolean[]>([false,false,false]);
  const [brokenDown, setBrokenDown] = useState(false);
  useEffect(() => { if (!running) return; const t=setInterval(()=>setSeconds(s=>{if(s<=1){setRunning(false);return 0}return s-1}),1000); return()=>clearInterval(t); }, [running]);
  const firstSection=learningPackage.sections[0]?.title || "the opening section";
  const tasks = brokenDown ? [`Read the first paragraph about ${firstSection.toLowerCase()}`, "Write down one idea in your own words", `Review ${Math.min(3,learningPackage.keyTerms.length)} key terms`] : [`Read the summary of ${firstSection.toLowerCase()}`, `Review ${learningPackage.keyTerms.length} key terms`, `Answer ${learningPackage.quiz.length} practice questions`];
  const breakItDown = () => { setBrokenDown(true); setDone([false,false,false]); };
  return <div className="focus-panel"><span className="eyebrow">ONE SMALL STEP AT A TIME</span><h2>Your 12-minute focus session</h2><p>Everything else can wait. You only need to do the next thing.</p><div className="timer" role="timer" aria-label={`${Math.floor(seconds/60)} minutes ${seconds%60} seconds remaining`}>{String(Math.floor(seconds/60)).padStart(2,"0")}<i>:</i>{String(seconds%60).padStart(2,"0")}</div><button className="primary focus-start" onClick={() => {if(seconds===0)setSeconds(12*60);setRunning(!running)}}>{running ? <><PauseIcon /> Pause gently</> : <><PlayIcon /> {seconds===0?"Start another session":"Start focus session"}</>}</button><div className="task-list" aria-live="polite">{tasks.map((task,i) => <button className={done[i] ? "done" : ""} key={task} onClick={() => setDone(d => d.map((v,j) => j === i ? !v : v))}><span>{done[i] ? "✓" : i+1}</span><strong>{task}</strong><small>{brokenDown ? [2,2,3][i] : [3,4,5][i]} min</small></button>)}</div>{brokenDown && <p className="microcopy" role="status">Done. We made the next step smaller and removed the pressure to finish everything at once.</p>}<button className="text-button" onClick={breakItDown} disabled={brokenDown}>{brokenDown ? "This is the smallest useful starting point" : "I’m stuck — help me make this smaller"}</button></div>;
}

function Brainrot({ source }: { source: string }) {
  const [speaking,setSpeaking]=useState(false); const [speechSupported,setSpeechSupported]=useState(true); const run=useRef(0);
  const [visual,setVisual]=useState<"minecraft"|"subway">("minecraft"); const [videoPlaying,setVideoPlaying]=useState(false);
  const narrationSentences=useMemo(()=>source.split(/(?<=[.!?])\s+/).map(v=>v.trim()).filter(Boolean),[source]);
  const [sentenceIndex,setSentenceIndex]=useState(0); const [rate,setRate]=useState(1.05); const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]); const [voiceName,setVoiceName]=useState("");
  useEffect(()=>{let subscribed=false;const load=()=>{const available=window.speechSynthesis.getVoices();setVoices(available);setVoiceName(current=>current||available.find(v=>v.lang.startsWith("en"))?.name||available[0]?.name||"")};const timer=window.setTimeout(()=>{setVideoPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);if(!("speechSynthesis" in window)||!("SpeechSynthesisUtterance" in window)){setSpeechSupported(false);return}load();window.speechSynthesis.addEventListener("voiceschanged",load);subscribed=true},0);return()=>{clearTimeout(timer);run.current+=1;if("speechSynthesis" in window){window.speechSynthesis.cancel();if(subscribed)window.speechSynthesis.removeEventListener("voiceschanged",load)}}},[]);
  const speakFrom=(start:number,runId=run.current+1)=>{if(!speechSupported||!narrationSentences[start])return;run.current=runId;window.speechSynthesis.cancel();setSentenceIndex(start);const utterance=new SpeechSynthesisUtterance(narrationSentences[start]);utterance.rate=rate;utterance.voice=voices.find(v=>v.name===voiceName)||null;utterance.onend=()=>{if(run.current!==runId)return;if(start+1<narrationSentences.length)speakFrom(start+1,runId);else setSpeaking(false)};utterance.onerror=()=>{if(run.current===runId)setSpeaking(false)};window.speechSynthesis.speak(utterance);setSpeaking(true)};
  const toggle=()=>{if(!speechSupported)return;if(speaking){run.current+=1;window.speechSynthesis.cancel();setSpeaking(false)}else speakFrom(sentenceIndex)};
  const skip=(amount:number)=>{const next=Math.max(0,Math.min(narrationSentences.length-1,sentenceIndex+amount));if(speaking){run.current+=1;speakFrom(next)}else setSentenceIndex(next)};
  const videoId=visual==="minecraft"?"XBIaqOm0RKQ":"QPW3XwBoQlw";
  return <div className="brainrot-panel"><div className="visual-picker" aria-label="Choose background gameplay"><button className={visual==="minecraft"?"active":""} onClick={()=>setVisual("minecraft")}>Minecraft parkour</button><button className={visual==="subway"?"active":""} onClick={()=>setVisual("subway")}>Subway Surfers</button><button onClick={()=>setVideoPlaying(v=>!v)}>{videoPlaying?"Pause visual":"Play visual"}</button></div><div className="brain-visual"><iframe key={`${videoId}-${videoPlaying}`} src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${videoPlaying?1:0}&mute=1&controls=1&loop=1&playlist=${videoId}&modestbranding=1&rel=0`} title={visual==="minecraft"?"Minecraft parkour visual focus gameplay":"Subway Surfers visual focus gameplay"} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" /><div className="video-shade" /><div className="video-label">VISUAL FOCUS · {visual==="minecraft"?"MINECRAFT PARKOUR":"SUBWAY SURFERS"}</div></div><div className="caption" aria-live="polite"><span className="eyebrow">NOW EXPLAINING · {sentenceIndex+1} OF {narrationSentences.length}</span><p>{narrationSentences[sentenceIndex]||"No narration is available."}</p></div><div className="brain-controls"><button onClick={()=>skip(-1)} aria-label="Previous narration segment">←</button><button className="play" disabled={!speechSupported} onClick={toggle} aria-label={speaking?"Pause narration":"Play narration"}>{speaking?<PauseIcon/>:<PlayIcon/>}</button><button onClick={()=>skip(1)} aria-label="Next narration segment">→</button><span>{!speechSupported?"Voice narration is not supported by this browser.":speaking?"Narrating with captions":"Ready to listen"}</span></div>{speechSupported&&<div className="voice-controls"><label>Voice<select value={voiceName} onChange={e=>setVoiceName(e.target.value)}>{voices.filter(v=>v.lang.startsWith("en")).map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select></label><label>Speed<select value={rate} onChange={e=>setRate(Number(e.target.value))}><option value={0.8}>0.8×</option><option value={1.05}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></label></div>}<p className="calm-note">Voice is generated on your device. {visual==="minecraft"?<><a href="https://www.youtube.com/watch?v=XBIaqOm0RKQ" target="_blank" rel="noreferrer">Minecraft gameplay by GameplaysForFree</a>, licensed <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</>:<><a href="https://www.youtube.com/watch?v=QPW3XwBoQlw" target="_blank" rel="noreferrer">Subway Surfers gameplay</a> is marked free to use by its creator.</>}</p></div>;
}

function Guide({learningPackage,onReview}:{learningPackage:LearningPackage;onReview:(id:string)=>void}) { const [open,setOpen]=useState<string | null>(learningPackage.sections[0]?.id||null); return <div className="guide"><span className="eyebrow">SOURCE-BUILT STUDY GUIDE</span><h2>{learningPackage.title} at a glance</h2><p className="guide-intro">Built privately on this device. Select a section to expand it and trace every point back to the source.</p><div className="overview-box"><strong>Overview</strong><p>{learningPackage.overview}</p></div><div className="guide-grid">{learningPackage.sections.map((item,index) => <section className={open===item.id ? "open" : ""} key={item.id}><button onClick={() => setOpen(open===item.id ? null : item.id)} aria-expanded={open===item.id}><span>{String(index+1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.sentences[0]}</p><b>{open===item.id ? "−" : "+"}</b></button>{open===item.id && <div className="guide-detail"><p>{item.text}</p><button className="source-link" onClick={()=>onReview(item.id)}>Review exact source →</button></div>}</section>)}</div><div className="key-term-list"><span className="eyebrow">KEY TERMS FROM YOUR SOURCE</span>{learningPackage.keyTerms.map(term=><article key={term.term}><strong>{term.term}</strong><p>{term.definition}</p><button className="source-link" onClick={()=>onReview(term.sourceSection)}>View supporting passage →</button></article>)}</div></div>; }

function Cards({cards,sections,learnadeId,onReview}:{cards:LearningPackage["flashcards"];sections:LearningPackage["sections"];learnadeId:string;onReview:(id:string)=>void}) {
  const storageKey=`learnade-card-srs-${learnadeId}`;
  const allIds=useMemo(()=>cards.map(card=>card.id),[cards]);
  const [queue,setQueue]=useState<string[]>(allIds); const [reviews,setReviews]=useState<Record<string,CardReview>>({}); const [flip,setFlip]=useState(false); const [status,setStatus]=useState(""); const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>{try{const parsed=JSON.parse(localStorage.getItem(storageKey)||"{}") as Record<string,CardReview>;const clean=Object.fromEntries(Object.entries(parsed).filter(([id,value])=>allIds.includes(id)&&value?.dueAt));const now=Date.now();setReviews(clean);setQueue(allIds.filter(id=>!clean[id]||Date.parse(clean[id].dueAt)<=now))}catch{setQueue(allIds)}finally{setHydrated(true)}},0);return()=>clearTimeout(timer)},[storageKey,allIds]);
  useEffect(()=>{if(hydrated)localStorage.setItem(storageKey,JSON.stringify(reviews))},[reviews,storageKey,hydrated]);
  const currentId=queue[0]; const current=cards.find(card=>card.id===currentId);
  const applyReview=(result:"again"|"known")=>{if(!currentId)return;const next=scheduleCard(reviews[currentId],result);setReviews(value=>({...value,[currentId]:next}));setQueue(q=>result==="again"?(q.length>1?[...q.slice(1),q[0]]:q):q.slice(1));setFlip(false);setStatus(result==="again"?"This card will return before the session ends.":`Scheduled again in ${next.intervalDays} day${next.intervalDays===1?"":"s"}.`)};
  const learned=allIds.filter(id=>(reviews[id]?.intervalDays||0)>0).length;
  const nextDue=Object.values(reviews).map(value=>Date.parse(value.dueAt)).filter(Number.isFinite).sort((a,b)=>a-b)[0];
  const section=sections.find(item=>item.id===current?.sourceSection);
  if (!current) return <div className="cards-panel card-complete"><span className="completion-mark">✓</span><h2>You’re caught up.</h2><p>{learned} of {cards.length} cards are in spaced review.{nextDue?` Next review: ${new Date(nextDue).toLocaleDateString()}.`:""}</p><button className="primary" onClick={()=>setQueue(allIds)}>Review the full deck now</button></div>;
  return <div className="cards-panel"><div className="stack-status"><span>Due now <strong>{queue.length}</strong></span><span>In spaced review <strong>{learned}</strong></span></div><span className="eyebrow">CURRENT REVIEW CARD</span><button className={`flashcard ${flip ? "flipped" : ""}`} onClick={() => setFlip(!flip)}><small>{flip ? "ANSWER" : "QUESTION"}</small><strong>{flip?current.back:current.front}</strong><span>Click to {flip ? "see question" : "reveal answer"}</span></button>{flip&&section&&<div className="source-proof"><span className="eyebrow">SUPPORTED BY YOUR SOURCE</span><p>“{sourceEvidence(section,current.front,current.back)}”</p><button className="source-link" onClick={()=>onReview(section.id)}>Open source passage →</button></div>}<div className="card-actions"><button onClick={()=>applyReview("again")}>↻ Not yet</button><button className="primary" onClick={()=>applyReview("known")}>Got it ✓</button></div><p className="microcopy" aria-live="polite">{status}</p></div>;
}

function Quiz({questions,sections,learnadeId,onReview}:{questions:LearningPackage["quiz"];sections:LearningPackage["sections"];learnadeId:string;onReview:(id:string)=>void}) {
  const [index,setIndex]=useState(0); const [selected,setSelected]=useState<number | null>(null); const [score,setScore]=useState(0); const [complete,setComplete]=useState(false); const question=questions[index];
  const choose=(choice:number)=>{ if(selected!==null)return; const correct=choice===question.answer;setSelected(choice);if(correct)setScore(s=>s+1);try{const key=`learnade-mastery-${learnadeId}`;const current=JSON.parse(localStorage.getItem(key)||"{}") as SectionMastery;localStorage.setItem(key,JSON.stringify(recordAnswer(current,question.sourceSection,correct)))}catch{} };
  const next=()=>{ if(index===questions.length-1){setComplete(true);localStorage.setItem(`learnade-quiz-${learnadeId}`,JSON.stringify({score,total:questions.length,date:new Date().toISOString()}));return;} setIndex(i=>i+1);setSelected(null); };
  const restart=()=>{setIndex(0);setSelected(null);setScore(0);setComplete(false);};
  if(!question)return <div className="quiz-panel quiz-results"><span className="completion-mark">!</span><h2>Not enough source material yet.</h2><p>Add more text to generate practice questions.</p></div>;
  if(complete)return <div className="quiz-panel quiz-results"><span className="completion-mark">{score>=Math.ceil(questions.length*.8)?"✓":"↻"}</span><span className="eyebrow">QUIZ COMPLETE</span><h2>{score} out of {questions.length}</h2><p>{score>=Math.ceil(questions.length*.8)?"Strong work. You have a solid grasp of the material.":"Good start. Another pass will strengthen the concepts that are still forming."}</p><button className="primary" onClick={restart}>Try the quiz again</button></div>;
  const section=sections.find(item=>item.id===question.sourceSection);
  return <div className="quiz-panel"><div className="quiz-progress"><i style={{width:`${((index+1)/questions.length)*100}%`}} /></div><span className="eyebrow">QUESTION {index+1} OF {questions.length} · FROM YOUR SOURCE</span><h2>{question.prompt}</h2>{question.options.map((v,i) => {const correct=selected!==null&&i===question.answer;const wrong=selected===i&&i!==question.answer;return <button disabled={selected!==null} aria-label={`${v}${correct?", correct answer":wrong?", your selection, incorrect":""}`} className={`answer ${correct?"correct":""} ${wrong?"incorrect":""}`} key={v} onClick={() => choose(i)}><span>{String.fromCharCode(65+i)}</span>{v}{correct&&<em className="answer-state">✓ Correct</em>}{wrong&&<em className="answer-state">✕ Try again</em>}</button>})}{selected!==null && <div className="feedback"><strong>{selected===question.answer?"Exactly right.":"Not quite—here’s the connection."}</strong><p>{question.explanation}</p>{section&&<div className="source-proof compact"><span className="eyebrow">SOURCE EVIDENCE</span><p>“{sourceEvidence(section,question.options[question.answer],question.explanation)}”</p><button className="source-link" onClick={()=>onReview(section.id)}>Review in source →</button></div>}<button className="primary" onClick={next}>{index===questions.length-1?"See my results":"Next question →"}</button></div>}</div>;
}

function StudyPlan({learningPackage,learnadeId,onNavigate,onReview}:{learningPackage:LearningPackage;learnadeId:string;onNavigate:(mode:Mode)=>void;onReview:(id:string)=>void}) {
  const questions=learningPackage.quiz.slice(0,Math.min(5,learningPackage.quiz.length));
  const storageKey=`learnade-diagnostic-${learnadeId}`;
  const [index,setIndex]=useState(0);const [selected,setSelected]=useState<number|null>(null);const [answers,setAnswers]=useState<Array<{sectionId:string;correct:boolean}>>([]);const [complete,setComplete]=useState(false);const [mastery,setMastery]=useState<SectionMastery>({});
  useEffect(()=>{const timer=setTimeout(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved?.answers){setAnswers(saved.answers);setComplete(true)}setMastery(JSON.parse(localStorage.getItem(`learnade-mastery-${learnadeId}`)||"{}"))}catch{}},0);return()=>clearTimeout(timer)},[storageKey,learnadeId]);
  const question=questions[index];
  const choose=(choice:number)=>{if(selected!==null||!question)return;setSelected(choice)};
  const next=()=>{if(selected===null||!question)return;const result={sectionId:question.sourceSection,correct:selected===question.answer};const nextAnswers=[...answers,result];try{const masteryKey=`learnade-mastery-${learnadeId}`;const current=JSON.parse(localStorage.getItem(masteryKey)||"{}") as SectionMastery;const updated=recordAnswer(current,result.sectionId,result.correct);localStorage.setItem(masteryKey,JSON.stringify(updated));setMastery(updated)}catch{}if(index===questions.length-1){setAnswers(nextAnswers);setComplete(true);localStorage.setItem(storageKey,JSON.stringify({answers:nextAnswers,date:new Date().toISOString()}));return}setAnswers(nextAnswers);setIndex(value=>value+1);setSelected(null)};
  const reset=()=>{setAnswers([]);setIndex(0);setSelected(null);setComplete(false);localStorage.removeItem(storageKey)};
  const weakIds=[...new Set(answers.filter(answer=>!answer.correct).map(answer=>answer.sectionId))];
  const score=answers.filter(answer=>answer.correct).length;
  const overall=masteryPercent(mastery,learningPackage.sections.map(section=>section.id));
  if(!questions.length)return <div className="plan-panel"><span className="eyebrow">PERSONAL STUDY PLAN</span><h2>Add more material to build your diagnostic.</h2><button className="primary" onClick={()=>onNavigate("reader")}>Start with the reader</button></div>;
  if(complete)return <div className="plan-panel"><span className="eyebrow">YOUR PERSONAL STUDY PLAN</span><div className="mastery-hero"><div><strong>{Math.round((score/questions.length)*100)}%</strong><span>diagnostic score</span></div><div><strong>{overall}%</strong><span>long-term mastery</span></div></div><h2>{weakIds.length?"We found the best place to focus.":"Strong start—let’s make it stick."}</h2><p className="guide-intro">Your plan uses your diagnostic and saved practice history. It updates as you answer questions and review cards.</p><div className="plan-steps"><button onClick={()=>weakIds[0]?onReview(weakIds[0]):onNavigate("guide")}><span>1</span><div><small>4 MIN</small><strong>{weakIds.length?`Review ${learningPackage.sections.find(section=>section.id===weakIds[0])?.title||"your weakest concept"}`:"Review the study guide"}</strong><p>Read the exact source passage behind the concept.</p></div><b>→</b></button><button onClick={()=>onNavigate("cards")}><span>2</span><div><small>4 MIN</small><strong>Practice today’s due cards</strong><p>Missed cards return; known cards space themselves out.</p></div><b>→</b></button><button onClick={()=>onNavigate("quiz")}><span>3</span><div><small>4 MIN</small><strong>Check your understanding</strong><p>Your answers update mastery by source section.</p></div><b>→</b></button></div><button className="text-button" onClick={reset}>Retake diagnostic</button></div>;
  return <div className="plan-panel diagnostic"><span className="eyebrow">60-SECOND KNOWLEDGE CHECK</span><h2>Let’s find your best starting point.</h2><p className="guide-intro">This is not a grade. It only shapes the study plan.</p><div className="quiz-progress"><i style={{width:`${((index+1)/questions.length)*100}%`}} /></div><span className="eyebrow">QUESTION {index+1} OF {questions.length}</span><h3>{question.prompt}</h3>{question.options.map((option,i)=><button key={option} className={`answer ${selected===i?"selected":""}`} onClick={()=>choose(i)} aria-pressed={selected===i}><span>{String.fromCharCode(65+i)}</span>{option}</button>)}<button className="primary diagnostic-next" disabled={selected===null} onClick={next}>{index===questions.length-1?"Build my study plan →":"Next →"}</button></div>;
}
