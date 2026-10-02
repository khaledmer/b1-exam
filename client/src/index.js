import express from 'express'; import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
import {EXAM,load,save,grade,isTeacher} from './store.js';
const app=express(); app.use(express.json({limit:'200kb'}));
app.use('/api',(q,s,n)=>{s.set('Cache-Control','no-store');n()});
const teacherOnly=(q,s,n)=>isTeacher(q)?n():s.status(401).json({error:'unauthorized'});

app.get('/api/exam',(req,res)=>{
 const {session}=load();
 const strip=s=>({...s,questions:s.questions.map(({correctAnswer,points,...q})=>q)});
 res.json({session,serverNow:Date.now(),exam:session.status==='ACTIVE'?{title:EXAM.title,sections:EXAM.sections.map(strip)}:null});
});
app.post('/api/submit',(req,res)=>{
 const {name,email,answers}=req.body||{}; const d=load(),s=d.session,now=Date.now();
 const e=String(email||'').trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(e)) return res.status(400).json({error:'bad email'});
 const n=String(name||'').trim().replace(/\s+/g,' ').slice(0,100);
 if(n.length<2) return res.status(400).json({error:'name required'});
 if(s.status!=='ACTIVE') return res.status(400).json({error:'no active exam'});
 if(now>s.startTime+s.durationMinutes*60000+30000) return res.status(403).json({error:'late'});
 if(d.submissions[e]) return res.json({ok:true});
 const a=answers&&typeof answers==='object'?answers:{};
 d.submissions[e]={name:n,email:e,submittedAt:now,answers:a,...grade(a)}; save(d);
 res.json({ok:true});
});
app.get('/api/teacher',teacherOnly,(req,res)=>{
 const d=load();
 res.json({session:d.session,exam:EXAM,submissions:Object.values(d.submissions).sort((a,b)=>a.submittedAt-b.submittedAt)});
});
app.post('/api/teacher',teacherOnly,(req,res)=>{
 const d=load(); d.archive=[...(d.archive||[]),...Object.values(d.submissions)]; d.submissions={};
 d.session={status:'ACTIVE',startTime:Date.now(),durationMinutes:Math.min(Math.max(+req.body?.durationMinutes||60,1),240)};
 save(d); res.json(d.session);
});

const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(q,s)=>s.sendFile(path.join(dist,'index.html')))}
app.listen(process.env.PORT||3001,()=>console.log('B1 exam server on',process.env.PORT||3001));
