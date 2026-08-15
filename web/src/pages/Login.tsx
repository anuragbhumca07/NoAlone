import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { auth } from '../store';
import { supabase } from '../supabaseClient';

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
      const { data, error: supaErr } = await supabase.auth.signInWithPassword({ email, password });
      if (supaErr) throw supaErr;
      if (!data.session) throw new Error('Sign-in did not return a session');

      const res = await api.supabaseSync(data.session.access_token);
      auth.setSession(res.token, res.user);
      navigate('/chats');
    } catch (e: any) {
      const message = e instanceof ApiError ? e.message : e?.message || 'Login failed';
      setError(message);
    } finally { setBusy(false); }
  };

  const startGoogle = async () => {
    setError(null);
    const { error: supaErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/oauth/google` },
    });
    if (supaErr) setError(supaErr.message);
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

          <div className="spread">
            <label style={{ margin: '12px 0 6px' }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: 13 }} data-testid="login-forgot-password">
              Forgot password?
            </Link>
          </div>
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
