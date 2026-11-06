import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, KeyRound, LayoutDashboard,
  Plus, Search, Trash2, Users,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import {
  Alert, EmptyState, Field, FileList, FilePicker, Modal, Spinner, STATUSES, StatusBadge,
  SubmitButton, Tabs, TopBar, formatDate, isOverdue,
} from '../components/ui.jsx';
import ChangePassword from '../components/ChangePassword.jsx';

export default function AdminDashboard() {
  const { session, logout, request } = useAuth();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [stats, interns, tasks] = await Promise.all([
        request('/admin/stats'),
        request('/admin/interns'),
        request('/admin/tasks'),
      ]);
      setData({ stats, interns, tasks });
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
      <TopBar name={session.user?.email} roleLabel="Administrator" onLogout={logout}>
        <button type="button" className="btn-ghost px-3" onClick={() => setShowPassword(true)} title="Change password">
          <KeyRound className="h-4 w-4" />
        </button>
      </TopBar>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'tasks', label: 'Tasks', icon: ClipboardList },
            { id: 'interns', label: 'Interns', icon: Users },
          ]}
        />
        <Alert>{error}</Alert>
        {!data ? (
          !error && <Spinner />
        ) : tab === 'overview' ? (
          <Overview data={data} goTo={setTab} />
        ) : tab === 'tasks' ? (
          <TasksPanel data={data} reload={reload} />
        ) : (
          <InternsPanel data={data} reload={reload} />
        )}
      </main>

      <Modal open={showPassword} title="Change password" onClose={() => setShowPassword(false)}>
        <ChangePassword path="/admin/password" onDone={() => setShowPassword(false)} />
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------ Overview
function Overview({ data, goTo }) {
  const { stats, tasks } = data;
  const cards = [
    { label: 'Interns', value: stats.interns, icon: Users, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Total tasks', value: stats.tasks, icon: ClipboardList, tone: 'text-sky-600 bg-sky-50' },
    { label: 'Completed', value: stats.byStatus.Completed || 0, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
  ];
  const toReview = tasks.filter((t) => t.status === 'Submitted');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card p-5">
            <div className={`inline-flex rounded-lg p-2 ${tone}`}><Icon className="h-5 w-5" /></div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900">Tasks by status</h2>
        <div className="mt-4 space-y-3">
          {STATUSES.map((s) => {
            const n = stats.byStatus[s] || 0;
            const pct = stats.tasks ? Math.round((n / stats.tasks) * 100) : 0;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="w-28 shrink-0"><StatusBadge status={s} /></div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-8 text-right text-sm tabular-nums text-slate-600">{n}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Waiting for your review</h2>
          <button type="button" className="text-sm font-medium text-indigo-700 hover:underline" onClick={() => goTo('tasks')}>
            All tasks
          </button>
        </div>
        {toReview.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing to review">Submitted tasks will appear here.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {toReview.map((t) => (
              <li key={t._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800">{t.title}</div>
                  <div className="text-sm text-slate-500">{t.internInfo?.fullName || 'Unknown intern'}</div>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Tasks
function TasksPanel({ data, reload }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [intern, setIntern] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.tasks.filter((t) =>
      (!status || t.status === status) &&
      (!intern || t.intern === intern) &&
      (!q || t.title.toLowerCase().includes(q) || t.internInfo?.fullName?.toLowerCase().includes(q))
    );
  }, [data.tasks, query, status, intern]);

  const open = data.tasks.find((t) => t._id === openId);

  return (
    <div className="card">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search tasks or interns" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tasks" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <select className="input lg:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input lg:w-48" value={intern} onChange={(e) => setIntern(e.target.value)} aria-label="Filter by intern">
            <option value="">All interns</option>
            {data.interns.map((i) => <option key={i._id} value={i._id}>{i.fullName}</option>)}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)} disabled={!data.interns.length}>
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title={data.tasks.length ? 'No tasks match your filters' : 'No tasks yet'}>
          {data.interns.length ? 'Create a task and assign it to an intern.' : 'Tasks can be assigned once an intern has registered.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((t) => (
            <li key={t._id}>
              <button type="button" onClick={() => setOpenId(t._id)} className="flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{t.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                    <span>{t.internInfo?.fullName || 'Unknown intern'}</span>
                    <span className={`inline-flex items-center gap-1 ${isOverdue(t) ? 'font-medium text-rose-600' : ''}`}>
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(t.deadline)}{isOverdue(t) && ' · overdue'}
                    </span>
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={creating} title="New task" onClose={() => setCreating(false)}>
        <CreateTask interns={data.interns} onDone={() => { setCreating(false); reload(); }} />
      </Modal>
      <Modal open={!!open} title="Task details" wide onClose={() => setOpenId(null)}>
        {open && <TaskDetail key={open._id} task={open} interns={data.interns} reload={reload} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  );
}

function CreateTask({ interns, onDone }) {
  const { request } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', deadline: '', intern: interns[0]?._id || '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    files.forEach((f) => body.append('images', f));
    try {
      await request('/admin/tasks', { method: 'POST', body });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{error}</Alert>
      <Field label="Title" id="t-title" required value={form.title} onChange={set('title')} />
      <Field label="Description" id="t-desc" rows={4} value={form.description} onChange={set('description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="t-intern" className="label">Assign to</label>
          <select id="t-intern" className="input" required value={form.intern} onChange={set('intern')}>
            {interns.map((i) => <option key={i._id} value={i._id}>{i.fullName}</option>)}
          </select>
        </div>
        <Field label="Deadline" id="t-deadline" type="date" value={form.deadline} onChange={set('deadline')} />
      </div>
      <FilePicker id="t-files" label="Reference files (optional)" files={files} setFiles={setFiles} />
      <div className="flex justify-end">
        <SubmitButton busy={busy} className="btn-primary">Create task</SubmitButton>
      </div>
    </form>
  );
}

function TaskDetail({ task, interns, reload, onClose }) {
  const { request } = useAuth();
  const [form, setForm] = useState({
    title: task.title, description: task.description || '', deadline: task.deadline || '', intern: task.intern, status: task.status,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(patch) {
    setBusy(true);
    setError('');
    try {
      await request(`/admin/tasks/${task._id}`, { method: 'PUT', body: patch });
      await reload();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${task.title}”? This also deletes any submitted files.`)) return;
    setBusy(true);
    try {
      await request(`/admin/tasks/${task._id}`, { method: 'DELETE' });
      await reload();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const hasSubmission = task.submissionNote || task.documents?.length;

  return (
    <div className="space-y-5">
      <Alert>{error}</Alert>

      <section className="rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Intern submission</h3>
          {task.submittedAt && <span className="text-xs text-slate-500">Submitted {formatDate(task.submittedAt)}</span>}
        </div>
        {hasSubmission ? (
          <div className="mt-2 space-y-3">
            {task.submissionNote && <p className="whitespace-pre-wrap text-sm text-slate-700">{task.submissionNote}</p>}
            <FileList files={task.documents} />
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Nothing submitted yet.</p>
        )}
        {task.status === 'Submitted' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy} onClick={() => save({ status: 'Completed' })}>
              <CheckCircle2 className="h-4 w-4" /> Approve &amp; complete
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => save({ status: 'In Progress' })}>
              Send back for changes
            </button>
          </div>
        )}
      </section>

      <form onSubmit={(e) => { e.preventDefault(); save(form); }} className="space-y-4">
        <Field label="Title" id="d-title" required value={form.title} onChange={set('title')} />
        <Field label="Description" id="d-desc" rows={4} value={form.description} onChange={set('description')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="d-intern" className="label">Assigned to</label>
            <select id="d-intern" className="input" value={form.intern} onChange={set('intern')}>
              {interns.map((i) => <option key={i._id} value={i._id}>{i.fullName}</option>)}
            </select>
          </div>
          <Field label="Deadline" id="d-deadline" type="date" value={form.deadline} onChange={set('deadline')} />
          <div>
            <label htmlFor="d-status" className="label">Status</label>
            <select id="d-status" className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {task.images?.length > 0 && (
          <div>
            <div className="label">Reference files</div>
            <FileList files={task.images} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
          <button type="button" className="btn-ghost text-rose-600 hover:bg-rose-50" onClick={remove} disabled={busy}>
            <Trash2 className="h-4 w-4" /> Delete task
          </button>
          <SubmitButton busy={busy} className="btn-primary">Save changes</SubmitButton>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ Interns
function InternsPanel({ data, reload }) {
  const { request } = useAuth();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const q = query.trim().toLowerCase();
  const list = data.interns.filter((i) =>
    !q || [i.fullName, i.email, i.college, i.department].some((v) => v?.toLowerCase().includes(q))
  );
  const open = data.interns.find((i) => i._id === openId);
  const openTasks = open ? data.tasks.filter((t) => t.intern === open._id) : [];

  async function remove(intern) {
    if (!window.confirm(`Delete ${intern.fullName}? Their ${intern.taskCount} task(s) and files will also be deleted.`)) return;
    try {
      await request(`/admin/interns/${intern._id}`, { method: 'DELETE' });
      setOpenId(null);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <div className="border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, email, college or department" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search interns" />
        </div>
      </div>
      {error && <div className="p-4"><Alert>{error}</Alert></div>}
      {list.length === 0 ? (
        <EmptyState icon={Users} title={data.interns.length ? 'No interns match your search' : 'No interns yet'}>
          {!data.interns.length && 'Interns appear here after they register from the home page.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((i) => (
            <li key={i._id}>
              <button type="button" onClick={() => setOpenId(i._id)} className="flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left hover:bg-slate-50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                  {i.fullName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{i.fullName}</div>
                  <div className="truncate text-sm text-slate-500">{i.email}</div>
                </div>
                <div className="hidden text-right text-sm sm:block">
                  <div className="text-slate-700">{i.college || '—'}</div>
                  <div className="text-slate-500">{i.department || ''}</div>
                </div>
                <div className="w-20 text-right text-sm tabular-nums text-slate-600">
                  {i.completedCount}/{i.taskCount} done
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!open} title={open?.fullName || ''} wide onClose={() => setOpenId(null)}>
        {open && (
          <div className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[['Email', open.email], ['Phone', open.phone], ['College', open.college], ['Department', open.department], ['Joined', formatDate(open.createdAt)]].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="break-words font-medium text-slate-800">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Tasks ({openTasks.length})</h3>
              {openTasks.length === 0 ? (
                <p className="text-sm text-slate-500">No tasks assigned yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {openTasks.map((t) => (
                    <li key={t._id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="truncate">{t.title}</span>
                      <StatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-200 pt-4">
              <button type="button" className="btn-ghost text-rose-600 hover:bg-rose-50" onClick={() => remove(open)}>
                <Trash2 className="h-4 w-4" /> Delete intern
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
