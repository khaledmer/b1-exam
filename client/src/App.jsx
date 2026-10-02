import {BrowserRouter,Routes,Route,Link} from 'react-router-dom';
import Student from './Student.jsx'; import Teacher from './Teacher.jsx';
export default function App(){return(<BrowserRouter><div className="min-h-screen bg-slate-50 text-slate-900">
 <header className="flex items-center justify-between border-b bg-white px-6 py-3"><Link to="/" className="font-semibold">B1 English Exam</Link>
 <Link to="/teacher" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">Teacher Dashboard</Link></header>
 <main className="mx-auto max-w-3xl p-6"><Routes><Route path="/" element={<Student/>}/><Route path="/teacher" element={<Teacher/>}/></Routes></main></div></BrowserRouter>)}
