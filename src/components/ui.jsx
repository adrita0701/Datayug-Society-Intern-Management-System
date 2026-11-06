/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileText, Loader2, LogOut, Paperclip, X } from 'lucide-react';
import { fileUrl } from '../api.js';

export const STATUSES = ['Pending', 'In Progress', 'Submitted', 'Completed'];

export const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  'In Progress': 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Submitted: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}images/logo.svg`} alt="" className="h-9 w-9" />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-semibold text-slate-900">Datayug Society</span>
          <span className="block text-xs text-slate-500">Internship Portal</span>
        </span>
      )}
    </Link>
  );
}

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, id, hint, ...props }) {
  const Comp = props.rows ? 'textarea' : 'input';
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <Comp id={id} className="input" {...props} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const error = kind === 'error';
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

export function SubmitButton({ busy, children, className = 'btn-primary w-full' }) {
  return (
    <button type="submit" className={className} disabled={busy}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-500/20'}`}>
      {status}
    </span>
  );
}

export function EmptyState({ icon: Icon = FileText, title, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/40`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button type="button" onClick={onClose} className="btn-ghost -m-2 p-2" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function TopBar({ name, roleLabel, onLogout, children }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          {children}
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-slate-800">{name}</div>
            <div className="text-xs text-slate-500">{roleLabel}</div>
          </div>
          <button type="button" onClick={onLogout} className="btn-secondary px-3" title="Log out">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`btn flex-1 whitespace-nowrap px-3 ${value === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {label}
        </button>
      ))}
    </div>
  );
}

const fmtSize = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function FileList({ files, onRemove }) {
  if (!files?.length) return null;
  return (
    <ul className="space-y-1.5">
      {files.map((f) => (
        <li key={f._id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {f.mime?.startsWith('image/') ? (
            <img src={fileUrl(f._id)} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <a href={fileUrl(f._id)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-indigo-700 hover:underline">
            {f.name}
          </a>
          <span className="shrink-0 text-xs text-slate-400">{fmtSize(f.size)}</span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(f)} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${f.name}`}>
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function FilePicker({ id, label, files, setFiles, accept, max = 5 }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => {
          setFiles([...files, ...e.target.files].slice(0, max));
          e.target.value = '';
        }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
      />
      <p className="mt-1 text-xs text-slate-500">Up to {max} files, 5 MB each.</p>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${f.name}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isOverdue(task) {
  if (!task.deadline || task.status === 'Completed') return false;
  return task.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10);
}
