import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { auth } from '../store';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.loginEmail(email, password);
      auth.setSession(res.token, res.user);
      navigate('/chats');
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 400 && /verify/i.test(e.message)) {
        navigate('/verify', { state: { email } });
        return;
      }
      setError(e?.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const startGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google sign-in not configured. Set VITE_GOOGLE_CLIENT_ID in web/.env');
      return;
    }
    const redirectUri = `${location.origin}/oauth/google`;
    const scope = encodeURIComponent(
      'openid email profile https://www.googleapis.com/auth/calendar.events'
    );
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&include_granted_scopes=true&state=signin`;
    location.href = url;
  };

  return (
    <div className="center-screen">
      <div className="card auth-card" data-testid="login-card">
        <div className="brand">noAlone</div>
        <div className="subtitle">Welcome back. Sign in to keep talking.</div>

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="login-email"
            placeholder="you@example.com"
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="login-password"
            placeholder="••••••••"
          />

          {error && <div className="err" data-testid="login-error">{error}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }} data-testid="login-submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className="ghost"
          onClick={startGoogle}
          style={{ width: '100%', marginTop: 12 }}
          data-testid="login-google"
        >
          Continue with Google
        </button>

        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
          New to noAlone? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
