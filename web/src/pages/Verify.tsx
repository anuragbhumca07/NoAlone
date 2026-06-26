import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { auth } from '../store';

export default function Verify() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>((state as any)?.email || '');
  const [password, setPassword] = useState<string>((state as any)?.password || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.verifyEmail(email, code);
      auth.setSession(res.token, res.user);
      navigate('/chats');
    } catch (e: any) {
      setError(e?.message || 'Verification failed');
    } finally { setBusy(false); }
  };

  const autofillCode = async () => {
    setError(null);
    setHint(null);
    const testKey = import.meta.env.VITE_TEST_API_KEY;
    if (!testKey) {
      setError('Test helper not configured.');
      return;
    }
    try {
      const res = await api.testGetCode(email, testKey);
      if (res.code) {
        setCode(res.code);
        setHint('Test code autofilled.');
      } else {
        setError('No pending code for that email.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not fetch test code');
    }
  };

  const recoverWithPassword = async () => {
    setError(null);
    setHint(null);
    if (!email || !password) {
      setError('Enter your email and the password you registered with.');
      return;
    }
    try {
      const res = await api.recoverEmailCode(email, password);
      setCode(res.code);
      setHint('Code recovered. Tap Verify and continue.');
    } catch (e: any) {
      setError(e?.message || 'Could not recover the code');
    }
  };

  return (
    <div className="center-screen">
      <div className="card auth-card" data-testid="verify-card">
        <div className="brand">Verify your email</div>
        <div className="subtitle">
          We sent a 6-digit code to <strong>{email || 'your email'}</strong>.
        </div>

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="verify-email"
          />

          <label>6-digit code</label>
          <input
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            data-testid="verify-code"
            placeholder="123456"
          />

          {error && <div className="err" data-testid="verify-error">{error}</div>}
          {hint && <div className="ok" data-testid="verify-hint">{hint}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }} data-testid="verify-submit">
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>

        {import.meta.env.VITE_TEST_API_KEY && (
          <button
            className="ghost"
            type="button"
            onClick={autofillCode}
            style={{ width: '100%', marginTop: 10 }}
            data-testid="verify-autofill"
          >
            Use test code
          </button>
        )}

        <details style={{ marginTop: 16 }}>
          <summary style={{ color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
            Didn't get the email?
          </summary>
          <div style={{ marginTop: 12 }}>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 0 }}>
              Enter the password you registered with — we'll fetch your pending
              code without needing the email to arrive.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="recover-password"
              placeholder="Your password"
            />
            <button
              type="button"
              className="ghost"
              onClick={recoverWithPassword}
              style={{ width: '100%', marginTop: 10 }}
              data-testid="recover-code"
            >
              Recover code with password
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
