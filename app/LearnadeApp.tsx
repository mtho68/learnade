"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource/opendyslexic/400.css";
import { extractDocument } from "../lib/extractDocument";
import { generateLocalLearningPackage, type LearningPackage } from "../lib/localLearning";
import { generateWithBrowserAI } from "../lib/browserAI";
import { deleteLectureAudio, deleteLibraryItem, loadLectureAudio, loadLibrary, saveLectureAudio, saveLibraryItem } from "../lib/storage";
import { masteryPercent, recordAnswer, scheduleCard, type CardReview, type SectionMastery } from "../lib/mastery";
import { addCourseMaterial, combineCourseMaterials, courseSource, normalizeCourse, removeCourseMaterial, renameCourse, type CourseMaterial, type MaterialKind, type SavedCourse } from "../lib/courseLibrary";
import { buildMockExam, gradeMockExam, type MockExam as MockExamData } from "../lib/mockExam";
import { buildDashboardSnapshot, type AttemptSummary, type DashboardSnapshot } from "../lib/courseDashboard";
import { createDemoCourse, DEMO_COURSES, SAMPLE_COURSE_ID } from "../lib/sampleCourse";

type Mode = "home" | "dashboard" | "plan" | "reader" | "speed" | "focus" | "brainrot" | "guide" | "cards" | "quiz" | "exam";
type Theme = "light" | "dark";

const sampleText = `Choose one of the ready-made demos or create a course from your own material to begin studying.`;

function PlayIcon() { return <span className="media-icon play-icon" aria-hidden="true" />; }
function PauseIcon() { return <span className="media-icon pause-icon" aria-hidden="true"><i /><i /></span>; }
function ThemeToggle({theme,onToggle}:{theme:Theme;onToggle:()=>void}) { return <button className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} aria-pressed={theme==="dark"}><span aria-hidden="true">{theme==="light"?"☾":"☀"}</span><span>{theme==="light"?"Dark":"Light"}</span></button>; }
function sourceEvidence(section:LearningPackage["sections"][number],...values:string[]) { const tokens=new Set(values.join(" ").toLowerCase().match(/[a-z][a-z-]{3,}/g)||[]);return [...section.sentences].sort((a,b)=>[...tokens].filter(token=>b.toLowerCase().includes(token)).length-[...tokens].filter(token=>a.toLowerCase().includes(token)).length)[0]||section.text; }
type SpeechResultEvent={resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>};
type SpeechRecognitionLike={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;stop:()=>void;abort:()=>void;onresult:((event:SpeechResultEvent)=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null};
type SpeechRecognitionCtor=new()=>SpeechRecognitionLike;

const modes = [
  { id: "dashboard", icon: "◫", title: "Course Dashboard", text: "See mastery, ready reviews, weak concepts, and your next step." },
  { id: "plan", icon: "◎", title: "My Study Plan", text: "Start with a quick check and focus on what needs work." },
  { id: "reader", icon: "Aa", title: "Accessible Reader", text: "Tune type, spacing, color, and focus to fit your eyes." },
  { id: "speed", icon: "▶", title: "Speed Reader", text: "Read one perfectly centered word at a time." },
  { id: "brainrot", icon: "✦", title: "Brainrot Mode", text: "Listen and follow captions with a calm visual loop." },
  { id: "focus", icon: "◷", title: "Focus Session", text: "Turn studying into one small, doable step at a time." },
  { id: "guide", icon: "≡", title: "Study Guide", text: "Get the objectives, concepts, and likely test material." },
  { id: "cards", icon: "▱", title: "Flashcards", text: "Practice key ideas and revisit what is not sticking." },
  { id: "quiz", icon: "✓", title: "Practice Quiz", text: "Check understanding with feedback, not judgment." },
  { id: "exam", icon: "✎", title: "Mock Exam", text: "Build a timed exam from the course materials you choose." },
] as const;

const tourSteps = [
  { target:"[data-tour='welcome']", eyebrow:"WELCOME TO LEARNADE", title:"One course, many ways to learn.", text:"Learnade turns the same class material into study experiences that fit the way you want to learn today." },
  { target:"[data-tour='course-dashboard']", eyebrow:"ADAPTIVE LEARNING", title:"Learnade learns from how you study.", text:"It remembers results from diagnostics, flashcards, quizzes, and mock exams. That progress shapes your recommendations, returns weak concepts, and schedules cards for review." },
  { target:"[data-tour='study-plan']", eyebrow:"PERSONALIZED PLAN", title:"Begin with a quick check, then follow a focused plan.", text:"My Study Plan identifies the concepts that need attention and gives you a manageable place to begin." },
  { target:"[data-tour='accessible-reader']", eyebrow:"READ YOUR WAY", title:"Adjust reading instead of forcing your way through it.", text:"Accessible Reader lets you tune type, spacing, contrast, and line focus. It is there whenever dense text makes starting harder." },
  { target:"[data-tour='speed-reader']", eyebrow:"SPEED READER", title:"Keep your eyes in one place.", text:"Speed Reader shows one centered word at a time, with a pace you control. Use it for a fast pass through material after you understand the basics." },
  { target:"[data-tour='brainrot']", eyebrow:"DUAL-STIMULATION MODE", title:"Listen with a visual anchor.", text:"Brainrot Mode combines narration, captions, and an optional visual loop. It is a flexible way to revisit material when listening helps you stay engaged." },
  { target:"[data-tour='focus-session']", eyebrow:"FOCUS SESSION", title:"Turn a big study task into small steps.", text:"Choose your time and energy, then work through one manageable chunk at a time with breaks and a clear restart point." },
  { target:"[data-tour='study-guide']", eyebrow:"STUDY GUIDE", title:"See the structure before you study the details.", text:"Use the guide to review objectives, key terms, relationships, and likely test material from the source itself." },
  { target:"[data-tour='flashcards']", eyebrow:"FLASHCARDS", title:"Practice what is not sticking yet.", text:"Mark a card Not Yet and it comes back sooner. Got it cards return later, so review time stays centered on what you need." },
  { target:"[data-tour='quiz']", eyebrow:"PRACTICE QUIZ", title:"Check understanding with explanations.", text:"Quiz results update concept mastery and point you back to the supporting source passage, not just a score." },
  { target:"[data-tour='mock-exam']", eyebrow:"MOCK EXAM", title:"Practice the test you are actually preparing for.", text:"Build an exam from selected course materials, review missed concepts, and retake only the areas that need another pass." },
  { target:"[data-tour='library']", eyebrow:"YOUR LIBRARY", title:"Keep every class in one place.", text:"Add readings, slides, notes, or lecture recordings to a course. Your material and progress stay on this device." },
] as const;

function GuidedTour({step,onBack,onNext,onSkip}:{step:number;onBack:()=>void;onNext:()=>void;onSkip:()=>void}) {
  const item=tourSteps[step];
  const last=step===tourSteps.length-1;
  const nextRef=useRef<HTMLButtonElement|null>(null);
  const [spotlight,setSpotlight]=useState<{top:number;left:number;width:number;height:number}|null>(null);
  useEffect(()=>{
    const target=document.querySelector<HTMLElement>(item.target);
    if(!target)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update=()=>{const rect=target.getBoundingClientRect();setSpotlight({top:Math.max(8,rect.top-8),left:Math.max(8,rect.left-8),width:Math.min(window.innerWidth-16,rect.width+16),height:Math.min(window.innerHeight-16,rect.height+16)});};
    target.scrollIntoView({behavior:reduced?"auto":"smooth",block:"center"});
    update();
    const timer=window.setTimeout(update,reduced?0:360);
    window.addEventListener("resize",update);
    window.addEventListener("scroll",update,true);
    return()=>{window.clearTimeout(timer);window.removeEventListener("resize",update);window.removeEventListener("scroll",update,true);};
  },[item.target]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>nextRef.current?.focus(),0);
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")onSkip();};
    document.addEventListener("keydown",escape);
    return()=>{window.clearTimeout(timer);document.removeEventListener("keydown",escape);};
  },[onSkip,step]);
  return <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description">
    {spotlight&&<div className="tour-spotlight" style={{top:spotlight.top,left:spotlight.left,width:spotlight.width,height:spotlight.height}} />}
    <section className="tour-card">
      <span className="eyebrow">{item.eyebrow}</span><span className="tour-count">{step+1} of {tourSteps.length}</span>
      <h2 id="tour-title">{item.title}</h2><p id="tour-description">{item.text}</p>
      <div className="tour-actions"><button className="text-button" onClick={onSkip}>Skip tour</button><span /><button className="secondary" onClick={onBack} disabled={step===0}>Back</button><button className="primary" ref={nextRef} onClick={onNext}>{last?"Finish":"Next"}</button></div>
    </section>
  </div>;
}

