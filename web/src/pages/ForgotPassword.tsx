import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: supaErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-password`,
      });
      if (supaErr) throw supaErr;
      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'Could not send reset email');
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <div className="center-screen">
        <div className="card auth-card" data-testid="forgot-password-sent">
          <div className="brand">Check your inbox</div>
          <div className="subtitle">
            If an account exists for <strong>{email}</strong>, we sent a link to reset your
            password. It expires shortly, so use it soon.
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
      <div className="card auth-card" data-testid="forgot-password-card">
        <div className="brand">Reset your password</div>
        <div className="subtitle">Enter your email and we'll send you a reset link.</div>

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="forgot-password-email"
            placeholder="you@example.com"
          />

          {error && <div className="err" data-testid="forgot-password-error">{error}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }} data-testid="forgot-password-submit">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
