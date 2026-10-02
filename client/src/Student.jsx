import {useEffect,useRef,useState} from 'react'; import {Clock,Save,Timer,Mail} from 'lucide-react';
const K=e=>`student_exam_state_${e}`;
const H={'Content-Type':'application/json'};
const fmt=ms=>{const s=Math.ceil(ms/1000);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
export default function Home(){
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[joined,setJoined]=useState(false),[data,setData]=useState(null),[exam,setExam]=useState(null),
  [offset,setOffset]=useState(0),[answers,setAnswers]=useState({}),[now,setNow]=useState(Date.now()),[done,setDone]=useState(false),[err,setErr]=useState('');
 const sent=useRef(false),aref=useRef({}),draftT=useRef(null);
 const poll=async()=>{try{const r=await(await fetch('/api/exam',{cache:'no-store'})).json();setOffset(r.serverNow-Date.now());setData(r);if(r.exam)setExam(r.exam)}catch{}};
 useEffect(()=>{if(!joined||done)return;poll();const t=setInterval(poll,3000);return()=>clearInterval(t)},[joined,done]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()+offset),500);return()=>clearInterval(t)},[offset]);
 const st=data?.session?.startTime;
 const push=a=>fetch('/api/draft',{method:'POST',headers:H,keepalive:true,body:JSON.stringify({name,email,answers:a})}).catch(()=>{});
 // Restore saved answers for this exam session, then register them on the server.
 useEffect(()=>{if(!joined||!st)return;let a={};sent.current=false;
  try{const s=JSON.parse(localStorage.getItem(K(email)));if(s&&s.startTime===st){a=s.answers||{};if(s.submitted){sent.current=true;setDone(true)}}}catch{}
  aref.current=a;setAnswers(a);if(!sent.current)push(a)},[joined,st]);
 const left=st?Math.max(0,data.endTime-now):0, locked=!!st&&left<=0, stopped=data?.session?.status==='STOPPED';
 const save=(a,sub=false)=>{try{localStorage.setItem(K(email),JSON.stringify({startTime:st,answers:a,submitted:sub}))}catch{}};
 const pick=(id,i)=>{if(locked||done)return;const a={...aref.current,[id]:i};aref.current=a;setAnswers(a);save(a);
  clearTimeout(draftT.current);draftT.current=setTimeout(()=>push(a),600)};
 const submit=async()=>{if(sent.current)return;sent.current=true;
  try{const r=await fetch('/api/submit',{method:'POST',headers:H,body:JSON.stringify({name,email,answers:aref.current})});
   if(r.ok){setErr('');save(aref.current,true);setDone(true)}
   else if(r.status===403){setErr('The exam has closed. Answers that reached the server before the deadline were recorded automatically. Please check with your teacher.');setDone(true)}
   else{sent.current=false;setErr('Submission failed. Retrying automatically.')}}
  catch{sent.current=false;setErr('No connection. Your answers are saved on this device and will be sent automatically.')}};
 // As soon as the time is up (or the teacher stops the exam) the answers are sent; retried every few seconds until accepted.
 useEffect(()=>{if(joined&&st&&locked&&!done)submit()},[locked,done,Math.floor(now/3000)]);

 if(!joined) return(
 <section className="grid items-center gap-12 py-6 md:grid-cols-[1.1fr_0.9fr] md:py-14">
  <div>
   <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">B1 Mid-Term<br/>English Assessment</h1>
   <p className="mt-5 max-w-md text-lg text-slate-600">36 questions across grammar and reading. You have 60 minutes once your teacher starts the exam.</p>
   <ul className="mt-8 space-y-3 text-slate-700">
    {[[Save,'Answers save after every click, so a reload never loses your work.'],[Timer,'One shared countdown for the whole class, set by your teacher.'],[Mail,'Your teacher emails your results after the exam.']].map(([I,t])=>(
     <li key={t} className="flex items-start gap-3"><I size={20} className="mt-0.5 shrink-0 text-ultra"/>{t}</li>))}
   </ul></div>
  <form onSubmit={e=>{e.preventDefault();const n=name.trim().replace(/\s+/g,' ');if(n.length<2)return;setName(n);setEmail(email.trim().toLowerCase());setJoined(true)}} className="rounded-xl border-2 border-ink bg-white p-6 shadow-[6px_6px_0_0_#2b3fd6]">
   <div className="mb-6 flex items-center justify-between border-b-2 border-dashed border-ink/20 pb-4">
    <span className="font-display text-lg font-bold">Student answer sheet</span>
    <span className="flex gap-1.5">{'ABCD'.split('').map((l,i)=>(<span key={l} className={`grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-semibold ${i===2?'border-ultra bg-ultra text-white':'border-ink/70'}`}>{l}</span>))}</span></div>
   <label className="mb-2 block text-sm font-semibold" htmlFor="name">Your full name</label>
   <input id="name" required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="First and last name" className="w-full rounded-md border-2 border-ink/30 px-3 py-2.5 outline-none focus:border-ultra focus:ring-4 focus:ring-ultra/15"/>
   <label className="mb-2 mt-4 block text-sm font-semibold" htmlFor="email">Your email address</label>
   <input id="email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-md border-2 border-ink/30 px-3 py-2.5 outline-none focus:border-ultra focus:ring-4 focus:ring-ultra/15"/>
   <p className="mt-2 text-sm text-slate-500">Use the same name and email if you need to come back to the exam.</p>
   <button className="mt-6 w-full rounded-md bg-ultra py-3 font-semibold text-white transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-ultra/30">Join exam</button>
  </form></section>);
 if(done) return(<div className="mx-auto mt-16 max-w-xl rounded-lg border-2 border-ink bg-white p-8 text-lg">{err||'Your exam responses have been submitted successfully. Your teacher will send your evaluated PDF report via email.'}</div>);
 if(!exam) return <div className="mx-auto mt-16 max-w-xl rounded-lg border-2 border-ink bg-white p-8">Waiting for your teacher to start the exam. This page updates automatically.</div>;
 let n=0;
 return(<div className="mx-auto max-w-3xl">
  <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded border bg-white p-3 shadow-sm">
   <span className="text-sm">{name} <span className="text-slate-500">{email}</span></span><span className={`flex items-center gap-1 font-mono text-lg ${left<300000?'text-red-600':''}`}><Clock size={18}/>{fmt(left)}</span></div>
  {locked&&<p className="mb-3 rounded bg-amber-100 p-3 text-sm text-amber-900">{stopped?'Your teacher has ended the exam.':'Time is up.'} Submitting your answers…</p>}
  {err&&<p className="mb-3 text-sm text-amber-700">{err}</p>}
  {exam.sections.map(s=>(<section key={s.id} className="mb-8"><h2 className="mb-3 text-xl font-semibold">{s.title}</h2>
   {s.passageText&&<div className="mb-4 rounded border bg-white p-4"><h3 className="mb-2 font-medium">{s.passageTitle}</h3><p className="whitespace-pre-line leading-relaxed">{s.passageText}</p></div>}
   {s.questions.map(q=>{n++;return(<fieldset key={q.id} disabled={locked} className="mb-4 rounded border bg-white p-4">
    <legend className="px-1 font-medium">{n}. {q.text}</legend>
    {q.options.map((o,i)=>(<label key={i} className="flex cursor-pointer items-center gap-2 py-1">
     <input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>pick(q.id,i)}/>{'ABCD'[i]}) {o}</label>))}</fieldset>)})}</section>))}
  <button disabled={locked} onClick={()=>confirm('Submit your exam now? You cannot change answers afterwards.')&&submit()} className="rounded bg-blue-600 px-5 py-2 text-white disabled:opacity-50">Submit exam</button>
 </div>)}
