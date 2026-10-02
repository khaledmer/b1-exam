import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
export const EXAM=JSON.parse(fs.readFileSync(path.join(root,'data','exam.json'),'utf8'));
const F=path.join(root,'.data','db.json');
export const GRACE=30000;
export const endOf=s=>{if(!s.startTime)return 0;const e=s.startTime+s.durationMinutes*60000;return s.status==='STOPPED'?Math.min(s.stoppedAt,e):e};
export const save=d=>{fs.mkdirSync(path.dirname(F),{recursive:true});fs.writeFileSync(F+'.tmp',JSON.stringify(d));fs.renameSync(F+'.tmp',F)};
export const isTeacher=req=>req.get('x-teacher-key')===(process.env.TEACHER_KEY||'change-me');
export function clean(a){const o={};if(a&&typeof a==='object')for(const s of EXAM.sections)for(const q of s.questions){const v=a[q.id];if(Number.isInteger(v)&&v>=0&&v<q.options.length)o[q.id]=v}return o}
export function grade(a){let g=0,r=0;for(const s of EXAM.sections)for(const q of s.questions)if(a[q.id]===q.correctAnswer){s.id==='grammar'?g+=q.points:r+=q.points}
 const f=n=>Math.round(n*10)/10;return {grammar:f(g),reading:f(r),total:f(g+r)}}
// After the deadline (+grace), every student with a saved draft but no submission is submitted automatically.
function finalize(d){const s=d.session;if(!s.startTime||d.finalized||Date.now()<=endOf(s)+GRACE)return false;
 for(const [e,dr] of Object.entries(d.drafts))if(!d.submissions[e])d.submissions[e]={name:dr.name,email:e,submittedAt:endOf(s),answers:dr.answers,auto:true,...grade(dr.answers)};
 d.finalized=true;return true}
export const load=()=>{let d;try{d=JSON.parse(fs.readFileSync(F,'utf8'))}catch{d={session:{status:'IDLE',startTime:null,durationMinutes:EXAM.durationMinutes},submissions:{},archive:[]}}
 d.drafts=d.drafts||{};if(finalize(d))save(d);return d};
