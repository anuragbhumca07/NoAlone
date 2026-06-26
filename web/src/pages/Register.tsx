import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.registerEmail(email, password);
      // Pass password through so Verify can call /auth/email/recover-code if
      // the email never arrives.
      navigate('/verify', { state: { email, password } });
    } catch (e: any) {
      setError(e?.message || 'Registration failed');
    } finally { setBusy(false); }
  };

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

          {error && <div className="err" data-testid="register-error">{error}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }} data-testid="register-submit">
            {busy ? 'Sending code…' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
