import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, AuthShell, Field, SubmitButton } from '../components/ui.jsx';

const EMPTY = { fullName: '', email: '', phone: '', college: '', department: '', password: '', confirm: '' };

export default function InternRegister() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const { confirm: _confirm, ...body } = form;
      login('intern', await api('/intern/register', { method: 'POST', body }));
      navigate('/intern', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Intern registration"
      subtitle="Create your account to receive tasks."
      footer={<>Already registered? <Link to="/intern/login" className="font-medium text-indigo-700 hover:underline">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Full name" id="fullName" autoComplete="name" required value={form.fullName} onChange={set('fullName')} />
        <Field label="Email" id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field label="Phone" id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="College / University" id="college" value={form.college} onChange={set('college')} />
          <Field label="Department" id="department" value={form.department} onChange={set('department')} />
        </div>
        <Field label="Password" id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} hint="At least 8 characters." />
        <Field label="Confirm password" id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
