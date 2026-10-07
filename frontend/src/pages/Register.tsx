import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { errorMessage } from '../lib/useAsync';
import type { CSSProperties, FormEvent } from 'react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = form.password.length > 0 && form.password.length < 8;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="wrap auth-shell">
      <div className="center" style={{ marginBottom: 26 }}>
        <span className="eyebrow">Join us</span>
        <h1 style={{ fontSize: '2rem', marginTop: 6 }}>Create account</h1>
      </div>

      <form className="card card-pad stack" style={{ '--gap': '16px' } as CSSProperties} onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}

        <label className="field">
          <span className="label">Full name</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
            maxLength={80}
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span className="label">Password</span>
          <input
            className={`input${tooShort ? ' field-error' : ''}`}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            required
          />
          <span className={`hint${tooShort ? ' hint-error' : ''}`}>
            At least 8 characters.
          </span>
        </label>

        <button className="btn btn-lg btn-block" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Create account'}
        </button>
      </form>

      <p className="center small muted" style={{ marginTop: 20 }}>
        Already have an account?{' '}
        <Link to="/login" className="link-underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
