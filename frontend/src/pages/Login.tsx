import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { errorMessage } from '../lib/useAsync';
import PasswordInput from '../components/PasswordInput';
import type { CSSProperties, FormEvent } from 'react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === 'ADMIN' && from === '/' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="wrap auth-shell">
      <div className="center" style={{ marginBottom: 26 }}>
        <span className="eyebrow">Welcome back</span>
        <h1 style={{ fontSize: '2rem', marginTop: 6 }}>Sign in</h1>
      </div>

      <form className="card card-pad stack" style={{ '--gap': '16px' } as CSSProperties} onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}

        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />
        </label>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn btn-lg btn-block" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Sign in'}
        </button>
      </form>

      <p className="center small muted" style={{ marginTop: 20 }}>
        New here?{' '}
        <Link to="/register" className="link-underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
