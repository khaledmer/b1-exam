import express from 'express'; import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
import {EXAM,GRACE,endOf,load,save,clean,grade,isTeacher} from './store.js';
const app=express(); app.use(express.json({limit:'200kb'}));
app.use('/api',(q,s,n)=>{s.set('Cache-Control','no-store');n()});
const teacherOnly=(q,s,n)=>isTeacher(q)?n():s.status(401).json({error:'unauthorized'});
const nm=x=>String(x||'').trim().replace(/\s+/g,' ').slice(0,100), em=x=>String(x||'').trim().toLowerCase(), okEmail=e=>/^\S+@\S+\.\S+$/.test(e);

app.get('/api/exam',(req,res)=>{
 const {session:s}=load();
 const strip=x=>({...x,questions:x.questions.map(({correctAnswer,points,...q})=>q)});
 res.json({session:s,endTime:endOf(s),serverNow:Date.now(),exam:s.startTime&&s.status!=='IDLE'?{title:EXAM.title,sections:EXAM.sections.map(strip)}:null});
});
// Autosave of in-progress answers on the server (safety net if a student's browser dies before the deadline).
app.post('/api/draft',(req,res)=>{
 const d=load(),s=d.session,e=em(req.body?.email),n=nm(req.body?.name);
 if(!okEmail(e)||n.length<2) return res.status(400).json({error:'bad input'});
 if(!s.startTime||Date.now()>endOf(s)+GRACE) return res.status(403).json({error:'closed'});
 if(!d.submissions[e]){d.drafts[e]={name:n,email:e,answers:clean(req.body.answers),updatedAt:Date.now()};save(d)}
 res.json({ok:true});
});
app.post('/api/submit',(req,res)=>{
 const d=load(),s=d.session,now=Date.now(),e=em(req.body?.email),n=nm(req.body?.name),a=clean(req.body?.answers);
 if(!okEmail(e)||n.length<2) return res.status(400).json({error:'bad input'});
 if(!s.startTime) return res.status(400).json({error:'no exam'});
 if(d.submissions[e]) return res.json({ok:true});
 const end=endOf(s);
 if(now>end+GRACE) return res.status(403).json({error:'closed'});
 if(now>end&&!d.drafts[e]&&!Object.keys(a).length) return res.status(403).json({error:'closed'});
 d.submissions[e]={name:n,email:e,submittedAt:now,answers:a,...grade(a)}; save(d);
 res.json({ok:true});
});
app.get('/api/teacher',teacherOnly,(req,res)=>{
 const d=load();
 res.json({session:d.session,exam:EXAM,submissions:Object.values(d.submissions).sort((a,b)=>a.submittedAt-b.submittedAt),
  inProgress:Object.values(d.drafts).filter(x=>!d.submissions[x.email]).map(({name,email})=>({name,email}))});
});
app.post('/api/teacher',teacherOnly,(req,res)=>{
 const d=load(); d.archive=[...(d.archive||[]),...Object.values(d.submissions)]; d.submissions={}; d.drafts={}; d.finalized=false;
 d.session={status:'ACTIVE',startTime:Date.now(),stoppedAt:null,durationMinutes:Math.min(Math.max(+req.body?.durationMinutes||60,1),240)};
 save(d); res.json(d.session);
});
app.post('/api/teacher/stop',teacherOnly,(req,res)=>{
 const d=load(),s=d.session;
 if(s.status==='ACTIVE'&&Date.now()<endOf(s)){s.status='STOPPED';s.stoppedAt=Date.now();save(d)}
 res.json(s);
});
setInterval(load,5000); // runs the automatic submission of unsent drafts once the deadline has passed

const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(q,s)=>s.sendFile(path.join(dist,'index.html')))}
app.listen(process.env.PORT||3001,()=>console.log('B1 exam server on',process.env.PORT||3001));
