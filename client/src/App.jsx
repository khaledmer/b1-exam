import {BrowserRouter,Routes,Route,Link} from 'react-router-dom';
import Student from './Student.jsx'; import Teacher from './Teacher.jsx';
export default function App(){return(<BrowserRouter><div className="min-h-screen">
 <header className="border-b border-ink/10 bg-paper/80 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
  <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-md bg-ultra text-sm text-white">B1</span>English Exam</Link>
  <Link to="/teacher" className="rounded-md border-2 border-ink px-3 py-1.5 text-sm font-semibold transition hover:bg-ink hover:text-white">Teacher Dashboard</Link></div></header>
 <main className="mx-auto max-w-5xl px-6 py-6"><Routes><Route path="/" element={<Student/>}/>
  <Route path="/teacher" element={<div className="mx-auto max-w-3xl"><Teacher/></div>}/></Routes></main></div></BrowserRouter>)}
