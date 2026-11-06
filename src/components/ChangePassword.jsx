import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { Alert, Field, SubmitButton } from './ui.jsx';

export default function ChangePassword({ path, onDone }) {
  const { request } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) return setError('New passwords do not match');
    setBusy(true);
    try {
      await request(path, { method: 'PUT', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      setDone(true);
      setTimeout(onDone, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{error}</Alert>
      <Alert kind="success">{done && 'Password updated.'}</Alert>
      <Field label="Current password" id="cp-current" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={set('currentPassword')} />
      <Field label="New password" id="cp-new" type="password" autoComplete="new-password" required minLength={8} value={form.newPassword} onChange={set('newPassword')} hint="At least 8 characters." />
      <Field label="Confirm new password" id="cp-confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
      <div className="flex justify-end">
        <SubmitButton busy={busy} className="btn-primary">Update password</SubmitButton>
      </div>
    </form>
  );
}
