import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { errorMessage } from '../lib/useAsync';
import PasswordInput from '../components/PasswordInput';
import type { Role } from '../lib/types';
import type { CSSProperties, FormEvent } from 'react';

/**
 * Where to send someone after signing in.
 *
 * A page they explicitly asked for wins, so a guard that interrupted them
 * hands them back. The exception is an admin bounced off a customer account
 * page: that redirect usually comes from an expired session behind the header's
 * account link, not from any intent to read their own order history, and
 * landing there instead of the dashboard reads as a broken login.
 */
function landingFor(role: Role, requested: string | null): string {
  const home = role === 'ADMIN' ? '/admin' : '/';
  if (!requested || requested === '/') return home;
  if (role === 'ADMIN' && requested.startsWith('/account')) return '/admin';
  return requested;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Only set when a guard bounced the user off a page they asked for.
  const requested = (location.state as { from?: string } | null)?.from ?? null;

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
      navigate(landingFor(user.role, requested), { replace: true });
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
