import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
export const EXAM=JSON.parse(fs.readFileSync(path.join(root,'data','exam.json'),'utf8'));
const F=path.join(root,'.data','db.json');
export const load=()=>{try{return JSON.parse(fs.readFileSync(F,'utf8'))}catch{return {session:{status:'IDLE',startTime:null,durationMinutes:EXAM.durationMinutes},submissions:{},archive:[]}}};
export const save=d=>{fs.mkdirSync(path.dirname(F),{recursive:true});fs.writeFileSync(F,JSON.stringify(d))};
export const isTeacher=req=>req.get('x-teacher-key')===(process.env.TEACHER_KEY||'change-me');
export function grade(a){let g=0,r=0;for(const s of EXAM.sections)for(const q of s.questions)if(a[q.id]===q.correctAnswer){s.id==='grammar'?g+=q.points:r+=q.points}
 const f=n=>Math.round(n*10)/10;return {grammar:f(g),reading:f(r),total:f(g+r)}}
