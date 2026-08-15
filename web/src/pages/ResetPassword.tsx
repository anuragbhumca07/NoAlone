import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

/**
 * Landing page for Supabase's password-recovery email link. Like the OAuth
 * callback, this is a PKCE `?code=` exchange by default in supabase-js v2.
 * Once we have a session, show a form to set the new password.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const query = new URLSearchParams(location.search);
        const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
        const linkErr = query.get('error_description') || hash.get('error_description');
        if (linkErr) throw new Error(linkErr);

        const code = query.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          let { data } = await supabase.auth.getSession();
          if (!data.session) {
            await new Promise((r) => setTimeout(r, 400));
            ({ data } = await supabase.auth.getSession());
          }
          if (!data.session) throw new Error('This reset link is invalid or has expired.');
        }

        if (!cancelled) setReady(true);
      } catch (e: any) {
        if (!cancelled) setLinkError(e?.message || 'This reset link is invalid or has expired.');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (e: any) {
      setFormError(e?.message || 'Could not update password');
    } finally { setBusy(false); }
  };

  if (linkError) {
    return (
      <div className="center-screen">
        <div className="card auth-card" data-testid="reset-password-link-error">
          <div className="brand">Link expired</div>
          <div className="err" style={{ marginTop: 8 }}>{linkError}</div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="card auth-card" data-testid="reset-password-loading">
          <div>Verifying your reset link…</div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="center-screen">
        <div className="card auth-card" data-testid="reset-password-done">
          <div className="brand">Password updated</div>
          <div className="ok" style={{ marginTop: 8 }}>Redirecting you to sign in…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <div className="card auth-card" data-testid="reset-password-card">
        <div className="brand">Set a new password</div>
        <div className="subtitle">Choose a new password for your account.</div>

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <label>New password <span style={{ color: 'var(--text-dim)' }}>(min 8 chars)</span></label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="reset-password-new"
          />

          <label>Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            data-testid="reset-password-confirm"
          />

          {formError && <div className="err" data-testid="reset-password-error">{formError}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }} data-testid="reset-password-submit">
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
