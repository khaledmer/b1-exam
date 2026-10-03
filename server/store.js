import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url'; import pg from 'pg';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
export const EXAM=JSON.parse(fs.readFileSync(path.join(root,'data','exam.json'),'utf8'));
export const GRACE=30000;
pg.types.setTypeParser(20,Number); // bigint (epoch milliseconds) -> JS number
const url=process.env.DATABASE_URL;
if(!url){console.error('DATABASE_URL is not set. See README.md, section "Database".');process.exit(1)}
export const pool=new pg.Pool({connectionString:url,max:10,ssl:process.env.PGSSL==='true'||/\.render\.com/.test(url)?{rejectUnauthorized:false}:undefined});
export const endOf=s=>{if(!s.startTime)return 0;const e=s.startTime+s.durationMinutes*60000;return s.status==='STOPPED'?Math.min(s.stoppedAt,e):e};
export const isTeacher=req=>req.get('x-teacher-key')===(process.env.TEACHER_KEY||'change-me');
export function clean(a){const o={};if(a&&typeof a==='object')for(const s of EXAM.sections)for(const q of s.questions){const v=a[q.id];if(Number.isInteger(v)&&v>=0&&v<q.options.length)o[q.id]=v}return o}
export function grade(a){let g=0,r=0;for(const s of EXAM.sections)for(const q of s.questions)if(a[q.id]===q.correctAnswer){s.id==='grammar'?g+=q.points:r+=q.points}
 const f=n=>Math.round(n*10)/10;return {grammar:f(g),reading:f(r),total:f(g+r)}}
const toS=r=>({status:r.status,startTime:r.start_time,durationMinutes:r.duration_minutes,stoppedAt:r.stopped_at,finalized:r.finalized});

export async function init(){
 await pool.query(`
  CREATE TABLE IF NOT EXISTS exam_session(id int PRIMARY KEY CHECK (id=1), status text NOT NULL DEFAULT 'IDLE', start_time bigint,
    duration_minutes int NOT NULL DEFAULT 60, stopped_at bigint, finalized boolean NOT NULL DEFAULT false);
  CREATE TABLE IF NOT EXISTS submissions(session_start bigint NOT NULL, email text NOT NULL, name text NOT NULL, submitted_at bigint NOT NULL,
    answers jsonb NOT NULL, grammar double precision NOT NULL, reading double precision NOT NULL, total double precision NOT NULL,
    auto boolean NOT NULL DEFAULT false, PRIMARY KEY(session_start,email));
  CREATE TABLE IF NOT EXISTS drafts(session_start bigint NOT NULL, email text NOT NULL, name text NOT NULL, answers jsonb NOT NULL,
    updated_at bigint NOT NULL, PRIMARY KEY(session_start,email));`);
 await pool.query('INSERT INTO exam_session(id,duration_minutes) VALUES(1,$1) ON CONFLICT DO NOTHING',[EXAM.durationMinutes]);
}
// After the deadline (+grace) every saved draft without a submission is submitted automatically. Safe with several server instances (row lock).
export async function finalize(){
 const due=r=>r&&r.start_time&&!r.finalized&&Date.now()>endOf(toS(r))+GRACE;
 if(!due((await pool.query('SELECT * FROM exam_session WHERE id=1')).rows[0]))return;
 const c=await pool.connect();
 try{await c.query('BEGIN');
  const r=(await c.query('SELECT * FROM exam_session WHERE id=1 FOR UPDATE')).rows[0];
  if(due(r)){const s=toS(r);
   const {rows}=await c.query('SELECT * FROM drafts d WHERE d.session_start=$1 AND NOT EXISTS (SELECT 1 FROM submissions x WHERE x.session_start=d.session_start AND x.email=d.email)',[s.startTime]);
   for(const d of rows){const g=grade(d.answers);
    await c.query('INSERT INTO submissions(session_start,email,name,submitted_at,answers,grammar,reading,total,auto) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,true) ON CONFLICT DO NOTHING',
     [s.startTime,d.email,d.name,endOf(s),JSON.stringify(d.answers),g.grammar,g.reading,g.total])}
   await c.query('UPDATE exam_session SET finalized=true WHERE id=1')}
  await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export async function getSession(){await finalize();return toS((await pool.query('SELECT * FROM exam_session WHERE id=1')).rows[0])}
