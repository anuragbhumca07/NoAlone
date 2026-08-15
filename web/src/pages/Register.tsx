import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { auth } from '../store';
import { supabase } from '../supabaseClient';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { data, error: supaErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/login` },
      });
      if (supaErr) throw supaErr;

      if (data.session) {
        // Email confirmation is off for this project — session is ready immediately.
        const res = await api.supabaseSync(data.session.access_token);
        auth.setSession(res.token, res.user);
        navigate('/chats');
        return;
      }

      // Email confirmation required — Supabase sent a confirmation link.
      setCheckEmail(true);
    } catch (e: any) {
      const message = e instanceof ApiError ? e.message : e?.message || 'Registration failed';
      setError(message);
    } finally { setBusy(false); }
  };

  if (checkEmail) {
    return (
      <div className="center-screen">
        <div className="card auth-card" data-testid="register-check-email">
          <div className="brand">Check your inbox</div>
          <div className="subtitle">
            We sent a confirmation link to <strong>{email}</strong>. Click it, then come back
            and sign in.
          </div>
          <Link to="/login">
            <button style={{ width: '100%', marginTop: 20 }}>Back to sign in</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <div className="card auth-card" data-testid="register-card">
        <div className="brand">noAlone</div>
        <div className="subtitle">Create your account in seconds.</div>

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="register-email"
          />

          <label>Password <span style={{ color: 'var(--text-dim)' }}>(min 8 chars)</span></label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="register-password"
          />

          <label>Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            data-testid="register-confirm-password"
          />

          {error && <div className="err" data-testid="register-error">{error}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }} data-testid="register-submit">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