export default function LearnadeApp() {
  const [mode, setMode] = useState<Mode>("home");
  const [source, setSource] = useState(sampleText);
  const [title, setTitle] = useState("Choose a course to begin");
  const [learningPackage, setLearningPackage] = useState(() => generateLocalLearningPackage(sampleText, "Choose a course to begin"));
  const [library, setLibrary] = useState<SavedCourse[]>([]);
  const [activeId, setActiveId] = useState("demo");
  const [uploadTarget, setUploadTarget] = useState<{courseId?:string}|null>(null);
  const [recordTarget, setRecordTarget] = useState<{courseId?:string}|null>(null);
  const [manageCourseId, setManageCourseId] = useState<string|null>(null);
  const [saved, setSaved] = useState(true);
  const [libraryLoaded,setLibraryLoaded]=useState(false);
  const [theme,setTheme]=useState<Theme>("light");
  const [profileOpen,setProfileOpen]=useState(false);
  const [tourStep,setTourStep]=useState<number|null>(null);
  const profileRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{const timer=setTimeout(()=>{const stored=localStorage.getItem("learnade-theme");setTheme(stored==="dark"||(!stored&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light")},0);return()=>clearTimeout(timer)},[]);
  const toggleTheme=()=>setTheme(current=>{const next=current==="light"?"dark":"light";localStorage.setItem("learnade-theme",next);return next});

  useEffect(()=>{
    if(!profileOpen)return;
    const closeOutside=(event:MouseEvent)=>{if(!profileRef.current?.contains(event.target as Node))setProfileOpen(false)};
    const closeWithKeyboard=(event:KeyboardEvent)=>{if(event.key==="Escape")setProfileOpen(false)};
    document.addEventListener("mousedown",closeOutside);
    document.addEventListener("keydown",closeWithKeyboard);
    return()=>{document.removeEventListener("mousedown",closeOutside);document.removeEventListener("keydown",closeWithKeyboard)};
  },[profileOpen]);

  useEffect(() => {
    loadLibrary<SavedCourse>().then(async parsed => {
      if(!parsed.length){try{const legacy=JSON.parse(localStorage.getItem("learnade-library")||"[]") as SavedCourse[];if(Array.isArray(legacy)){parsed=legacy;localStorage.removeItem("learnade-library")}}catch{}}
      let normalized=parsed.map(normalizeCourse);
      if(!normalized.length&&localStorage.getItem("learnade-demo-library-seeded")!=="1"){
        const created=await Promise.all(DEMO_COURSES.map(demo=>createDemoCourse(demo.id)));
        normalized=created.map(normalizeCourse);
        await Promise.all(normalized.map(saveLibraryItem));
        localStorage.setItem("learnade-demo-library-seeded","1");
      }else{
        await Promise.all(normalized.map(saveLibraryItem));
      }
      const sorted=normalized.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); setLibrary(sorted); if(sorted[0]) { setSource(sorted[0].source); setTitle(sorted[0].title); setLearningPackage(sorted[0].package); setActiveId(sorted[0].id); }
    }).catch(()=>setSaved(false)).finally(()=>setLibraryLoaded(true));
  }, []);

  useEffect(()=>{
    if(!libraryLoaded||localStorage.getItem("learnade-tour-complete")==="2")return;
    const timer=window.setTimeout(()=>setTourStep(0),500);
    return()=>window.clearTimeout(timer);
  },[libraryLoaded]);

  const activateCourse=(item:SavedCourse,nextMode:Mode="dashboard")=>{setSource(item.source);setTitle(item.title);setLearningPackage(item.package);setActiveId(item.id);setMode(nextMode)};
  const persistCourse=async(item:SavedCourse,activate=true)=>{setSaved(false);setLibrary(items=>[item,...items.filter(course=>course.id!==item.id)].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));if(activate)activateCourse(item,"dashboard");await saveLibraryItem(item);setSaved(true)};
  const saveMaterial = async (value:string,courseTitle:string,materialTitle:string,kind:MaterialKind,generated?:LearningPackage,courseId?:string,audio?:{blob:Blob;durationMs:number}) => {
    const now=new Date().toISOString();const cleanMaterialTitle=materialTitle.trim()||"New material";
    const materialId=crypto.randomUUID();const audioId=audio?crypto.randomUUID():undefined;
    const material:CourseMaterial={id:materialId,title:cleanMaterialTitle,source:value,createdAt:now,kind,package:generated||generateLocalLearningPackage(value,cleanMaterialTitle),audio:audio&&audioId?{id:audioId,mimeType:audio.blob.type||"audio/webm",size:audio.blob.size,durationMs:audio.durationMs}:undefined};
    const existing=courseId?library.find(course=>course.id===courseId):undefined;
    const item=existing?addCourseMaterial(existing,material,now):{id:crypto.randomUUID(),title:courseTitle.trim()||cleanMaterialTitle,source:courseSource([material]),createdAt:now,updatedAt:now,materials:[material],package:combineCourseMaterials([material],courseTitle.trim()||cleanMaterialTitle)};
    try{if(audio&&audioId)await saveLectureAudio(audioId,audio.blob);localStorage.removeItem(`learnade-diagnostic-${item.id}`);await persistCourse(item)}catch(error){if(audioId)await deleteLectureAudio(audioId).catch(()=>{});throw error}
  };

  const openItem = (item:SavedCourse) => activateCourse(item);
  const deleteItem = async(id:string) => { if(!confirm("Delete this course and all of its saved material?")) return;const course=library.find(item=>item.id===id);setLibrary(items=>items.filter(item=>item.id!==id));["learnade-card-srs-","learnade-cards-","learnade-quiz-","learnade-exam-","learnade-mastery-","learnade-diagnostic-"].forEach(prefix=>localStorage.removeItem(`${prefix}${id}`));await Promise.all((course?.materials||[]).flatMap(material=>material.audio?[deleteLectureAudio(material.audio.id)]:[]));await deleteLibraryItem(id); };
  const updateCourseName=async(id:string,name:string)=>{const course=library.find(item=>item.id===id);if(!course)return;const updated=renameCourse(course,name);await persistCourse(updated,false);if(activeId===id){setTitle(updated.title);setLearningPackage(updated.package)}};
  const regenerateCourse=async(id:string)=>{const course=library.find(item=>item.id===id);if(!course)return;if(!confirm("Rebuild study guide, flashcards, quizzes, and exams from the saved sources? This keeps the sources but resets study progress."))return;const now=new Date().toISOString();const materials=course.materials.map(material=>({...material,package:generateLocalLearningPackage(material.source,material.title)}));const updated={...course,materials,source:courseSource(materials),package:combineCourseMaterials(materials,course.title),updatedAt:now};["learnade-card-srs-","learnade-custom-cards-","learnade-cards-","learnade-quiz-","learnade-exam-","learnade-mastery-","learnade-diagnostic-"].forEach(prefix=>localStorage.removeItem(`${prefix}${id}`));await persistCourse(updated,false);if(activeId===id){setSource(updated.source);setTitle(updated.title);setLearningPackage(updated.package)}};
  const deleteMaterial=async(courseId:string,materialId:string)=>{const course=library.find(item=>item.id===courseId);if(!course)return;if(course.materials.length===1){await deleteItem(courseId);setManageCourseId(null);return}if(!confirm("Remove this material from the course? Existing study progress for other materials will stay saved."))return;const material=course.materials.find(item=>item.id===materialId);const updated=removeCourseMaterial(course,materialId);if(material?.audio)await deleteLectureAudio(material.audio.id);localStorage.removeItem(`learnade-diagnostic-${courseId}`);await persistCourse(updated,false);if(activeId===courseId){setSource(updated.source);setTitle(updated.title);setLearningPackage(updated.package)}};
  const activeCourse=library.find(item=>item.id===activeId);
  const openDemo=async(demoId:string)=>{const existing=library.find(item=>item.id===demoId);if(existing){activateCourse(existing,"dashboard");return}try{const demo=await createDemoCourse(demoId);await persistCourse(demo,false);activateCourse(demo,"dashboard")}catch{setSaved(false)}};
  const openSample=()=>void openDemo(DEMO_COURSES[0].id);
  const openLibrary=()=>{setProfileOpen(false);requestAnimationFrame(()=>document.getElementById("library")?.scrollIntoView({behavior:"smooth"}))};
  const openProfileMode=(nextMode:Mode)=>{setProfileOpen(false);setMode(nextMode)};

  const finishTour=()=>{localStorage.setItem("learnade-tour-complete","2");setTourStep(null)};
  const startTour=()=>{setProfileOpen(false);setTourStep(0)};
  const advanceTour=()=>{if(tourStep===null)return;if(tourStep===tourSteps.length-1){finishTour();return;}setTourStep(tourStep+1)};
  if (mode !== "home") {
    const studyMaterials=activeCourse?.materials||[{id:"demo-material",title,source,createdAt:new Date(0).toISOString(),kind:"pasted" as const,package:learningPackage,preserveIds:true}];
    return <StudyMode mode={mode} theme={theme} onToggleTheme={toggleTheme} title={title} source={source} materials={studyMaterials} learningPackage={learningPackage} learnadeId={activeId} onChangeMode={setMode} onBack={() => setMode("home")} onManage={()=>{setMode("home");if(activeCourse)setManageCourseId(activeCourse.id);else setUploadTarget({})}} />;
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
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme}/>
          <div className="profile" ref={profileRef}>
            <span className="save-status"><span className="save-dot" /> {saved ? "Saved locally" : "Saving…"}</span>
            <button className="avatar" data-tour="menu" onClick={()=>setProfileOpen(open=>!open)} aria-label="Open learning menu" aria-haspopup="menu" aria-expanded={profileOpen}><span className="profile-icon" aria-hidden="true" /></button>
            {profileOpen&&<div className="profile-menu" role="menu" aria-label="Learning menu">
              <div className="profile-menu-heading"><strong>My Learnade</strong><span>{library.length} {library.length===1?"course":"courses"} saved on this browser</span></div>
              <div className="profile-menu-group">
                <button role="menuitem" onClick={openLibrary}><span aria-hidden="true">▦</span><span><strong>My courses</strong><small>Open your learning library</small></span></button>
                <button role="menuitem" onClick={()=>{setProfileOpen(false);setRecordTarget(activeCourse?{courseId:activeCourse.id}:{})}}><span aria-hidden="true">●</span><span><strong>Record a lecture</strong><small>{activeCourse?`Add to ${activeCourse.title}`:"Choose or create a course"}</small></span></button>
                <button role="menuitem" onClick={()=>{setProfileOpen(false);setUploadTarget({})}}><span aria-hidden="true">＋</span><span><strong>Create a course</strong><small>Upload or paste new material</small></span></button>
                <button role="menuitem" onClick={startTour}><span aria-hidden="true">?</span><span><strong>Take the tour</strong><small>See where everything lives</small></span></button>
              </div>
              {activeCourse&&<div className="profile-course">
                <span>CURRENT COURSE</span><strong>{activeCourse.title}</strong>
                <div className="profile-course-links">
                  <button role="menuitem" onClick={()=>openProfileMode("dashboard")}>Dashboard</button>
                  <button role="menuitem" onClick={()=>openProfileMode("cards")}>Flashcards</button>
                  <button role="menuitem" onClick={()=>openProfileMode("quiz")}>Quiz</button>
                  <button role="menuitem" onClick={()=>openProfileMode("exam")}>Mock exam</button>
                </div>
                <button className="profile-manage" role="menuitem" onClick={()=>{setProfileOpen(false);setManageCourseId(activeCourse.id)}}>Manage course and materials →</button>
              </div>}
            </div>}
          </div>
        </div>
      </header>

      <section className="hero" data-tour="welcome">
        <div>
          <span className="eyebrow">YOUR LEARNING, YOUR WAY</span>
          <h1>Make learning<br/><em>work for your brain.</em></h1>
          <p>Turn notes, readings, and slides into study experiences shaped around the way your brain wants to learn today.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setUploadTarget({})}>＋ Create a course</button>
            <button className="secondary" onClick={() => setRecordTarget(activeCourse?{courseId:activeCourse.id}:{})}>● Record a lecture</button>
          </div>
          <button className="text-button sample-link" onClick={()=>void openSample()}>Or explore a ready-made sample course →</button>
          <div className="demo-options" aria-label="Ready-made demo courses">
            {DEMO_COURSES.map(demo=><button className="demo-option" key={demo.id} onClick={()=>void openDemo(demo.id)}>
              <strong>Try {demo.title.replace("Demo Course: ","")}</strong><small>{demo.description}</small>
            </button>)}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="orbit orbit-one"><span>Focus</span></div>
          <div className="orbit orbit-two"><span>Read</span></div>
          <div className="study-card"><small>TODAY&apos;S SESSION</small><strong>12 min</strong><p>3 small steps</p><div className="mini-progress"><i /></div></div>
        </div>
      </section>

      <section className={`continue-card ${!activeCourse?"sample-continue":""}`} data-tour="dashboard">
        <div className="material-icon">{activeCourse?"☀":"◎"}</div>
        <div className="material-copy">{!libraryLoaded?<><span className="eyebrow">LOADING</span><h2>Opening your learning library…</h2></>:activeCourse?<><span className="eyebrow">CONTINUE LEARNING</span><h2>{title}</h2><p>{activeCourse.materials.length} source {activeCourse.materials.length===1?"item":"items"} · {modes.length} learning modes ready</p></>:<><span className="eyebrow">60-SECOND PRODUCT TOUR</span><h2>See a complete Learnade course</h2><p>Open a safe sample with readings, lecture notes, flashcards, quizzes, and mock exams.</p></>}</div>
        {activeCourse&&<><div className="progress-copy"><strong>{learningPackage.sections.length}</strong><span>sections</span></div><div className="progress-track"><i /></div></>}
        {libraryLoaded&&<button className="round-button" onClick={() => activeCourse?setMode("dashboard"):void openSample()} aria-label={activeCourse?"Open course dashboard":"Explore sample course"}>→</button>}
      </section>

      <section className="modes-section">
        <div className="section-heading"><div><span className="eyebrow">CHOOSE WHAT WORKS NOW</span><h2>How do you want to learn?</h2></div><p>You can switch modes anytime. No setup, no penalty.</p></div>
        <div className="mode-grid">
          {modes.map((item, index) => (
            <button className={`mode-card mode-${(index % 7) + 1}`} key={item.id} data-tour={item.id==="dashboard"?"course-dashboard":item.id==="plan"?"study-plan":item.id==="reader"?"accessible-reader":item.id==="speed"?"speed-reader":item.id==="brainrot"?"brainrot":item.id==="focus"?"focus-session":item.id==="guide"?"study-guide":item.id==="cards"?"flashcards":item.id==="quiz"?"quiz":item.id==="exam"?"mock-exam":undefined} aria-label={item.title} onClick={() => setMode(item.id)}>
              <span className="mode-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.text}</small></span><b aria-hidden="true">↗</b>
            </button>
          ))}
        </div>
      </section>

      <section className="library-section" id="library" data-tour="library">
        <div className="section-heading"><div><span className="eyebrow">SAVED ON THIS DEVICE</span><h2>My learning library</h2></div><p>Your documents and progress stay in this browser.</p></div>
        {libraryLoaded&&library.length === 0 ? <div className="library-empty"><strong>Your first course will appear here.</strong><p>Create one from your own material, or explore a complete sample first.</p><div className="empty-actions"><button className="primary" onClick={()=>void openSample()}>Explore sample course</button><button className="secondary" onClick={()=>setUploadTarget({})}>Create my own</button></div></div> : <div className="library-grid">{library.map(item=><article key={item.id}><button className="library-open" onClick={()=>openItem(item)}><span className="material-icon">L</span><span><small>{item.id===SAMPLE_COURSE_ID?"READY-MADE DEMO":`UPDATED ${new Date(item.updatedAt).toLocaleDateString()}`}</small><strong>{item.title}</strong><em>{item.materials.length} {item.materials.length===1?"source":"sources"} · {item.package.flashcards.length} cards</em></span></button><div className="course-actions"><button onClick={()=>setUploadTarget({courseId:item.id})}>＋ Material</button><button onClick={()=>setRecordTarget({courseId:item.id})}>● Lecture</button><button onClick={()=>setManageCourseId(item.id)}>Manage</button></div><button className="delete-item" onClick={()=>deleteItem(item.id)} aria-label={`Delete ${item.title}`}>×</button></article>)}</div>}
      </section>

      {uploadTarget && <UploadModal course={uploadTarget.courseId?library.find(item=>item.id===uploadTarget.courseId):undefined} onClose={() => setUploadTarget(null)} onCreate={async (text, courseTitle, materialTitle, kind, generated) => { await saveMaterial(text,courseTitle,materialTitle,kind,generated,uploadTarget.courseId); setUploadTarget(null); }} />}
      {recordTarget && <LectureRecorderModal courses={library} defaultCourseId={recordTarget.courseId} onClose={()=>setRecordTarget(null)} onSave={async(text,courseTitle,lectureTitle,courseId,audio)=>{await saveMaterial(text,courseTitle,lectureTitle,"lecture",undefined,courseId,audio);setRecordTarget(null)}} />}
      {manageCourseId && library.find(item=>item.id===manageCourseId) && <ManageCourseModal course={library.find(item=>item.id===manageCourseId)!} onClose={()=>setManageCourseId(null)} onRename={updateCourseName} onDeleteMaterial={deleteMaterial} onAddMaterial={()=>{setManageCourseId(null);setUploadTarget({courseId:manageCourseId})}} onRecord={()=>{setManageCourseId(null);setRecordTarget({courseId:manageCourseId})}} onExam={()=>{const course=library.find(item=>item.id===manageCourseId);setManageCourseId(null);if(course)activateCourse(course,"exam")}} onRegenerate={()=>void regenerateCourse(manageCourseId)} />}
      {tourStep!==null&&<GuidedTour step={tourStep} onBack={()=>setTourStep(current=>current===null?null:Math.max(0,current-1))} onNext={advanceTour} onSkip={finishTour}/>}
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

function ManageCourseModal({course,onClose,onRename,onDeleteMaterial,onAddMaterial,onRecord,onExam}:{course:SavedCourse;onClose:()=>void;onRename:(id:string,name:string)=>Promise<void>;onDeleteMaterial:(courseId:string,materialId:string)=>Promise<void>;onAddMaterial:()=>void;onRecord:()=>void;onExam:()=>void;onRegenerate:()=>void}) { const [name,setName]=useState(course.title);const [saving,setSaving]=useState(false);const saveName=async()=>{setSaving(true);await onRename(course.id,name);setSaving(false)};return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="manage-title"><div className="modal manage-modal"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><span className="eyebrow">COURSE SETTINGS</span><h2 id="manage-title">Manage {course.title}</h2><div className="rename-row"><label className="field"><span>Course name</span><input value={name} onChange={event=>setName(event.target.value)} /></label><button className="secondary" disabled={saving||name.trim()===course.title} onClick={saveName}>{saving?"Saving…":"Rename"}</button></div><div className="manager-actions"><button className="primary" onClick={onAddMaterial}>＋ Add material</button><button className="secondary" onClick={onRecord}>● Record lecture</button><button className="secondary" onClick={onExam}>✎ Make mock exam</button></div><div className="material-list"><span className="eyebrow">{course.materials.length} SAVED {course.materials.length===1?"ITEM":"ITEMS"}</span>{course.materials.map(material=><article key={material.id}><div className="material-kind" aria-hidden="true">{material.kind==="lecture"?"●":"▤"}</div><div><strong>{material.title}</strong><span>{material.kind} · {new Date(material.createdAt).toLocaleDateString()} · {material.source.split(/\s+/).length.toLocaleString()} words</span>{material.audio&&<AudioPlayer audioId={material.audio.id}/>}</div><button className="remove-material" onClick={()=>void onDeleteMaterial(course.id,material.id)} aria-label={`Remove ${material.title}`}>Remove</button></article>)}</div></div></div> }

function StudyMode({ mode, theme, onToggleTheme, title, source, materials, learningPackage, learnadeId, onChangeMode, onBack, onManage }: { mode: Mode; theme:Theme; onToggleTheme:()=>void; title: string; source: string; materials:CourseMaterial[]; learningPackage:LearningPackage; learnadeId:string; onChangeMode:(mode:Mode)=>void; onBack: () => void; onManage:()=>void }) {
  const label = modes.find(m => m.id === mode)?.title || "Study";
  const [readerTarget,setReaderTarget]=useState<string|null>(null);
  const [readerReturnMode,setReaderReturnMode]=useState<Mode|null>(null);
  const reviewSource=(from:Mode,id:string)=>{setReaderTarget(id);setReaderReturnMode(from);onChangeMode("reader")};
  const returnFromReader=()=>{const next=readerReturnMode||"guide";setReaderTarget(null);setReaderReturnMode(null);onChangeMode(next)};
  return <main className="study-shell" data-theme={theme}>
    <header className="study-topbar"><button className="brand" onClick={onBack}><span className="brand-mark">L</span><span className="brand-name">Learnade</span></button><div><small>COURSE</small><strong>{title}</strong></div><span className="study-actions"><ThemeToggle theme={theme} onToggle={onToggleTheme}/><button className="secondary study-manage" onClick={onManage}>Manage course</button><button className="secondary" onClick={onBack}>Exit session</button></span></header>
    <div className="study-layout">
      <aside><button className="back-link" onClick={onBack}>← <span>All modes</span></button><span className="eyebrow">LEARNING MODE</span><h1>{label}</h1><p>Switch whenever your attention or energy changes.</p><div className="side-progress"><span>Ready to study</span><strong>{learningPackage.sections.length}</strong><span>source sections</span></div></aside>
      <section className="workspace">
        {mode === "dashboard" && <CourseDashboard courseTitle={title} learningPackage={learningPackage} learnadeId={learnadeId} materialCount={materials.length} onNavigate={onChangeMode} onReview={(id)=>reviewSource("dashboard",id)} />}
        {mode === "plan" && <StudyPlan learningPackage={learningPackage} learnadeId={learnadeId} onNavigate={onChangeMode} onReview={(id)=>reviewSource("plan",id)} />}
        {mode === "reader" && <Reader learningPackage={learningPackage} materials={materials} title={title} target={readerTarget} onTargetChange={setReaderTarget} onReturn={readerReturnMode?returnFromReader:undefined} returnLabel={readerReturnMode?modes.find(item=>item.id===readerReturnMode)?.title:undefined} />}
        {mode === "speed" && <SpeedReader source={source} materials={materials} />}
        {mode === "focus" && <FocusMode learningPackage={learningPackage} onNavigate={onChangeMode} />}
        {mode === "brainrot" && <Brainrot source={learningPackage.narration} />}
        {mode === "guide" && <Guide learningPackage={learningPackage} onReview={(id)=>reviewSource("guide",id)} />}
        {mode === "cards" && <Cards cards={learningPackage.flashcards} sections={learningPackage.sections} learnadeId={learnadeId} onReview={(id)=>reviewSource("cards",id)} />}
        {mode === "quiz" && <Quiz questions={learningPackage.quiz.slice(0,5)} sections={learningPackage.sections} learnadeId={learnadeId} onReview={(id)=>reviewSource("quiz",id)} />}
        {mode === "exam" && <MockExam courseTitle={title} materials={materials} learnadeId={learnadeId} onReview={(id)=>reviewSource("exam",id)} />}
      </section>
    </div>
  </main>;
}
function CourseDashboard({courseTitle,learningPackage,learnadeId,materialCount,onNavigate,onReview}:{courseTitle:string;learningPackage:LearningPackage;learnadeId:string;materialCount:number;onNavigate:(mode:Mode)=>void;onReview:(id:string)=>void}) {
  const [snapshot,setSnapshot]=useState<DashboardSnapshot|null>(null);
  useEffect(()=>{const timer=setTimeout(()=>{const read=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}};setSnapshot(buildDashboardSnapshot(learningPackage,read(`learnade-mastery-${learnadeId}`)||{},read(`learnade-card-srs-${learnadeId}`)||{},read(`learnade-quiz-${learnadeId}`) as AttemptSummary|null,read(`learnade-exam-${learnadeId}`) as AttemptSummary|null))},0);return()=>clearTimeout(timer)},[learningPackage,learnadeId]);
  if(!snapshot)return <div className="dashboard-panel"><span className="eyebrow">COURSE DASHBOARD</span><h2>Loading your course progress…</h2></div>;
  const recent=snapshot.recentAttempt;const recommendation=snapshot.recommendation;const recentPercent=recent?Math.round((recent.score/recent.total)*100):null;
  const takeRecommendation=()=>recommendation.sectionId?onReview(recommendation.sectionId):onNavigate(recommendation.mode);
  return <div className="dashboard-panel"><span className="eyebrow">COURSE DASHBOARD</span><div className="dashboard-heading"><div><h2>{courseTitle}</h2><p>Your progress updates as you study, review cards, and complete assessments.</p></div><span>{materialCount} {materialCount===1?"source":"sources"} · {learningPackage.sections.length} sections</span></div><div className="dashboard-metrics"><article><span>COURSE MASTERY</span><strong>{snapshot.attemptedSections?snapshot.mastery:"—"}{snapshot.attemptedSections>0&&<small>%</small>}</strong><p>{snapshot.attemptedSections?`${snapshot.attemptedSections} sections measured`:"Not measured yet"}</p></article><article><span>CARDS READY</span><strong>{snapshot.cardsReady}</strong><p>of {snapshot.totalCards} generated cards</p></article><article><span>LATEST RESULT</span><strong>{recentPercent===null?"—":recentPercent}{recentPercent!==null&&<small>%</small>}</strong><p>{recent?`${recent.kind==="exam"?"Mock exam":"Practice quiz"} · ${recent.score}/${recent.total}`:"No assessment yet"}</p></article><article><span>WEAKEST CONCEPT</span><strong className="concept-value">{snapshot.weakSections[0]?.title||"Not measured"}</strong><p>{snapshot.weakSections[0]?`${snapshot.weakSections[0].percent}% across ${snapshot.weakSections[0].attempts} ${snapshot.weakSections[0].attempts===1?"attempt":"attempts"}`:"Complete the diagnostic to find it"}</p></article></div><section className="next-step"><div><span className="eyebrow">RECOMMENDED NEXT</span><h3>{recommendation.label}</h3><p>{recommendation.reason}</p></div><button className="primary" onClick={takeRecommendation}>Start now →</button></section><div className="dashboard-lower"><section className="weak-concepts"><span className="eyebrow">CONCEPT MASTERY</span>{snapshot.weakSections.length?snapshot.weakSections.map(section=><button key={section.id} onClick={()=>onReview(section.id)}><span><strong>{section.title}</strong><small>{section.attempts} measured {section.attempts===1?"attempt":"attempts"}</small></span><i><b style={{width:`${section.percent}%`}} /></i><em>{section.percent}%</em></button>):<div className="dashboard-empty"><strong>Your map starts with one minute.</strong><p>Take the diagnostic and Learnade will identify where to focus.</p><button className="source-link" onClick={()=>onNavigate("plan")}>Start diagnostic →</button></div>}</section><section className="quick-demo"><span className="eyebrow">QUICK DEMO</span><p>Jump into the features that make Learnade different.</p>{[["reader","Aa","Accessible reader"],["brainrot","✦","Brainrot lesson"],["cards","▱","Flashcards"],["quiz","✓","Practice quiz"],["exam","✎","Mock exam"]].map(([nextMode,icon,label])=><button key={nextMode} onClick={()=>onNavigate(nextMode as Mode)}><span>{icon}</span><strong>{label}</strong><b>→</b></button>)}</section></div></div>;
}

function MaterialPicker({materials,value,onChange}:{materials:CourseMaterial[];value:string;onChange:(value:string)=>void}) {
  return <label className="material-picker">Study material<select value={value} onChange={event=>onChange(event.target.value)}><option value="all">All course material</option>{materials.map(material=><option key={material.id} value={material.id}>{material.title}{material.kind==="lecture"?" (lecture transcript)":""}</option>)}</select></label>;
}

function Reader({ learningPackage, materials, title, target, onTargetChange, onReturn, returnLabel }: { learningPackage:LearningPackage; materials:CourseMaterial[]; title:string; target:string|null; onTargetChange:(target:string|null)=>void; onReturn?:()=>void; returnLabel?:string }) {
  const [dyslexia, setDyslexia] = useState(false); const [size, setSize] = useState(19); const [focus, setFocus] = useState(false); const [materialId,setMaterialId]=useState("all");
  const displayed=materialId==="all"?learningPackage:materials.find(material=>material.id===materialId)?.package||learningPackage;
  useEffect(()=>{
    if(!target)return;
    const frame=requestAnimationFrame(()=>{const section=document.getElementById(`reader-${target}`);section?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});section?.focus({preventScroll:true})});
    const timer=window.setTimeout(()=>onTargetChange(null),5000);
    return()=>{cancelAnimationFrame(frame);clearTimeout(timer)};
  },[target,onTargetChange]);
  return <div className="reader-panel"><div className="tool-row">{onReturn&&<button className="tool return-tool" onClick={onReturn}>← Back to {returnLabel||"study guide"}</button>}<MaterialPicker materials={materials} value={materialId} onChange={setMaterialId}/><button className={dyslexia ? "tool active" : "tool"} onClick={() => setDyslexia(!dyslexia)} aria-pressed={dyslexia}>OpenDyslexic font</button><button className={focus ? "tool active" : "tool"} onClick={() => setFocus(!focus)} aria-pressed={focus}>Line focus</button><label>Text size <input type="range" min="16" max="28" value={size} onChange={e => setSize(+e.target.value)} /></label></div><article className={`${dyslexia ? "dyslexia" : ""} ${focus ? "line-focus" : ""}`} style={{fontSize: size}}><span className="eyebrow">SOURCE READER</span><h2>{materialId==="all"?title:displayed.title}</h2><p className="reader-context">Choose one upload or lecture above when you want to read a specific source instead of the full course.</p>{displayed.sections.map(section=><section id={`reader-${section.id}`} tabIndex={-1} className={target===section.id?"source-highlight":""} key={section.id}>{target===section.id&&<span className="source-highlight-label">Supporting passage</span>}<h3>{section.title}</h3>{section.sentences.map((sentence,i)=><p tabIndex={focus?0:undefined} key={i}>{sentence}</p>)}</section>)}</article></div>;
}

