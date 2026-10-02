import {useEffect,useRef,useState} from 'react'; import {Clock} from 'lucide-react';
const K=e=>`student_exam_state_${e}`;
const fmt=ms=>{const s=Math.ceil(ms/1000);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
export default function Home(){
 const [email,setEmail]=useState(''),[joined,setJoined]=useState(false),[data,setData]=useState(null),[offset,setOffset]=useState(0),
  [answers,setAnswers]=useState({}),[now,setNow]=useState(Date.now()),[done,setDone]=useState(false),[err,setErr]=useState('');
 const sent=useRef(false);
 const poll=async()=>{try{const r=await(await fetch('/api/exam',{cache:'no-store'})).json();setOffset(r.serverNow-Date.now());setData(r)}catch{}};
 useEffect(()=>{if(!joined||done)return;poll();const t=setInterval(poll,5000);return()=>clearInterval(t)},[joined,done]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()+offset),500);return()=>clearInterval(t)},[offset]);
 const st=data?.session?.startTime;
 useEffect(()=>{if(!joined||!st)return;try{const s=JSON.parse(localStorage.getItem(K(email)));
  if(s&&s.startTime===st){setAnswers(s.answers||{});if(s.submitted)setDone(true)}else setAnswers({})}catch{}},[joined,st]);
 const left=st?Math.max(0,st+data.session.durationMinutes*60000-now):0, locked=!!st&&left<=0;
 const save=(a,submitted=false)=>{try{localStorage.setItem(K(email),JSON.stringify({startTime:st,answers:a,submitted}))}catch{}};
 const pick=(id,i)=>{if(locked||done)return;const a={...answers,[id]:i};setAnswers(a);save(a)};
 const submit=async()=>{if(sent.current)return;sent.current=true;
  try{const r=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,answers})});
   if(r.ok){setErr('');save(answers,true);setDone(true)}
   else{setErr('Your submission arrived after the deadline and was not accepted. Please contact your teacher.');setDone(true)}}
  catch{sent.current=false;setErr('No connection. Your answers are saved and will be sent automatically.')}};
 useEffect(()=>{if(joined&&data?.exam&&locked&&!done)submit()},[locked,done,Math.floor(now/5000)]);

 if(!joined) return(<div className="mt-16 rounded-lg border bg-white p-8"><h1 className="mb-4 text-2xl font-semibold">Enter Email to Join Exam</h1>
  <form onSubmit={e=>{e.preventDefault();setEmail(email.trim().toLowerCase());setJoined(true)}} className="flex gap-2">
  <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="flex-1 rounded border px-3 py-2"/>
  <button className="rounded bg-blue-600 px-4 py-2 text-white">Join</button></form></div>);
 if(done) return(<div className="mt-16 rounded-lg border bg-white p-8 text-lg">{err||'Your exam responses have been submitted successfully. Your teacher will send your evaluated PDF report via email.'}</div>);
 if(!data?.exam) return <div className="mt-16 rounded-lg border bg-white p-8">Waiting for your teacher to start the exam. This page updates automatically.</div>;
 let n=0;
 return(<div>
  <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded border bg-white p-3 shadow-sm">
   <span className="text-sm">{email}</span><span className={`flex items-center gap-1 font-mono text-lg ${left<300000?'text-red-600':''}`}><Clock size={18}/>{fmt(left)}</span></div>
  {err&&<p className="mb-3 text-sm text-amber-700">{err}</p>}
  {data.exam.sections.map(s=>(<section key={s.id} className="mb-8"><h2 className="mb-3 text-xl font-semibold">{s.title}</h2>
   {s.passageText&&<div className="mb-4 rounded border bg-white p-4"><h3 className="mb-2 font-medium">{s.passageTitle}</h3><p className="whitespace-pre-line leading-relaxed">{s.passageText}</p></div>}
   {s.questions.map(q=>{n++;return(<fieldset key={q.id} disabled={locked} className="mb-4 rounded border bg-white p-4">
    <legend className="px-1 font-medium">{n}. {q.text}</legend>
    {q.options.map((o,i)=>(<label key={i} className="flex cursor-pointer items-center gap-2 py-1">
     <input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>pick(q.id,i)}/>{'ABCD'[i]}) {o}</label>))}</fieldset>)})}</section>))}
  <button disabled={locked} onClick={()=>confirm('Submit your exam now? You cannot change answers afterwards.')&&submit()} className="rounded bg-blue-600 px-5 py-2 text-white disabled:opacity-50">Submit exam</button>
 </div>)}
