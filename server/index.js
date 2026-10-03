import express from 'express'; import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
import {EXAM,GRACE,endOf,pool,init,finalize,getSession,clean,grade,isTeacher} from './store.js';
const app=express(); app.use(express.json({limit:'200kb'}));
app.use('/api',(q,s,n)=>{s.set('Cache-Control','no-store');n()});
const h=f=>(q,s,n)=>f(q,s).catch(n);
const teacherOnly=(q,s,n)=>isTeacher(q)?n():s.status(401).json({error:'unauthorized'});
const nm=x=>String(x||'').trim().replace(/\s+/g,' ').slice(0,100), em=x=>String(x||'').trim().toLowerCase(), okEmail=e=>/^\S+@\S+\.\S+$/.test(e);

app.get('/api/exam',h(async(req,res)=>{
 const s=await getSession();
 const strip=x=>({...x,questions:x.questions.map(({correctAnswer,points,...q})=>q)});
 res.json({session:s,endTime:endOf(s),serverNow:Date.now(),exam:s.startTime&&s.status!=='IDLE'?{title:EXAM.title,sections:EXAM.sections.map(strip)}:null});
}));
// Autosave of in-progress answers (safety net if a student's browser dies before the deadline).
app.post('/api/draft',h(async(req,res)=>{
 const s=await getSession(),e=em(req.body?.email),n=nm(req.body?.name);
 if(!okEmail(e)||n.length<2) return res.status(400).json({error:'bad input'});
 if(!s.startTime||Date.now()>endOf(s)+GRACE) return res.status(403).json({error:'closed'});
 await pool.query(`INSERT INTO drafts(session_start,email,name,answers,updated_at)
  SELECT $1::bigint,$2::text,$3::text,$4::jsonb,$5::bigint WHERE NOT EXISTS (SELECT 1 FROM submissions WHERE session_start=$1 AND email=$2)
  ON CONFLICT (session_start,email) DO UPDATE SET name=EXCLUDED.name,answers=EXCLUDED.answers,updated_at=EXCLUDED.updated_at`,
  [s.startTime,e,n,JSON.stringify(clean(req.body.answers)),Date.now()]);
 res.json({ok:true});
}));
app.post('/api/submit',h(async(req,res)=>{
 const s=await getSession(),now=Date.now(),e=em(req.body?.email),n=nm(req.body?.name),a=clean(req.body?.answers);
 if(!okEmail(e)||n.length<2) return res.status(400).json({error:'bad input'});
 if(!s.startTime) return res.status(400).json({error:'no exam'});
 const has=t=>pool.query(`SELECT 1 FROM ${t} WHERE session_start=$1 AND email=$2`,[s.startTime,e]).then(r=>r.rowCount>0);
 if(await has('submissions')) return res.json({ok:true});
 const end=endOf(s);
 if(now>end+GRACE) return res.status(403).json({error:'closed'});
 if(now>end&&!Object.keys(a).length&&!(await has('drafts'))) return res.status(403).json({error:'closed'});
 const g=grade(a);
 await pool.query('INSERT INTO submissions(session_start,email,name,submitted_at,answers,grammar,reading,total) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8) ON CONFLICT DO NOTHING',
  [s.startTime,e,n,now,JSON.stringify(a),g.grammar,g.reading,g.total]);
 res.json({ok:true});
}));
app.get('/api/teacher',teacherOnly,h(async(req,res)=>{
 const s=await getSession(),t=s.startTime;
 const subs=t?(await pool.query('SELECT * FROM submissions WHERE session_start=$1 ORDER BY submitted_at',[t])).rows:[];
 const prog=t?(await pool.query('SELECT name,email FROM drafts d WHERE session_start=$1 AND NOT EXISTS (SELECT 1 FROM submissions x WHERE x.session_start=d.session_start AND x.email=d.email) ORDER BY updated_at',[t])).rows:[];
 res.json({session:s,exam:EXAM,inProgress:prog,
  submissions:subs.map(r=>({name:r.name,email:r.email,submittedAt:r.submitted_at,answers:r.answers,grammar:r.grammar,reading:r.reading,total:r.total,auto:r.auto}))});
}));
// Starting a new exam keeps all earlier sessions in the database; the dashboard shows only the current one.
app.post('/api/teacher',teacherOnly,h(async(req,res)=>{
 const mins=Math.min(Math.max(+req.body?.durationMinutes||60,1),240);
 await pool.query("UPDATE exam_session SET status='ACTIVE',start_time=$1,stopped_at=NULL,duration_minutes=$2,finalized=false WHERE id=1",[Date.now(),mins]);
 res.json(await getSession());
}));
app.post('/api/teacher/stop',teacherOnly,h(async(req,res)=>{
 await pool.query("UPDATE exam_session SET status='STOPPED',stopped_at=$1 WHERE id=1 AND status='ACTIVE' AND start_time+duration_minutes*60000>$1",[Date.now()]);
 res.json(await getSession());
}));
app.use((e,q,s,n)=>{console.error(e);s.status(500).json({error:'server error'})});

const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(q,s)=>s.sendFile(path.join(dist,'index.html')))}
await init();
setInterval(()=>finalize().catch(console.error),5000);
app.listen(process.env.PORT||3001,()=>console.log('B1 exam server on',process.env.PORT||3001));
