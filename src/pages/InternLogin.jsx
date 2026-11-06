import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, AuthShell, Field, SubmitButton } from '../components/ui.jsx';

export default function InternLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      login('intern', await api('/intern/login', { method: 'POST', body: form }));
      navigate('/intern', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Intern login"
      subtitle="See your tasks and submit your work."
      footer={<>New here? <Link to="/intern/register" className="font-medium text-indigo-700 hover:underline">Create an intern account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Email" id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <SubmitButton busy={busy}>Log in</SubmitButton>
      </form>
    </AuthShell>
  );
}
