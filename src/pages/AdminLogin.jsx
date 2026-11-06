import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, AuthShell, Field, Spinner, SubmitButton } from '../components/ui.jsx';

// Shows first-time setup when no admin exists yet, otherwise the login form.
export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [exists, setExists] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/admin/exists')
      .then((r) => setExists(r.exists))
      .catch((e) => {
        setExists(true);
        setError(e.message);
      });
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!exists && form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const res = await api(exists ? '/admin/login' : '/admin/register', {
        method: 'POST',
        body: { email: form.email, password: form.password },
      });
      login('admin', res);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (exists === null) return <AuthShell title="Admin"><Spinner /></AuthShell>;

  return (
    <AuthShell
      title={exists ? 'Admin login' : 'Set up the admin account'}
      subtitle={exists ? 'Manage interns, tasks and submissions.' : 'No admin exists yet. The account you create here will be the only admin.'}
      footer={<>Are you an intern? <Link to="/intern/login" className="font-medium text-indigo-700 hover:underline">Intern login</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Email" id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field
          label="Password"
          id="password"
          type="password"
          autoComplete={exists ? 'current-password' : 'new-password'}
          required
          minLength={exists ? undefined : 8}
          value={form.password}
          onChange={set('password')}
          hint={exists ? undefined : 'At least 8 characters.'}
        />
        {!exists && (
          <Field label="Confirm password" id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        )}
        <SubmitButton busy={busy}>{exists ? 'Log in' : 'Create admin account'}</SubmitButton>
      </form>
    </AuthShell>
  );
}
