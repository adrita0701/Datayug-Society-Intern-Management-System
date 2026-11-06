import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, KeyRound, Play, Send, UserRound } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import {
  Alert, EmptyState, Field, FileList, FilePicker, Modal, Spinner, StatusBadge, SubmitButton,
  Tabs, TopBar, formatDate, isOverdue,
} from '../components/ui.jsx';
import ChangePassword from '../components/ChangePassword.jsx';

const FILTERS = ['Active', 'Completed', 'All'];

export default function InternDashboard() {
  const { session, logout, request } = useAuth();
  const [tab, setTab] = useState('tasks');
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setTasks(await request('/intern/tasks'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [request]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="min-h-screen">
      <TopBar name={session.user?.fullName} roleLabel="Intern" onLogout={logout} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hi, {session.user?.fullName?.split(' ')[0] || 'there'} 👋</h1>
          <p className="text-sm text-slate-500">Here are the tasks assigned to you.</p>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'tasks', label: 'My tasks', icon: ClipboardList },
            { id: 'profile', label: 'Profile', icon: UserRound },
          ]}
        />
        <Alert>{error}</Alert>
        {tab === 'tasks' ? (tasks ? <TaskList tasks={tasks} reload={reload} /> : !error && <Spinner />) : <Profile />}
      </main>
    </div>
  );
}

function TaskList({ tasks, reload }) {
  const [filter, setFilter] = useState('Active');
  const [submitting, setSubmitting] = useState(null);
  const shown = tasks.filter((t) =>
    filter === 'All' ? true : filter === 'Completed' ? t.status === 'Completed' : t.status !== 'Completed'
  );
  const counts = {
    Active: tasks.filter((t) => t.status !== 'Completed').length,
    Completed: tasks.filter((t) => t.status === 'Completed').length,
    All: tasks.length,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`btn rounded-full px-3 py-1.5 ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {f} <span className="opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState icon={ClipboardList} title={filter === 'Completed' ? 'No completed tasks yet' : 'You’re all caught up'}>
            New tasks from your admin will show up here.
          </EmptyState>
        </div>
      ) : (
        shown.map((t) => <TaskCard key={t._id} task={t} reload={reload} onSubmit={() => setSubmitting(t)} />)
      )}

      <Modal open={!!submitting} title={`Submit: ${submitting?.title || ''}`} onClose={() => setSubmitting(null)}>
        {submitting && <SubmitWork task={submitting} onDone={() => { setSubmitting(null); reload(); }} />}
      </Modal>
    </div>
  );
}

function TaskCard({ task, reload, onSubmit }) {
  const { request } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const done = task.status === 'Completed';

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{task.title}</h2>
          <div className={`mt-1 inline-flex items-center gap-1 text-sm ${isOverdue(task) ? 'font-medium text-rose-600' : 'text-slate-500'}`}>
            <CalendarDays className="h-4 w-4" /> Due {formatDate(task.deadline)}{isOverdue(task) && ' · overdue'}
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{task.description}</p>}
      {task.images?.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Reference files</div>
          <FileList files={task.images} />
        </div>
      )}

      {(task.submissionNote || task.documents?.length > 0) && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Your submission</div>
          {task.submissionNote && <p className="mb-2 whitespace-pre-wrap text-sm text-slate-700">{task.submissionNote}</p>}
          <FileList
            files={task.documents}
            onRemove={done ? undefined : (f) => {
              if (window.confirm(`Remove ${f.name}?`)) run(() => request(`/intern/tasks/${task._id}/documents/${f._id}`, { method: 'DELETE' }));
            }}
          />
        </div>
      )}

      {error && <div className="mt-3"><Alert>{error}</Alert></div>}

      {!done && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {task.status === 'Pending' && (
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(() => request(`/intern/tasks/${task._id}/status`, { method: 'PUT', body: { status: 'In Progress' } }))}>
              <Play className="h-4 w-4" /> Start task
            </button>
          )}
          <button type="button" className="btn-primary" disabled={busy} onClick={onSubmit}>
            <Send className="h-4 w-4" /> {task.status === 'Submitted' ? 'Update submission' : 'Submit work'}
          </button>
        </div>
      )}
    </article>
  );
}

function SubmitWork({ task, onDone }) {
  const { request } = useAuth();
  const [note, setNote] = useState(task.submissionNote || '');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = new FormData();
    body.append('submissionNote', note);
    files.forEach((f) => body.append('documents', f));
    try {
      await request(`/intern/tasks/${task._id}/submit`, { method: 'POST', body });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{error}</Alert>
      <Field label="Notes for your admin" id="s-note" rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you do? Add links to your work if relevant." />
      <FilePicker id="s-files" label="Attach files" files={files} setFiles={setFiles} />
      <p className="text-xs text-slate-500">Submitting marks this task as “Submitted” for your admin to review.</p>
      <div className="flex justify-end">
        <SubmitButton busy={busy} className="btn-primary">Submit</SubmitButton>
      </div>
    </form>
  );
}

function Profile() {
  const { session, setUser, request } = useAuth();
  const u = session.user || {};
  const [form, setForm] = useState({ fullName: u.fullName || '', phone: u.phone || '', college: u.college || '', department: u.department || '' });
  const [msg, setMsg] = useState({ error: '', ok: '' });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ error: '', ok: '' });
    try {
      setUser(await request('/intern/me', { method: 'PUT', body: form }));
      setMsg({ error: '', ok: 'Profile saved.' });
    } catch (err) {
      setMsg({ error: err.message, ok: '' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <form onSubmit={save} className="space-y-4">
        <Alert>{msg.error}</Alert>
        <Alert kind="success">{msg.ok}</Alert>
        <Field label="Email" id="p-email" value={u.email || ''} disabled hint="Contact your admin to change your email." />
        <Field label="Full name" id="p-name" required value={form.fullName} onChange={set('fullName')} />
        <Field label="Phone" id="p-phone" type="tel" value={form.phone} onChange={set('phone')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="College / University" id="p-college" value={form.college} onChange={set('college')} />
          <Field label="Department" id="p-dept" value={form.department} onChange={set('department')} />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
          <button type="button" className="btn-ghost" onClick={() => setShowPassword(true)}>
            <KeyRound className="h-4 w-4" /> Change password
          </button>
          <SubmitButton busy={busy} className="btn-primary">Save profile</SubmitButton>
        </div>
      </form>
      <Modal open={showPassword} title="Change password" onClose={() => setShowPassword(false)}>
        <ChangePassword path="/intern/password" onDone={() => setShowPassword(false)} />
      </Modal>
    </div>
  );
}
