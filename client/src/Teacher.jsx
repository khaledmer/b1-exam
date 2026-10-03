import {useEffect,useState} from 'react'; import {Copy,Download,Play,Square,Eye,RotateCcw} from 'lucide-react';
const esc=t=>String(t).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
export default function Teacher(){
 const [k,setK]=useState(()=>{try{return sessionStorage.getItem('tk')||''}catch{return ''}}),[d,setD]=useState(null),[mins,setMins]=useState(60),[err,setErr]=useState(''),[show,setShow]=useState(false),[copied,setCopied]=useState(false);
 const H={'x-teacher-key':k,'Content-Type':'application/json'};
 const load=async()=>{const r=await fetch('/api/teacher',{headers:H,cache:'no-store'});if(!r.ok){setErr('Wrong teacher key.');setD(null);try{sessionStorage.removeItem('tk')}catch{}return}try{sessionStorage.setItem('tk',k)}catch{}setErr('');setD(await r.json())};
 useEffect(()=>{if(!d)return;const t=setInterval(load,5000);return()=>clearInterval(t)},[d,k]);
 useEffect(()=>{if(k)load()},[]);
 const start=async()=>{if(d.session.status==='ACTIVE'&&!confirm('An exam is already running. Restart it for all students? Current submissions will be archived.'))return;
  await fetch('/api/teacher',{method:'POST',headers:H,body:JSON.stringify({durationMinutes:+mins||60})});load()};
 const stop=async()=>{if(!confirm('Stop the exam for all students now? Everyone is locked and their answers are submitted.'))return;
  await fetch('/api/teacher/stop',{method:'POST',headers:H,body:'{}'});load()};
 const reset=async()=>{if(prompt('This permanently deletes ALL submissions, saved answers and exam sessions (test data). Type RESET to continue.')!=='RESET')return;
  await fetch('/api/teacher/reset',{method:'POST',headers:H,body:'{}'});setShow(false);load()};
 const copy=async()=>{const t=d.submissions.map(s=>s.email).join(', ');
  try{await navigator.clipboard.writeText(t)}catch{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}
  setCopied(true);setTimeout(()=>setCopied(false),1500)};
 const pdf=async s=>{const h2p=(await import('html2pdf.js')).default;let n=0;
  const rows=d.exam.sections.flatMap(x=>x.questions).map(q=>{n++;const a=s.answers[q.id],ok=a===q.correctAnswer;
   return `<tr style="background:${ok?'#ecfdf5':'#fef2f2'}"><td>${n}</td><td>${a==null?'—':'ABCD'[a]+') '+esc(q.options[a])}</td><td>${'ABCD'[q.correctAnswer]+') '+esc(q.options[q.correctAnswer])}</td><td>${esc(q.explanation||'')}</td></tr>`}).join('');
  const el=document.createElement('div');
  el.innerHTML=`<div style="font-family:sans-serif;padding:16px;font-size:11px"><h1 style="font-size:20px;margin:0">${esc(d.exam.title)}</h1>
   <p>Official Exam Report · ${new Date(s.submittedAt).toLocaleDateString()}</p><p><b>Student:</b> ${esc(s.name||'')}<br><b>Email:</b> ${esc(s.email)}<br><b>Submitted:</b> ${new Date(s.submittedAt).toLocaleString()}</p>
   <p><b>Total:</b> ${s.total}/100 · <b>Grammar:</b> ${s.grammar}/70 · <b>Reading:</b> ${s.reading}/30</p>
   <table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"><tr><th>#</th><th>Student answer</th><th>Correct answer</th><th>Notes</th></tr>${rows}</table></div>`;
  h2p().from(el).set({margin:10,filename:`${s.email}-report.pdf`,pagebreak:{mode:['css','avoid-all']}}).save()};
 if(!d) return(<div className="mt-16 rounded-lg border bg-white p-8"><h1 className="mb-4 text-2xl font-semibold">Teacher Dashboard</h1>
  <div className="flex gap-2"><input type="password" value={k} onChange={e=>setK(e.target.value)} placeholder="Teacher key" className="flex-1 rounded border px-3 py-2"/>
  <button onClick={load} className="rounded bg-slate-900 px-4 py-2 text-white">Open dashboard</button></div>{err&&<p className="mt-2 text-red-600">{err}</p>}</div>);
 const S=d.session;
 return(<div className="md:-mx-24"><div className="mb-6 flex flex-wrap items-end gap-3 rounded border bg-white p-4">
  <label className="text-sm">Duration (minutes)<input type="number" min="1" value={mins} onChange={e=>setMins(e.target.value)} className="ml-2 w-20 rounded border px-2 py-1"/></label>
  <button onClick={start} className="flex items-center gap-2 rounded bg-green-600 px-5 py-2 font-semibold text-white"><Play size={16}/>START EXAM FOR ALL</button>
  <button onClick={stop} disabled={S.status!=='ACTIVE'} className="flex items-center gap-2 rounded bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-40"><Square size={16}/>STOP EXAM FOR ALL</button>
  <button onClick={()=>setShow(!show)} className="flex items-center gap-2 rounded border-2 border-ink px-4 py-2 font-semibold"><Eye size={16}/>{show?'Hide preview':'Preview exam'}</button>
  <button onClick={reset} className="flex items-center gap-2 rounded border-2 border-red-600 px-4 py-2 font-semibold text-red-700"><RotateCcw size={16}/>Reset test data</button>
  <span className="text-sm">Status: <b>{S.status}</b>{d.inProgress?.length>0&&` · ${d.inProgress.length} still working`}{S.startTime&&` · started ${new Date(S.startTime).toLocaleTimeString()} · ${S.durationMinutes} min`}</span>
  <button onClick={copy} className="ml-auto flex items-center gap-2 rounded border px-3 py-2"><Copy size={16}/>{copied?'Copied!':'Copy All Student Emails'}</button></div>
  {show&&<Preview exam={d.exam}/>}
  <table className="w-full rounded border bg-white text-left text-sm"><thead className="border-b bg-slate-100"><tr>
   {['Student Name','Student Email','Submission Time','Auto Score (/100)','Grammar Score (/70)','Reading Score (/30)','Actions'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead>
   <tbody>{d.submissions.map(s=>(<tr key={s.email} className="border-b"><td className="p-2">{s.name||'—'}</td><td className="p-2">{s.email}</td><td className="p-2">{new Date(s.submittedAt).toLocaleString()}{s.auto&&' (auto-submitted)'}</td>
    <td className="p-2">{s.total}</td><td className="p-2">{s.grammar}</td><td className="p-2">{s.reading}</td>
    <td className="p-2"><button onClick={()=>pdf(s)} className="flex items-center gap-1 rounded border px-2 py-1"><Download size={14}/>Download Student PDF</button></td></tr>))}
    {!d.submissions.length&&<tr><td colSpan="7" className="p-4 text-slate-500">No submissions yet.</td></tr>}</tbody></table></div>)}

function Preview({exam}){let n=0;return(<div className="mb-6 rounded border-2 border-ink bg-white p-5">
 <p className="mb-4 rounded bg-amber-100 p-3 text-sm text-amber-900">Teacher preview. Correct answers are highlighted in green. Students never see this.</p>
 {exam.sections.map(s=>(<section key={s.id} className="mb-6"><h2 className="mb-3 text-xl font-semibold">{s.title} <span className="text-sm font-normal text-slate-500">({s.totalPoints} points)</span></h2>
  {s.passageText&&<div className="mb-4 rounded border bg-slate-50 p-4"><h3 className="mb-2 font-medium">{s.passageTitle}</h3><p className="whitespace-pre-line leading-relaxed">{s.passageText}</p></div>}
  {s.questions.map(q=>{n++;return(<div key={q.id} className="mb-4 rounded border p-4"><p className="mb-2 font-medium">{n}. {q.text} <span className="text-xs text-slate-500">({q.points} pts)</span></p>
   {q.options.map((o,i)=>(<p key={i} className={`rounded px-2 py-1 ${i===q.correctAnswer?'bg-green-100 font-semibold text-green-900':''}`}>{'ABCD'[i]}) {o}{i===q.correctAnswer&&' ✓'}</p>))}</div>)})}</section>))}</div>)}
