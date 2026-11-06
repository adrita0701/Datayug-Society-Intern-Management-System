import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, ShieldCheck, Upload, UserRound } from 'lucide-react';
import { Logo } from '../components/ui.jsx';

const features = [
  { icon: ClipboardList, title: 'Assign & track tasks', text: 'Admins assign work with deadlines and follow progress at a glance.' },
  { icon: Upload, title: 'Submit your work', text: 'Interns upload files and notes directly against each task.' },
  { icon: ShieldCheck, title: 'Review & approve', text: 'Admins review submissions and mark tasks complete.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <Link to="/admin/login" className="text-sm font-medium text-slate-600 hover:text-indigo-700">
          Admin login
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-16">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            Datayug Society Internship Programme
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            One place for every intern, task and submission.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Interns see their assignments and submit work. Admins assign tasks, review progress and approve results.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/intern/login" className="btn-primary px-5 py-3 text-base">
              <UserRound className="h-5 w-5" /> Intern login <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/intern/register" className="btn-secondary px-5 py-3 text-base">
              New intern? Register
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <div className="inline-flex rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Datayug Society
      </footer>
    </div>
  );
}