function SpeedReader({ source, materials }: { source: string; materials:CourseMaterial[] }) {
  const [materialId,setMaterialId]=useState("all"); const activeSource=materialId==="all"?source:materials.find(material=>material.id===materialId)?.source||source;
  const words = useMemo(() => activeSource.trim().split(/\s+/).filter(Boolean), [activeSource]); const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false); const [wpm, setWpm] = useState(300);

  useEffect(() => { if (!playing) return; const current=words[index]||""; const pause=/[.!?]$/.test(current)?1.8:/[,;:]$/.test(current)?1.35:Math.max(1,current.length/9); const timer=setTimeout(()=>setIndex(i=>{if(i>=words.length-1){setPlaying(false);return i}return i+1}),60000/wpm*pause); return()=>clearTimeout(timer); }, [playing, wpm, words, index]);
  const word = words[index] || "Ready"; const pivot = Math.min(word.length-1,Math.max(0,Math.floor(word.length * .4)));
  return <div className="speed-panel"><span className="eyebrow">RAPID SERIAL VISUAL PRESENTATION</span><MaterialPicker materials={materials} value={materialId} onChange={value=>{setMaterialId(value);setIndex(0);setPlaying(false)}}/><p className="reader-context">Pick a lecture or upload above. The highlighted recognition letter stays fixed in the center.</p><div className="speed-word"><span>{word.slice(0,pivot)}</span><em>{word[pivot]}</em><span>{word.slice(pivot+1)}</span></div><div className="speed-line" role="progressbar" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={index+1}><i style={{width: `${((index+1) / Math.max(1,words.length)) * 100}%`}} /></div><div className="speed-controls"><button onClick={() => setIndex(Math.max(0,index-10))}>↶ 10</button><button className="play" onClick={() => {if(!playing&&index===words.length-1)setIndex(0);setPlaying(!playing)}} aria-label={playing ? "Pause speed reader" : index===words.length-1?"Replay speed reader":"Play speed reader"}>{playing ? <PauseIcon /> : <PlayIcon />}</button><button onClick={() => setIndex(Math.min(words.length-1,index+10))}>10 ↷</button></div><label className="wpm">{wpm} words per minute<input type="range" min="100" max="700" step="25" value={wpm} onChange={e => setWpm(+e.target.value)} /></label><p className="calm-note">Start at a pace that feels comfortable. Comprehension matters more than speed.</p></div>;
}
function FocusMode({learningPackage,onNavigate}:{learningPackage:LearningPackage;onNavigate:(mode:Mode)=>void}) {
  const [seconds,setSeconds]=useState(12*60);const [running,setRunning]=useState(false);const [done,setDone]=useState<boolean[]>([false,false,false]);const [round,setRound]=useState(0);const [celebration,setCelebration]=useState("");
  useEffect(()=>{if(!running)return;const timer=setInterval(()=>setSeconds(value=>{if(value<=1){setRunning(false);return 0}return value-1}),1000);return()=>clearInterval(timer)},[running]);
  const section=learningPackage.sections[round%Math.max(1,learningPackage.sections.length)]?.title||"your first section";
  const taskSets=[[
    {label:`Read ${section}`,time:"4 min",mode:"reader" as Mode},
    {label:`Review ${Math.min(8,learningPackage.flashcards.length)} flashcards`,time:"4 min",mode:"cards" as Mode},
    {label:"Take a short practice quiz",time:"4 min",mode:"quiz" as Mode}
  ],[
    {label:"Review the study guide",time:"4 min",mode:"guide" as Mode},
    {label:`Read ${section} in a format that works for you`,time:"4 min",mode:"reader" as Mode},
    {label:"Check your understanding",time:"4 min",mode:"quiz" as Mode}
  ]];
  const tasks=taskSets[round%taskSets.length];const allDone=done.every(Boolean);
  const toggle=(index:number)=>setDone(current=>{const next=current.map((value,item)=>item===index?!value:value);const finished=next.every(Boolean);setCelebration(finished?"Session complete. Nice work, you kept the promise to yourself.":next[index]?"Nice. One small step finished.":"");return next});
  const newSession=()=>{setRound(value=>value+1);setDone([false,false,false]);setSeconds(12*60);setRunning(false);setCelebration("A fresh session is ready.")};
  const reset=()=>{setSeconds(12*60);setRunning(false);setCelebration("Timer reset to 12 minutes.")};
  const shorten=()=>{setSeconds(Math.min(seconds,5*60));setRunning(false);setCelebration("Timer set to five focused minutes.")};
  return <div className="focus-panel"><span className="eyebrow">ONE SMALL STEP AT A TIME</span><h2>Your focus session</h2><p>Each task opens the exact learning mode you need. Check it off when you are done.</p><div className="timer" role="timer" aria-label={`${Math.floor(seconds/60)} minutes ${seconds%60} seconds remaining`}>{String(Math.floor(seconds/60)).padStart(2,"0")}<i>:</i>{String(seconds%60).padStart(2,"0")}</div><div className="focus-timer-actions"><button className="primary focus-start" onClick={()=>{if(seconds===0)setSeconds(12*60);setRunning(value=>!value)}}>{running?<><PauseIcon/>Pause</>:<><PlayIcon/>{seconds===0?"Start another session":"Start focus"}</>}</button><button className="secondary" onClick={shorten}>5 minutes</button><button className="secondary" onClick={reset}>Reset</button></div><div className="task-list" aria-live="polite">{tasks.map((task,index)=><article className={done[index]?"done":""} key={`${round}-${task.label}`}><label><input type="checkbox" checked={done[index]} onChange={()=>toggle(index)}/><span><strong>{task.label}</strong><small>{task.time}</small></span></label><button className="secondary" onClick={()=>onNavigate(task.mode)}>Open</button></article>)}</div>{celebration&&<p className={`focus-celebration ${allDone?"complete":""}`} role="status">{allDone?"✦ ":"✓ "}{celebration}</p>}<button className="text-button" onClick={newSession}>{allDone?"Plan another focused session":"Make a different session"}</button></div>;
}
function Brainrot({ source }: { source: string }) {
  const [speaking,setSpeaking]=useState(false);const [speechSupported,setSpeechSupported]=useState(true);const run=useRef(0);const [visual,setVisual]=useState<"minecraft"|"subway">("minecraft");
  const narrationSentences=useMemo(()=>source.split(/(?<=[.!?])\s+/).map(value=>value.trim()).filter(Boolean),[source]);const [sentenceIndex,setSentenceIndex]=useState(0);const [rate,setRate]=useState(1.05);const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);const [voiceName,setVoiceName]=useState("");
  useEffect(()=>{let subscribed=false;const load=()=>{const available=window.speechSynthesis.getVoices();setVoices(available);setVoiceName(current=>current||available.find(voice=>voice.lang.startsWith("en"))?.name||available[0]?.name||"")};const timer=window.setTimeout(()=>{if(!("speechSynthesis" in window)||!("SpeechSynthesisUtterance" in window)){setSpeechSupported(false);return}load();window.speechSynthesis.addEventListener("voiceschanged",load);subscribed=true},0);return()=>{clearTimeout(timer);run.current+=1;if("speechSynthesis" in window){window.speechSynthesis.cancel();if(subscribed)window.speechSynthesis.removeEventListener("voiceschanged",load)}}},[]);
  const speakFrom=(start:number,runId=run.current+1)=>{if(!speechSupported||!narrationSentences[start])return;run.current=runId;window.speechSynthesis.cancel();setSentenceIndex(start);const utterance=new SpeechSynthesisUtterance(narrationSentences[start]);utterance.rate=rate;utterance.voice=voices.find(voice=>voice.name===voiceName)||null;utterance.onend=()=>{if(run.current!==runId)return;if(start+1<narrationSentences.length)speakFrom(start+1,runId);else setSpeaking(false)};utterance.onerror=()=>{if(run.current===runId)setSpeaking(false)};window.speechSynthesis.speak(utterance);setSpeaking(true)};
  const toggle=()=>{if(!speechSupported)return;if(speaking){run.current+=1;window.speechSynthesis.cancel();setSpeaking(false)}else speakFrom(sentenceIndex)};const skip=(amount:number)=>{const next=Math.max(0,Math.min(narrationSentences.length-1,sentenceIndex+amount));if(speaking){run.current+=1;speakFrom(next)}else setSentenceIndex(next)};const videoId=visual==="minecraft"?"XBIaqOm0RKQ":"QPW3XwBoQlw";
  return <div className="brainrot-panel"><div className="visual-picker" aria-label="Choose background gameplay"><button className={visual==="minecraft"?"active":""} onClick={()=>setVisual("minecraft")}>Minecraft parkour</button><button className={visual==="subway"?"active":""} onClick={()=>setVisual("subway")}>Subway Surfers</button></div><div className="brain-visual"><iframe key={videoId} src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&mute=1&controls=1&loop=0&modestbranding=1&rel=0`} title={visual==="minecraft"?"Minecraft parkour visual focus gameplay":"Subway Surfers visual focus gameplay"} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin"/><div className="video-shade"/><div className="video-label">VISUAL FOCUS · {visual==="minecraft"?"MINECRAFT PARKOUR":"SUBWAY SURFERS"}</div></div><div className="caption" aria-live="polite"><span className="eyebrow">NOW EXPLAINING · {sentenceIndex+1} OF {narrationSentences.length}</span><p>{narrationSentences[sentenceIndex]||"No narration is available."}</p></div><div className="brain-controls"><button onClick={()=>skip(-1)} aria-label="Previous narration segment">←</button><button className="play" disabled={!speechSupported} onClick={toggle} aria-label={speaking?"Pause narration":"Play narration"}>{speaking?<PauseIcon/>:<PlayIcon/>}</button><button onClick={()=>skip(1)} aria-label="Next narration segment">→</button><span>{!speechSupported?"Voice narration is not supported by this browser.":speaking?"Narrating with captions":"Ready to listen"}</span></div>{speechSupported&&<div className="voice-controls"><label>Voice<select value={voiceName} onChange={event=>setVoiceName(event.target.value)}>{voices.filter(voice=>voice.lang.startsWith("en")).map(voice=><option key={voice.name} value={voice.name}>{voice.name}</option>)}</select></label><label>Speed<select value={rate} onChange={event=>setRate(Number(event.target.value))}><option value={0.8}>0.8×</option><option value={1.05}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></label></div>}<p className="calm-note">Learnade uses the voices installed on your device. Try another voice above if the default does not sound good. The gameplay is optional and uses YouTube&apos;s own controls, so it will not force-loop while you listen.</p></div>;
}
function Guide({learningPackage,onReview}:{learningPackage:LearningPackage;onReview:(id:string)=>void}) { const [open,setOpen]=useState<string | null>(learningPackage.sections[0]?.id||null); return <div className="guide"><span className="eyebrow">SOURCE-BUILT STUDY GUIDE</span><h2>{learningPackage.title} at a glance</h2><p className="guide-intro">Built privately on this device. Select a section to expand it and trace every point back to the source.</p><div className="overview-box"><strong>Overview</strong><p>{learningPackage.overview}</p></div><div className="guide-grid">{learningPackage.sections.map((item,index) => <section className={open===item.id ? "open" : ""} key={item.id}><button onClick={() => setOpen(open===item.id ? null : item.id)} aria-expanded={open===item.id}><span>{String(index+1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.sentences[0]}</p><b>{open===item.id ? "−" : "+"}</b></button>{open===item.id && <div className="guide-detail"><p>{item.text}</p><button className="source-link" onClick={()=>onReview(item.id)}>Review exact source →</button></div>}</section>)}</div><div className="key-term-list"><span className="eyebrow">KEY TERMS FROM YOUR SOURCE</span>{learningPackage.keyTerms.map(term=><article key={term.term}><strong>{term.term}</strong><p>{term.definition}</p><button className="source-link" onClick={()=>onReview(term.sourceSection)}>View supporting passage →</button></article>)}</div></div>; }

function Cards({cards,sections,learnadeId,onReview}:{cards:LearningPackage["flashcards"];sections:LearningPackage["sections"];learnadeId:string;onReview:(id:string)=>void}) {
  const storageKey=`learnade-card-srs-${learnadeId}`;const customKey=`learnade-custom-cards-${learnadeId}`;const [customCards,setCustomCards]=useState<LearningPackage["flashcards"]>(()=>{try{const saved=JSON.parse(localStorage.getItem(customKey)||"[]");return Array.isArray(saved)?saved:[]}catch{return[]}});const [adding,setAdding]=useState(false);const [front,setFront]=useState("");const [back,setBack]=useState("");useEffect(()=>{localStorage.setItem(customKey,JSON.stringify(customCards))},[customCards,customKey]);
  const allCards=useMemo(()=>[...cards,...customCards],[cards,customCards]);const allIds=useMemo(()=>allCards.map(card=>card.id),[allCards]);const [queue,setQueue]=useState<string[]>(allIds);const [reviews,setReviews]=useState<Record<string,CardReview>>({});const [flip,setFlip]=useState(false);const [status,setStatus]=useState("");const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>{try{const parsed=JSON.parse(localStorage.getItem(storageKey)||"{}") as Record<string,CardReview>;const clean=Object.fromEntries(Object.entries(parsed).filter(([id,value])=>allIds.includes(id)&&value?.dueAt));const now=Date.now();setReviews(clean);setQueue(allIds.filter(id=>!clean[id]||Date.parse(clean[id].dueAt)<=now))}catch{setQueue(allIds)}finally{setHydrated(true)}},0);return()=>clearTimeout(timer)},[storageKey,allIds]);useEffect(()=>{if(hydrated)localStorage.setItem(storageKey,JSON.stringify(reviews))},[reviews,storageKey,hydrated]);
  const currentId=queue[0];const current=allCards.find(card=>card.id===currentId);const applyReview=(result:"again"|"known")=>{if(!currentId)return;const next=scheduleCard(reviews[currentId],result);setReviews(value=>({...value,[currentId]:next}));setQueue(value=>result==="again"?(value.length>1?[...value.slice(1),value[0]]:value):value.slice(1));setFlip(false);setStatus(result==="again"?"This card will return before the session ends.":`Nice. Scheduled again in ${next.intervalDays} day${next.intervalDays===1?"":"s"}.`)};
  const addCard=()=>{if(!front.trim()||!back.trim())return;const card={id:`custom-${crypto.randomUUID()}`,front:front.trim(),back:back.trim(),sourceSection:sections[0]?.id||"section-1"};setCustomCards(value=>[...value,card]);setQueue(value=>[...value,card.id]);setFront("");setBack("");setAdding(false);setStatus("Your card was added to this course.")};const learned=allIds.filter(id=>(reviews[id]?.intervalDays||0)>0).length;const nextDue=Object.values(reviews).map(value=>Date.parse(value.dueAt)).filter(Number.isFinite).sort((a,b)=>a-b)[0];const section=sections.find(item=>item.id===current?.sourceSection);
  if(!current)return <div className="cards-panel card-complete"><span className="completion-mark">✓</span><h2>Nice work. You&apos;re caught up.</h2><p>{learned} of {allCards.length} cards are in spaced review.{nextDue?` Next review: ${new Date(nextDue).toLocaleDateString()}.`:""}</p><button className="primary" onClick={()=>setQueue(allIds)}>Review the full deck now</button><button className="text-button" onClick={()=>setAdding(true)}>Make your own card</button>{adding&&<div className="custom-card-form"><label>Term<input value={front} onChange={event=>setFront(event.target.value)} placeholder="For example: Myelin sheath"/></label><label>Definition<input value={back} onChange={event=>setBack(event.target.value)} placeholder="Explain it in your own words"/></label><button className="primary" onClick={addCard}>Add card</button></div>}</div>;
  return <div className="cards-panel"><div className="stack-status"><span>Due now <strong>{queue.length}</strong></span><span>In spaced review <strong>{learned}</strong></span></div><button className="text-button card-create" onClick={()=>setAdding(value=>!value)}>{adding?"Close card editor":"＋ Make your own card"}</button>{adding&&<div className="custom-card-form"><label>Term<input value={front} onChange={event=>setFront(event.target.value)} placeholder="For example: Myelin sheath"/></label><label>Definition<input value={back} onChange={event=>setBack(event.target.value)} placeholder="Explain it in your own words"/></label><button className="primary" onClick={addCard}>Add card</button></div>}<span className="eyebrow">CURRENT REVIEW CARD</span><button className={`flashcard ${flip?"flipped":""}`} onClick={()=>setFlip(value=>!value)}><small>{flip?"DEFINITION":"TERM"}</small><strong>{flip?current.back:current.front}</strong><span>Click to {flip?"see term":"reveal definition"}</span></button>{flip&&section&&<div className="source-proof"><span className="eyebrow">SUPPORTED BY YOUR SOURCE</span><p>“{sourceEvidence(section,current.front,current.back)}”</p><button className="source-link" onClick={()=>onReview(section.id)}>Open source passage →</button></div>}<div className="card-actions"><button onClick={()=>applyReview("again")}>↻ Not yet</button><button className="primary" onClick={()=>applyReview("known")}>Got it ✓</button></div><p className="microcopy" aria-live="polite">{status}</p></div>;
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

function MockExam({courseTitle,materials,learnadeId,onReview}:{courseTitle:string;materials:CourseMaterial[];learnadeId:string;onReview:(id:string)=>void}) {
  const allIds=useMemo(()=>materials.map(material=>material.id),[materials]);
  const [selectedIds,setSelectedIds]=useState<string[]>(allIds);const [requested,setRequested]=useState(10);const [timeLimit,setTimeLimit]=useState(0);const [phase,setPhase]=useState<"setup"|"taking"|"results">("setup");const [activeExam,setActiveExam]=useState<MockExamData|null>(null);const [answers,setAnswers]=useState<Array<number|null>>([]);const [index,setIndex]=useState(0);const [remaining,setRemaining]=useState<number|null>(null);const recordedRef=useRef(false);
  const available=useMemo(()=>buildMockExam(materials,selectedIds,Number.MAX_SAFE_INTEGER,courseTitle),[materials,selectedIds,courseTitle]);
  const countOptions=useMemo(()=>[5,10,20,available.questions.length].filter((value,position,values)=>value>0&&value<=available.questions.length&&values.indexOf(value)===position).sort((a,b)=>a-b),[available.questions.length]);
  const effectiveCount=countOptions.includes(requested)?requested:countOptions[countOptions.length-1]||0;
  const toggleMaterial=(id:string)=>setSelectedIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
  const start=()=>{const exam=buildMockExam(materials,selectedIds,effectiveCount,courseTitle);if(!exam.questions.length)return;recordedRef.current=false;setActiveExam(exam);setAnswers(exam.questions.map(()=>null));setIndex(0);setRemaining(timeLimit?timeLimit*60:null);setPhase("taking")};
  const submit=()=>{if(phase==="taking")setPhase("results")};
  useEffect(()=>{if(phase!=="taking"||remaining===null||remaining<=0)return;const timer=setTimeout(()=>{if(remaining<=1){setRemaining(0);setPhase("results")}else setRemaining(remaining-1)},1000);return()=>clearTimeout(timer)},[phase,remaining]);
  useEffect(()=>{if(phase!=="results"||!activeExam||recordedRef.current)return;recordedRef.current=true;const result=gradeMockExam(activeExam.questions,answers);try{const masteryKey=`learnade-mastery-${learnadeId}`;let mastery=JSON.parse(localStorage.getItem(masteryKey)||"{}") as SectionMastery;activeExam.questions.forEach((question,questionIndex)=>{mastery=recordAnswer(mastery,question.sourceSection,answers[questionIndex]===question.answer)});localStorage.setItem(masteryKey,JSON.stringify(mastery));localStorage.setItem(`learnade-exam-${learnadeId}`,JSON.stringify({date:new Date().toISOString(),score:result.correct,total:result.total,unanswered:result.unanswered,materialIds:activeExam.selectedMaterialIds,questionIds:activeExam.questions.map(question=>question.id),answers}))}catch{}},[phase,activeExam,answers,learnadeId]);
  if(phase==="setup")return <div className="exam-panel"><span className="eyebrow">SOURCE-SELECTED MOCK EXAM</span><h2>Build an exam from {courseTitle}</h2><p className="guide-intro">Choose exactly what is testable. Recorded lectures use their saved transcript; correctness and explanations stay hidden until you submit.</p><div className="exam-selection-heading"><strong>Include course materials</strong><span><button className="source-link" onClick={()=>setSelectedIds(allIds)}>Select all</button><button className="source-link" onClick={()=>setSelectedIds([])}>Clear</button></span></div><div className="exam-materials">{materials.map(material=><label key={material.id} className={selectedIds.includes(material.id)?"selected":""}><input type="checkbox" checked={selectedIds.includes(material.id)} onChange={()=>toggleMaterial(material.id)} /><span><strong>{material.title}</strong><small>{material.kind==="lecture"?"Lecture transcript":material.kind==="upload"?"Uploaded material":"Pasted notes"} · {material.package.quiz.length} possible questions</small></span></label>)}</div><div className="exam-options"><label>Questions<select value={effectiveCount} disabled={!countOptions.length} onChange={event=>setRequested(Number(event.target.value))}>{countOptions.map(value=><option key={value} value={value}>{value}{value===available.questions.length?" · all available":""}</option>)}</select></label><label>Time limit<select value={timeLimit} onChange={event=>setTimeLimit(Number(event.target.value))}><option value={0}>Untimed</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label></div>{!available.questions.length&&<p className="form-error" role="alert">Select at least one material with available practice questions.</p>}<button className="primary exam-start" disabled={!available.questions.length} onClick={start}>Start mock exam →</button></div>;
  if(!activeExam?.questions.length)return <div className="exam-panel"><h2>This exam could not be built.</h2><button className="primary" onClick={()=>setPhase("setup")}>Return to setup</button></div>;
  const result=gradeMockExam(activeExam.questions,answers);
  if(phase==="results")return <div className="exam-panel exam-results"><span className="completion-mark">{result.correct>=Math.ceil(result.total*.8)?"✓":"↻"}</span><span className="eyebrow">MOCK EXAM COMPLETE</span><h2>{result.correct} out of {result.total}</h2><p className="guide-intro">{result.unanswered?`${result.unanswered} unanswered. `:""}{result.missed.length?"Review the missed concepts below, then generate a focused retake.":"Excellent work. Every selected concept was answered correctly."}</p><div className="exam-result-actions">{result.missed.length>0&&<button className="primary" onClick={()=>{const questions=result.missed.map(missedIndex=>activeExam.questions[missedIndex]);recordedRef.current=false;setActiveExam({...activeExam,questions});setAnswers(questions.map(()=>null));setIndex(0);setRemaining(timeLimit?timeLimit*60:null);setPhase("taking")}}>Retake missed concepts</button>}<button className="secondary" onClick={()=>setPhase("setup")}>Build another exam</button></div><div className="exam-review"><span className="eyebrow">ANSWER REVIEW</span>{activeExam.questions.map((question,questionIndex)=>{const choice=answers[questionIndex];const correct=choice===question.answer;const section=activeExam.sections.find(item=>item.id===question.sourceSection);return <article className={correct?"correct":"missed"} key={question.id}><div><strong>{correct?"✓ Correct":choice===null?"— Unanswered":"✕ Review"}</strong><small>{question.materialTitle}</small></div><h3>{question.prompt}</h3><p><b>Your answer:</b> {choice===null?"No answer":question.options[choice]}</p>{!correct&&<p><b>Correct answer:</b> {question.options[question.answer]}</p>}<p>{question.explanation}</p>{section&&<button className="source-link" onClick={()=>onReview(section.id)}>Review supporting source →</button>}</article>})}</div></div>;
  const question=activeExam.questions[index];const answered=answers.filter(answer=>answer!==null).length;
  return <div className="exam-panel exam-taking"><div className="exam-toolbar"><span>{answered} of {activeExam.questions.length} answered</span>{remaining!==null&&<time aria-label={`${Math.floor(remaining/60)} minutes ${remaining%60} seconds remaining`}>{String(Math.floor(remaining/60)).padStart(2,"0")}:{String(remaining%60).padStart(2,"0")}</time>}</div><div className="quiz-progress"><i style={{width:`${((index+1)/activeExam.questions.length)*100}%`}} /></div><span className="eyebrow">QUESTION {index+1} OF {activeExam.questions.length} · {question.materialTitle.toUpperCase()}</span><h2>{question.prompt}</h2>{question.options.map((option,optionIndex)=><button className={`answer ${answers[index]===optionIndex?"selected":""}`} aria-pressed={answers[index]===optionIndex} key={`${question.id}:${optionIndex}`} onClick={()=>setAnswers(current=>current.map((answer,answerIndex)=>answerIndex===index?optionIndex:answer))}><span>{String.fromCharCode(65+optionIndex)}</span>{option}</button>)}<div className="exam-navigation"><button className="secondary" disabled={index===0} onClick={()=>setIndex(value=>Math.max(0,value-1))}>← Previous</button>{index<activeExam.questions.length-1?<button className="primary" onClick={()=>setIndex(value=>Math.min(activeExam.questions.length-1,value+1))}>Next →</button>:<button className="primary" onClick={submit}>Submit exam</button>}</div><button className="text-button exam-submit-early" onClick={submit}>Submit now · {activeExam.questions.length-answered} unanswered</button></div>;
}

function StudyPlan({learningPackage,learnadeId,onNavigate,onReview}:{learningPackage:LearningPackage;learnadeId:string;onNavigate:(mode:Mode)=>void;onReview:(id:string)=>void}) {
  const questions=learningPackage.quiz.length>5?learningPackage.quiz.slice(5,10):learningPackage.quiz.slice(0,5);
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
